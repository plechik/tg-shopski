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
    const handleMainButtonClick = () => {
      // Вместо чтения текста кнопки, мы вызываем функцию оформления заказа,
      // а всю актуальную информацию она возьмет из стейта корзины!
      handleCheckout();
    };

    try {
      const unsubscribe = mainButton.onClick(handleMainButtonClick);
      return () => unsubscribe(); 
    } catch (e) {}
  }, [cart]);

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
          backgroundColor: '#3b82f6', 
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
  const handleCheckout = async () => {
    // Считаем чистую сумму прямо из массива корзины (гарантирует тип Number)
    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

    if (cart.length === 0) return;

    try {
      const response = await fetch('https://zolikstore.loca.lt/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          items: cart, 
          total: totalAmount // Передаем чистый int, который на 100% примет Pydantic
        })
      });
      
      if (response.ok) {
        alert('Заказ успешно отправлен на бэкенд!');
        setCart([]); // Очищаем корзину после успешной покупки
      } else {
        alert('Сервер вернул ошибку: ' + response.status);
      }
    } catch (error) {
      alert('Не удалось достучаться до бэкенда: ' + error.message);
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