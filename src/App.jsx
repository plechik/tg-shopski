import React, { useState, useEffect } from 'react';
import { mainButton, miniApp } from '@telegram-apps/sdk-react';
import { ShoppingBag, Tag, X, Plus, Minus, Info, PackagePlus } from 'lucide-react';
import './App.css';
import { Carousel, HStack, IconButton, Box } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

// БАЗОВЫЙ URL ТВОЕГО БЭКЕНДА НА RENDER
const API_BASE_URL = 'https://tg-shopski.onrender.com';
const ADMIN_TELEGRAM_ID = 1160765121;

function App() {
  const [products, setProducts] = useState([]); // Товары теперь загружаются сюда
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Состояния для админки
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', price: '', description: '', image_file: null });

  // 1. Инициализация Telegram SDK, проверка прав админа и загрузка каталога
  useEffect(() => {
    try {
      if (miniApp && typeof miniApp.mount === 'function' && !miniApp.isMounted()) {
        miniApp.mount();
      }
      if (mainButton && typeof mainButton.mount === 'function' && !mainButton.isMounted()) {
        mainButton.mount();
      }

      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        // 3. Проверяем права администратора
        const userId = tg.initDataUnsafe?.user?.id;
        if (userId && String(userId).trim() === String(ADMIN_TELEGRAM_ID).trim()) {
          setIsAdmin(true);
        }
      }
    } catch (error) {
      console.error('Ошибка инициализации Telegram Mini App:', error);
    }

    // 4. Загружаем товары из базы данных
    fetchCatalog();
      }, []);

      // Функция загрузки товаров из PostgreSQL
      const fetchCatalog = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/products`);
        if (response.ok) {
          const data = await response.json();
          
          const formattedProducts = data.map(p => {
            const imgUrl = p.images && p.images.length > 0 ? p.images[0].image_url : null;
            
            return {
              id: p.id,
              name: p.name,
              brand: p.brand,
              price: Number(p.price),
              description: p.description,
              image: imgUrl || 'https://placehold.co/300x300?text=No+Image'
            };
          });
          
          setProducts(formattedProducts);
        }
      } catch (error) {
        console.error('Ошибка загрузки каталога:', error);
      } finally {
        setIsLoading(false);
      }
    };

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
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
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

  // Функция добавления нового товара администратором
  const handleAddProductSubmit = async (e) => {
      e.preventDefault();
      if (!newProduct.name || !newProduct.price || !newProduct.brand) return;

      try {
        // Создаем объект FormData вместо отправки JSON
        const formData = new FormData();
        formData.append('name', newProduct.name);
        formData.append('brand', newProduct.brand);
        formData.append('price', newProduct.price);
        formData.append('description', newProduct.description);

        // Если файл выбран, прикрепляем его к форме
        if (newProduct.image_file) {
          formData.append('image_file', newProduct.image_file);
        }

        const response = await fetch(`${API_BASE_URL}/api/products`, {
          method: 'POST',
          // Внимание: заголовок Content-Type указывать НЕ НАДО! Браузер выставит multipart/form-data автоматически
          body: formData
        });

        if (response.ok) {
          alert('Товар успешно создан и картинка загружена в Backblaze!');
          setIsAdminModalOpen(false);
          setNewProduct({ name: '', brand: '', price: '', description: '', image_file: null });
          fetchCatalog(); // Обновляем витрину
        } else {
          alert('Ошибка при создании товара на бэкенде');
        }
      } catch (error) {
        alert('Ошибка соединения с сервером: ' + error.message);
      }
    };

  return (
    <div className="shop-container">
      <header className="shop-header">
        <h1>ZolikStore</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Если зашел админ — показываем кнопку управления товарами */}
          {isAdmin && (
            <button className="admin-open-btn" onClick={() => setIsAdminModalOpen(true)}>
              <PackagePlus size={20} />
            </button>
          )}
          <div 
            className={`cart-badge ${cart.length > 0 ? 'active' : ''}`} 
            onClick={() => cart.length > 0 && setIsCartOpen(!isCartOpen)}
          >
            <ShoppingBag size={20} />
            <span>{totalItemsCount}</span>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="loading-spinner">Загрузка каталога обуви...</div>
      ) : (
        <>
          {/* Слайдер (Carousel) верхних товаров */}
          {products.length > 0 && (
            <div className="carousel">
              <Carousel.Root slideCount={products.length} maxW="xl" mx="auto" allowMouseDrag>
                <Carousel.ItemGroup>
                  {products.map((product, index) => (
                    <Carousel.Item key={product.id} index={index}>
                      <Box w="100%" h="300px" rounded="lg" overflow="hidden" position="relative">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.src = 'https://placehold.co/600x300?text=No+Image' }} 
                        />
                        <div className='carousel-product-name'>{product.name}</div>
                      </Box>
                    </Carousel.Item>
                  ))}
                </Carousel.ItemGroup>
                <Carousel.Control justifyContent="center" gap="4">
                  <Carousel.PrevTrigger asChild>
                    <IconButton size="xs" variant="ghost" colorPalette="gray">
                      <LuChevronLeft />
                    </IconButton>
                  </Carousel.PrevTrigger>
                  <Carousel.Indicators />
                  <Carousel.NextTrigger asChild>
                    <IconButton size="xs" variant="ghost" colorPalette="gray">
                      <LuChevronRight />
                    </IconButton>
                  </Carousel.NextTrigger>
                </Carousel.Control>
              </Carousel.Root>
            </div>
          )}
          
          {/* Сетка товаров из PostgreSQL */}
          <main className="products-grid">
            {products.map((product) => {
              const cartItem = cart.find(item => item.id === product.id);
              
              return (
                <div key={product.id} className="product-card">
                  <div className="product-thumb" onClick={() => setSelectedProduct(product)}>
                    <img src={product.image} alt={product.name}/>
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
        </>
      )}

      {/* ОКНО: Подробности товара */}
      {selectedProduct && (() => {
        const modalCartItem = cart.find(item => item.id === selectedProduct.id);
        return (
          <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
            <div className="product-details-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal-btn" onClick={() => setSelectedProduct(null)}>
                <X size={24} />
              </button>
              <div className="modal-image-container">
                <img src={selectedProduct.image} alt={selectedProduct.name} onError={(e) => { e.target.src = 'https://placehold.co/300x300?text=No+Image' }} />
              </div>
              <div className="modal-info">
                <h2>{selectedProduct.name}</h2>
                <p className="modal-description">{selectedProduct.description}</p>
                <div className="modal-footer">
                  <span className="modal-price">{selectedProduct.price} ₽</span>
                  {modalCartItem ? (
                    <div className="quantity-controls" style={{ padding: '8px 16px' }}>
                      <button onClick={() => removeFromCart(selectedProduct.id)}><Minus size={18} /></button>
                      <span style={{ fontSize: '16px', minWidth: '24px' }}>{modalCartItem.quantity}</span>
                      <button onClick={() => addToCart(selectedProduct)}><Plus size={18} /></button>
                    </div>
                  ) : (
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

      {/* ОКНО КОРЗИНЫ */}
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

      {/* МАРШРУТ/МОДАЛКА АДМИНИСТРАТОРА: Добавление нового товара */}
      {isAdminModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAdminModalOpen(false)}>
          <div className="product-details-modal admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-modal-header">
              <h2>Добавить товар в базу</h2>
              <button className="close-modal-btn" onClick={() => setIsAdminModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddProductSubmit} className="admin-form">
              <input 
                type="text" 
                placeholder="Название (например: Кроссовки Zolik Air)" 
                value={newProduct.name} 
                onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                required 
              />
              <input 
                type="text" 
                placeholder="Бренд (например: Nike)" 
                value={newProduct.brand} 
                onChange={e => setNewProduct({...newProduct, brand: e.target.value})} 
                required 
              />
              <input 
                type="number" 
                placeholder="Цена в рублях" 
                value={newProduct.price} 
                onChange={e => setNewProduct({...newProduct, price: e.target.value})} 
                required 
              />
              <textarea 
                placeholder="Описание товара" 
                value={newProduct.description} 
                onChange={e => setNewProduct({...newProduct, description: e.target.value})} 
              />
              <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '-6px', paddingLeft: '4px' }}>
                Фотография товара:
              </label>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setNewProduct({...newProduct, image_file: e.target.files[0]})} 
              />
              <button type="submit" className="modal-add-btn" style={{ marginTop: '12px', width: '100%' }}>
                Сохранить в PostgreSQL
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;