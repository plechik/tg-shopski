import React, { useState, useEffect } from 'react';
import { mainButton, miniApp } from '@telegram-apps/sdk-react';
import { ShoppingBag, Tag, X, Plus, Minus, Info } from 'lucide-react';
import './App.css';

// Обновленная база данных с путями к картинкам и описанием
const CLOTHES_DATA = [
  { id: 1, name: 'Oversize Худи "Glass"', price: 4990, image: '/images/hoodie.jpg', description: 'Стильный oversize худи с эффектом Glassmorphic. Плотный хлопок, идеальная посадка.' },
  { id: 2, name: 'Футболка Dark Mode', price: 1990, image: '/images/tshirt.jpg', description: 'Минималистичная футболка для настоящих ночных кодеров. 100% супрем-хлопок.' },
  { id: 3, name: 'Джоггеры FastAPI Async', price: 3990, image: '/images/joggers.jpeg', description: 'Удобные джоггеры для асинхронного разгона. Не сковывают движения.' },
  { id: 4, name: 'Кепка Python Developer', price: 1490, image: '/images/cap.webp', description: 'Защитит твою голову от перегрева при написании сложных скриптов.' },
  { id: 5, name: 'Кроссовки "Telegram Runner"', price: 5990, image: '/images/sneakers.jpg', description: 'Лёгкие кроссовки с поддержкой стопы для быстрого деплоя.' },
  { id: 6, name: 'Рюкзак "Data Science"', price: 2990, image: '/images/backpack.jpg', description: 'Вместителен как DataFrame. Спецотсек для твоего MacBook.' },
  { id: 7, name: 'Куртка "AI Shield"', price: 6990, image: '/images/jacket.jpg', description: 'Ветрозащитная куртка с водоотталкивающим слоем. Твой щит от непогоды.' },
];

function App() {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // Для просмотра подробностей товара

  // 1. Инициализация Telegram SDK
  useEffect(() => {
    try {
      if (!miniApp.isMounted()) miniApp.mount();
      if (!mainButton.isMounted()) mainButton.mount();
      miniApp.expand();
    } catch (e) {
      console.log('Запущено вне Telegram или ошибка монтирования SDK');
    }
  }, []);

  // 2. Клик по Главной Кнопке Telegram
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

  // 3. Синхронизация состояния корзины с MainButton
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
        setIsCartOpen(false);
      }
    } catch (e) {}
  }, [cart]);

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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

  const removeFromCart = (productId) => {
    const existingItem = cart.find(item => item.id === productId);
    if (!existingItem) return;
    if (existingItem.quantity === 1) {
      setCart(cart.filter(item => item.id !== productId));
    } else {
      setCart(cart.map(item => 
        item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      ));
    }
  };

  const clearCart = () => setCart([]);

  const handleCheckout = async () => {
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (cart.length === 0) return;

    try {
      const response = await fetch('https://tg-shopski.onrender.com/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cart, 
          total: totalAmount 
        })
      });
      
      if (response.ok) {
        setCart([]);
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

      {/* Сетка товаров */}
      <main className="products-grid">
        {CLOTHES_DATA.map((product) => {
          const cartItem = cart.find(item => item.id === product.id);
          
          return (
            <div key={product.id} className="product-card">
              {/* Клик по картинке открывает подробности */}
              <div className="product-thumb" onClick={() => setSelectedProduct(product)}>
                <img src={product.image} alt={product.name} onError={(e) => { e.target.src = 'https://placehold.co/150x150?text=No+Image' }} />
                <div className="info-overlay"><Info size={16} /></div>
              </div>
              <h3 className="product-title" onClick={() => setSelectedProduct(product)}>{product.name}</h3>
              <div className="product-footer">
                <span className="product-price">{product.price} ₽</span>
                
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

      {/* МАРШРУТ/ОКНО: Подробности товара */}
      {selectedProduct && (() => {
      // Проверяем, добавлен ли этот товар в корзину, чтобы показать кнопки +/-
      const modalCartItem = cart.find(item => item.id === selectedProduct.id);

      return (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="product-details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedProduct(null)}>
              <X size={24} />
            </button>
            <div className="modal-image-container">
              <img 
                src={selectedProduct.image} 
                alt={selectedProduct.name} 
                onError={(e) => { e.target.src = 'https://placehold.co/300x300?text=No+Image' }} 
              />
            </div>
            <div className="modal-info">
              <h2>{selectedProduct.name}</h2>
              <p className="modal-description">{selectedProduct.description}</p>
              <div className="modal-footer">
                <span className="modal-price">{selectedProduct.price} ₽</span>
                
                {modalCartItem ? (
                  /* Если товар уже в корзине, показываем красивое управление количеством */
                  <div className="quantity-controls" style={{ padding: '8px 16px' }}>
                    <button onClick={() => removeFromCart(selectedProduct.id)}><Minus size={18} /></button>
                    <span style={{ fontSize: '16px', minWidth: '24px' }}>{modalCartItem.quantity}</span>
                    <button onClick={() => addToCart(selectedProduct)}><Plus size={18} /></button>
                  </div>
                ) : (
                  /* Если товара нет в корзине, показываем обычную кнопку добавления */
                  <button className="modal-add-btn" onClick={() => addToCart(selectedProduct)}>
                    Добавить в корзину
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    })()}

      {/* Окно корзины */}
      {isCartOpen && cart.length > 0 && (
        <div className="cart-modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-modal-header">
              <h2>Корзина</h2>
              <button className="close-modal-btn" onClick={() => setIsCartOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="cart-items-list">
              {cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-img">
                    <img src={item.image} alt={item.name} onError={(e) => { e.target.src = 'https://placehold.co/50x50?text=Err' }} />
                  </div>
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