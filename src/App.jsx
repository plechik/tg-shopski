import React, { useState, useEffect } from 'react';
import { mainButton, miniApp } from '@telegram-apps/sdk-react';
import { ShoppingBag, Tag } from 'lucide-react';
import './App.css';

// База данных товаров магазина одежды
const CLOTHES_DATA = [
  { id: 1, name: 'Oversize Худи "Glass"', price: 4990, image: '🧥' },
  { id: 2, name: 'Футболка Dark Mode', price: 1990, image: '👕' },
  { id: 3, name: 'Джоггеры FastAPI Async', price: 3990, image: '👖' },
  { id: 4, name: 'Кепка Python Developer', price: 1490, image: '🧢' },
];

function App() {
  const [cart, setCart] = useState([]);

  // 1. Инициализация и монтирование компонентов Telegram
  useEffect(() => {
    try {
      if (!miniApp.isMounted()) miniApp.mount();
      if (!mainButton.isMounted()) mainButton.mount();

      miniApp.expand(); // Раскрываем на весь экран
    } catch (e) {
      console.log('Запущено вне Telegram или ошибка монтирования SDK');
    }
  }, []);

  // 2. Обработка клика по Главной Кнопке Telegram (MainButton)
  // Используем отдельный useEffect, который срабатывает ОДИН раз при запуске
  useEffect(() => {
    const handleMainButtonClick = () => {
      // Так как мы не можем напрямую прочитать актуальный cart внутри статичной функции,
      // мы берем общую стоимость, которую запишем в data-атрибут или параметры кнопки
      const currentText = mainButton.text();
      // Вытаскиваем цифры стоимости из текста кнопки
      const totalAmount = currentText.replace(/\D/g, ''); 
      
      handleCheckout(totalAmount);
    };

    try {
      const unsubscribe = mainButton.onClick(handleMainButtonClick);
      return () => unsubscribe(); // Чистим за собой при анмаунте приложения
    } catch (e) {}
  }, []); // Пустой массив зависимостей — функция вешается строго ОДИН раз

  // 3. Синхронизация состояния корзины с внешним видом MainButton
  useEffect(() => {
    try {
      if (cart.length > 0) {
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        
        mainButton.setParams({
          text: `Оформить заказ: ${total} ₽`,
          isVisible: true,
          isEnabled: true,
          backgroundColor: '#3b82f6', // Красивый синий цвет под наш дизайн
          textColor: '#ffffff'
        });
      } else {
        mainButton.hide();
      }
    } catch (e) {}
  }, [cart]);

  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  const clearCart = () => {
    setCart([]);
  };

  // 4. Отправка заказа на твой Python бэкенд
  const handleCheckout = async (totalAmount) => {
    alert(`Заказ на сумму ${totalAmount} ₽ формируется!`);
    
    // Когда запустишь FastAPI бэкенд и localtunnel, просто раскомментируй этот код:
    try {
      const response = await fetch('https://zolikstore.loca.lt/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cart, 
          total: totalAmount 
        })
      });
      if (response.ok) {
        alert('Заказ успешно отправлен на сервер!');
        setCart([]); // Очищаем корзину после успешной покупки
      }
    } catch (error) {
      alert('Ошибка отправки запроса на бэкенд');
    }
  };

  return (
    <div className="shop-container">
      <header className="shop-header">
        <h1>⚡ ZolikStore</h1>
        <div className="cart-badge">
          <ShoppingBag size={20} />
          <span>{cart.length}</span>
        </div>
      </header>

      <div className="promo-banner">
        <Tag size={16} /> <span>Новая коллекция 2026 уже в наличии</span>
      </div>

      <main className="products-grid">
        {CLOTHES_DATA.map((product) => (
          <div key={product.id} className="product-card">
            <div className="product-thumb">{product.image}</div>
            <h3 className="product-title">{product.name}</h3>
            <div className="product-footer">
              <span className="product-price">{product.price} ₽</span>
              <button className="add-btn" onClick={() => addToCart(product)}>
                + Добавить
              </button>
            </div>
          </div>
        ))}
      </main>

      {cart.length > 0 && (
        <button className="clear-cart-btn" onClick={clearCart}>
          Очистить корзину
        </button>
      )}
    </div>
  );
}

export default App;