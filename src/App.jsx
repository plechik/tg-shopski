import React, { useState, useEffect } from 'react';
import { mainButton, miniApp } from '@telegram-apps/sdk-react';
import { ShoppingBag, Tag } from 'lucide-react';
import './App.css';

// Имитация базы данных товаров твоего магазина одежды
const CLOTHES_DATA = [
  { id: 1, name: 'Oversize Худи "Glass"', price: 4990, image: '🧥' },
  { id: 2, name: 'Футболка Dark Mode', price: 1990, image: '👕' },
  { id: 3, name: 'Джоггеры FastAPI Async', price: 3990, image: '👖' },
  { id: 4, name: 'Кепка Python Developer', price: 1490, image: '🧢' },
];

function App() {
  const [cart, setCart] = useState([]);

  // Раскрываем мини-апп на максимум при загрузке
  useEffect(() => {
    try {
      if (miniApp.isMounted()) {
        miniApp.expand();
      }
    } catch (e) {}
  }, []);

  // Следим за корзиной. Если она не пустая — показываем MainButton Telegram внизу
  useEffect(() => {
    try {
      const total = cart.reduce((sum, item) => sum + item.price, 0);
      
      if (cart.length > 0) {
        mainButton.setParams({
          text: `Оформить заказ: ${total} руб.`,
          isVisible: true,
          isEnabled: true,
          backgroundColor: '#3182ce',
          textColor: '#ffffff'
        });

        // Назначаем действие на клик по главной кнопке ТГ
        const unsubscribe = mainButton.onClick(() => {
          handleCheckout(total);
        });

        return () => unsubscribe();
      } else {
        mainButton.hide();
      }
    } catch (e) {
      // Игнорируем, если открыто в обычном браузере
    }
  }, [cart]);

  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  const clearCart = () => {
    setCart([]);
  };

  // Функция отправки заказа на бэкенд
  const handleCheckout = async (totalAmount) => {
    alert(`Заказ на сумму ${totalAmount} руб. формируется!`);
    // Здесь будет твой fetch-запрос к FastAPI бэкенду через localtunnel
    /*
    await fetch('https://your-backend.loca.lt/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart, total: totalAmount })
    });
    */
  };

  return (
    <div className="shop-container">
      <header className="shop-header">
        <h1>⚡ TG Wear</h1>
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
              <button className="add-btn" onClick={() => addToCart(product)}>+ Добавить</button>
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