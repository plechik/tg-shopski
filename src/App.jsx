import React, { useState, useEffect } from 'react';
import { mainButton, miniApp } from '@telegram-apps/sdk-react';
import { ShoppingBag, Tag, X, Plus, Minus } from 'lucide-react';
import './App.css';

// База данных товаров магазина одежды
const CLOTHES_DATA = [
  { id: 1, name: 'Oversize Худи "Glass"', price: 4990, image: '🧥' },
  { id: 2, name: 'Футболка Dark Mode', price: 1990, image: '👕' },
  { id: 3, name: 'Джоггеры FastAPI Async', price: 3990, image: '👖' },
  { id: 4, name: 'Кепка Python Developer', price: 1490, image: '🧢' },
  { id: 5, name: 'Кроссовки "Telegram Runner"', price: 5990, image: '👟' },
  { id: 6, name: 'Рюкзак "Data Science"', price: 2990, image: '🎒' },
  { id: 7, name: 'Куртка "AI Shield"', price: 6990, image: '🧥' },
];

function App() {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false); // Состояние видимости корзины

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
  // В массив зависимостей нужно передать cart, чтобы функция видела актуальный стейт при клике
  useEffect(() => {
    const handleMainButtonClick = () => {
      handleCheckout();
    };

    try {
      mainButton.onClick(handleMainButtonClick);
      return () => {
        mainButton.offClick(handleMainButtonClick);
      };
    } catch (e) {}
  }, [cart]);

  // 3. Синхронизация состояния корзины с внешним видом MainButton
  useEffect(() => {
    try {
      if (cart.length > 0) {
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        mainButton.setParams({
          text: `Оформить заказ: ${total} ₽`,
          isVisible: true,
          isEnabled: true,
          backgroundColor: '#3b82f6', 
          textColor: '#ffffff'
        });
      } else {
        mainButton.hide();
        setIsCartOpen(false); // Закрываем корзину, если она опустела
      }
    } catch (e) {}
  }, [cart]);

  // Общее количество товаров в корзине для бейджика
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Добавление товара (или увеличение количества)
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  // Удаление товара (уменьшение количества или полное удаление)
  const removeFromCart = (productId) => {
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem.quantity === 1) {
      setCart(cart.filter(item => item.id !== productId));
    } else {
      setCart(cart.map(item => 
        item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      ));
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  // 4. Отправка заказа на твой Python бэкенд
  const handleCheckout = async () => {
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (cart.length === 0) return;

    try {
      const response = await fetch('https://zolikstore.loca.lt/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          items: cart, // Теперь улетает красивый массив объектов с полем quantity
          total: totalAmount 
        })
      });
      
      if (response.ok) {
        setCart([]); // Очищаем корзину после успешной покупки
        alert('Заказ успешно отправлен!');
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
        {/* Клик по бейджику теперь открывает/закрывает корзину */}
        <div 
          className={`cart-badge ${cart.length > 0 ? 'active' : ''}`} 
          onClick={() => cart.length > 0 && setIsCartOpen(!isCartOpen)}
        >
          <ShoppingBag size={20} />
          <span>{totalItemsCount}</span>
        </div>
      </header>

      <div className="promo-banner">
        <Tag size={16} /> <span>Егорка_комутатор лучший репер</span>
      </div>

      <main className="products-grid">
        {CLOTHES_DATA.map((product) => {
          // Ищем, добавлен ли уже этот товар в корзину
          const cartItem = cart.find(item => item.id === product.id);
          
          return (
            <div key={product.id} className="product-card">
              <div className="product-thumb">{product.image}</div>
              <h3 className="product-title">{product.name}</h3>
              <div className="product-footer">
                <span className="product-price">{product.price} ₽</span>
                
                {/* Если товар уже в корзине, показываем кнопки +/- прямо в карточке */}
                {cartItem ? (
                  <div className="quantity-controls">
                    <button onClick={() => removeFromCart(product.id)}><Minus size={14} /></button>
                    <span>{cartItem.quantity}</span>
                    <button onClick={() => addToCart(product)}><Plus size={14} /></button>
                  </div>
                ) : (
                  <button className="add-btn" onClick={() => addToCart(product)}>
                    + Добавить
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* Выезжающее / всплывающее окно корзины */}
      {isCartOpen && cart.length > 0 && (
        <div className="cart-modal-overlay">
          <div className="cart-modal">
            <div className="cart-modal-header">
              <h2>Корзина</h2>
              <button className="close-modal-btn" onClick={() => setIsCartOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="cart-items-list">
              {cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <span className="cart-item-emoji">{item.image}</span>
                  <div className="cart-item-info">
                    <h4>{item.name}</h4>
                    <p>{item.price * item.quantity} ₽</p>
                  </div>
                  <div className="quantity-controls">
                    <button onClick={() => removeFromCart(item.id)}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => addToCart(item)}><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            <button className="clear-cart-btn-modal" onClick={clearCart}>
              Очистить всё
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;