import React, { useState, useEffect } from 'react';
import { miniApp } from '@telegram-apps/sdk-react';
import { ShoppingBag, X, Plus, Minus, Info, PackagePlus, Search, Check, ChevronLeft, CreditCard, Truck, User, Phone, MapPin } from 'lucide-react';
import './App.css';
import { Carousel, IconButton, Box } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

const API_BASE_URL = 'https://tg-shopski.onrender.com';
const ADMIN_TELEGRAM_ID = 1160765121;

function App() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Все');
  
  // Состояния для стадий оформления заказа
  const [isCheckoutStage, setIsCheckoutStage] = useState(false);
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Данные формы заказа
  const [orderForm, setOrderForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    deliveryMethod: 'cdek', // cdek | pickup
    comment: ''
  });
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', price: '', description: '', image_file: null });

  useEffect(() => {
    try {
      if (miniApp && typeof miniApp.mount === 'function' && !miniApp.isMounted()) {
        miniApp.mount();
      }

      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        // Подтягиваем имя пользователя из Telegram, если оно доступно
        const user = tg.initDataUnsafe?.user;
        if (user) {
          const guessedName = [user.first_name, user.last_name].filter(Boolean).join(' ');
          setOrderForm(prev => ({
            ...prev,
            fullName: guessedName
          }));

          if (String(user.id).trim() === String(ADMIN_TELEGRAM_ID).trim()) {
            setIsAdmin(true);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка инициализации Telegram Mini App:', error);
    }

    fetchCatalog();
  }, []);

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
            brand: p.brand || 'Premium',
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

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
      const updatedCart = cart.filter(item => item.id !== productId);
      setCart(updatedCart);
      if (updatedCart.length === 0) {
        setIsCartOpen(false);
        setIsCheckoutStage(false);
      }
    } else {
      setCart(cart.map(item => 
        item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      ));
    }
  };

  const clearCart = () => {
    setCart([]);
    setIsCartOpen(false);
    setIsCheckoutStage(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setOrderForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    try {
      setIsSubmittingOrder(true);
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cart, 
          total: totalAmount,
          customer_details: orderForm
        })
      });
      
      if (response.ok) {
        setCart([]);
        setIsOrderSuccess(true);
      } else {
        alert('Сервер вернул ошибку: ' + response.status);
      }
    } catch (error) {
      alert('Не удалось отправить заказ: ' + error.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.brand) return;

    try {
      const formData = new FormData();
      formData.append('name', newProduct.name);
      formData.append('brand', newProduct.brand);
      formData.append('price', newProduct.price);
      formData.append('description', newProduct.description);

      if (newProduct.image_file) {
        formData.append('image_file', newProduct.image_file);
      }

      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        alert('Товар успешно создан!');
        setIsAdminModalOpen(false);
        setNewProduct({ name: '', brand: '', price: '', description: '', image_file: null });
        fetchCatalog();
      } else {
        alert('Ошибка при создании товара на бэкенде');
      }
    } catch (error) {
      alert('Ошибка соединения с сервером: ' + error.message);
    }
  };

  const uniqueBrands = ['Все', ...new Set(products.map(p => p.brand).filter(Boolean))];

  const filteredProducts = products.filter(product => {
    const matchesBrand = selectedBrand === 'Все' || product.brand === selectedBrand;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesBrand && matchesSearch;
  });

  // ЭКРАН 1: Успешное завершение заказа
  if (isOrderSuccess) {
    return (
      <div className="shop-container success-screen">
        <div className="success-card">
          <div className="success-icon-animated">
            <Check size={48} />
          </div>
          <h2>Заказ принят!</h2>
          <p className="success-message">Менеджер уже обрабатывает вашу заявку. В ближайшее время мы свяжемся с вами в Telegram для подтверждения деталей.</p>
          <div className="order-summary-box">
            <span>Сумма к оплате:</span>
            <strong>{totalAmount.toLocaleString()} ₽</strong>
          </div>
          <button 
            className="back-to-shop-btn" 
            onClick={() => {
              setIsOrderSuccess(false);
              setIsCheckoutStage(false);
            }}
          >
            Вернуться в магазин
          </button>
        </div>
      </div>
    );
  }

  // ЭКРАН 2: Полноценная страница оформления заказа
  if (isCheckoutStage) {
    return (
      <div className="shop-container checkout-page">
        <header className="checkout-header">
          <button className="back-btn" onClick={() => setIsCheckoutStage(false)}>
            <ChevronLeft size={24} />
          </button>
          <h2>Оформление заказа</h2>
          <div style={{ width: 24 }}></div>
        </header>

        <div className="checkout-scroll-content">
          {/* Краткий список товаров в заказе */}
          <section className="checkout-section">
            <h3 className="section-title">Ваш заказ ({totalItemsCount})</h3>
            <div className="checkout-items-mini">
              {cart.map(item => (
                <div key={item.id} className="mini-item">
                  <img src={item.image} alt={item.name} />
                  <div className="mini-item-details">
                    <h4>{item.name}</h4>
                    <span className="mini-item-meta">{item.brand} • {item.quantity} шт.</span>
                  </div>
                  <span className="mini-item-price">{(item.price * item.quantity).toLocaleString()} ₽</span>
                </div>
              ))}
            </div>
          </section>

          {/* Форма с контактными данными */}
          <form id="checkout-main-form" onSubmit={handleCheckoutSubmit} className="checkout-form">
            <section className="checkout-section">
              <h3 className="section-title">Контактные данные</h3>
              
              <div className="checkout-input-field">
                <User size={18} className="input-field-icon" />
                <input 
                  type="text" 
                  name="fullName" 
                  placeholder="Имя и Фамилия" 
                  value={orderForm.fullName}
                  onChange={handleFormChange}
                  required 
                />
              </div>

              <div className="checkout-input-field">
                <Phone size={18} className="input-field-icon" />
                <input 
                  type="tel" 
                  name="phone" 
                  placeholder="Номер телефона" 
                  value={orderForm.phone}
                  onChange={handleFormChange}
                  required 
                />
              </div>
            </section>

            <section className="checkout-section">
              <h3 className="section-title">Способ доставки</h3>
              <div className="delivery-selector">
                <div 
                  className={`delivery-option ${orderForm.deliveryMethod === 'cdek' ? 'active' : ''}`}
                  onClick={() => setOrderForm(prev => ({ ...prev, deliveryMethod: 'cdek' }))}
                >
                  <Truck size={20} />
                  <div className="option-info">
                    <h4>СДЭК / Почта</h4>
                    <p>До отделения или курьером</p>
                  </div>
                  <div className="radio-dot"></div>
                </div>

                <div 
                  className={`delivery-option ${orderForm.deliveryMethod === 'pickup' ? 'active' : ''}`}
                  onClick={() => setOrderForm(prev => ({ ...prev, deliveryMethod: 'pickup' }))}
                >
                  <MapPin size={20} />
                  <div className="option-info">
                    <h4>Самовывоз</h4>
                    <p>Из нашего шоурума</p>
                  </div>
                  <div className="radio-dot"></div>
                </div>
              </div>

              {orderForm.deliveryMethod === 'cdek' && (
                <div className="checkout-input-field mt-3">
                  <MapPin size={18} className="input-field-icon" />
                  <input 
                    type="text" 
                    name="address" 
                    placeholder="Город, адрес или пункт выдачи" 
                    value={orderForm.address}
                    onChange={handleFormChange}
                    required 
                  />
                </div>
              )}
            </section>

            <section className="checkout-section">
              <h3 className="section-title">Комментарий к заказу</h3>
              <textarea 
                name="comment" 
                rows="2" 
                placeholder="Укажите нужный размер обуви или важные примечания..."
                value={orderForm.comment}
                onChange={handleFormChange}
                className="checkout-textarea"
              />
            </section>
          </form>
        </div>

        {/* Фиксированная нижняя панель подтверждения */}
        <div className="checkout-sticky-bottom">
          <div className="total-row">
            <span>Итого к оплате:</span>
            <span className="total-price">{totalAmount.toLocaleString()} ₽</span>
          </div>
          <button 
            type="submit" 
            form="checkout-main-form" 
            className="confirm-order-btn"
            disabled={isSubmittingOrder}
          >
            {isSubmittingOrder ? 'Отправка заказа...' : 'Подтвердить заказ'}
          </button>
        </div>
      </div>
    );
  }

  // ЭКРАН 3: Основная витрина магазина
  return (
    <div className="shop-container">
      <header className="shop-header">
        <div className="logo-section">
          <h1>ZolikStore</h1>
        </div>
        <div className="header-actions">
          {isAdmin && (
            <button className="admin-open-btn" onClick={() => setIsAdminModalOpen(true)} title="Добавить товар">
              <PackagePlus size={20} />
            </button>
          )}
          <div 
            className={`cart-badge ${cart.length > 0 ? 'active' : ''}`} 
            onClick={() => cart.length > 0 && setIsCartOpen(!isCartOpen)}
          >
            <ShoppingBag size={20} />
            {totalItemsCount > 0 && <span className="badge-count">{totalItemsCount}</span>}
          </div>
        </div>
      </header>

      {/* Поисковая панель */}
      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input 
          type="text" 
          placeholder="Поиск кроссовок или бренда..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && <X size={18} className="clear-search" onClick={() => setSearchQuery('')} />}
      </div>

      {/* Горизонтальный выбор брендов */}
      <div className="brands-filter">
        {uniqueBrands.map(brand => (
          <button 
            key={brand} 
            className={`brand-pill ${selectedBrand === brand ? 'active' : ''}`}
            onClick={() => setSelectedBrand(brand)}
          >
            {brand}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Загрузка свежих дропов...</p>
        </div>
      ) : (
        <>
          {/* Слайдер новинок */}
          {products.length > 0 && selectedBrand === 'Все' && !searchQuery && (
            <div className="carousel-container">
              <h2 className="block-title">Новинки</h2>
              <Carousel.Root slideCount={products.slice(0, 5).length} maxW="xl" mx="auto" allowMouseDrag>
                <Carousel.ItemGroup>
                  {products.slice(0, 8).map((product, index) => (
                    <Carousel.Item key={`slide-${product.id}`} index={index}>
                      <Box w="100%" h="220px" rounded="20px" overflow="hidden" position="relative" className="slide-card" onClick={() => setSelectedProduct(product)}>
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.src = 'https://placehold.co/600x300?text=No+Image' }} 
                        />
                        <div className='carousel-overlay'>
                          <span className="slide-brand">{product.brand}</span>
                          <div className='carousel-product-name'>{product.name}</div>
                          <div className='carousel-product-price'>{product.price.toLocaleString()} ₽</div>
                        </div>
                      </Box>
                    </Carousel.Item>
                  ))}
                </Carousel.ItemGroup>
                <Carousel.Control justifyContent="center" gap="4" mt="3">
                  <Carousel.PrevTrigger asChild>
                    <IconButton size="xs" variant="subtle" className="nav-trigger">
                      <LuChevronLeft />
                    </IconButton>
                  </Carousel.PrevTrigger>
                  <Carousel.Indicators />
                  <Carousel.NextTrigger asChild>
                    <IconButton size="xs" variant="subtle" className="nav-trigger">
                      <LuChevronRight />
                    </IconButton>
                  </Carousel.NextTrigger>
                </Carousel.Control>
              </Carousel.Root>
            </div>
          )}
          
          <h2 className="block-title mt-4">
            {selectedBrand === 'Все' ? 'Все доступные пары' : `Модели ${selectedBrand}`}
            <span className="items-count-badge">{filteredProducts.length}</span>
          </h2>

          {filteredProducts.length === 0 ? (
            <div className="empty-state">Ничего не найдено. Попробуйте изменить запрос...</div>
          ) : (
            <main className="products-grid">
              {filteredProducts.map((product) => {
                const cartItem = cart.find(item => item.id === product.id);
                
                return (
                  <div key={product.id} className="product-card">
                    <div className="product-thumb" onClick={() => setSelectedProduct(product)}>
                      {product.brand && <span className="card-brand-label">{product.brand}</span>}
                      <img src={product.image} alt={product.name} onError={(e) => { e.target.src = 'https://placehold.co/150x150?text=No+Image' }} />
                      <div className="info-overlay"><Info size={14} /></div>
                    </div>
                    <div className="product-main-details">
                      <h3 className="product-title" onClick={() => setSelectedProduct(product)}>{product.name}</h3>
                      <div className="product-footer">
                        <span className="product-price">{product.price.toLocaleString()} ₽</span>
                        
                        {cartItem ? (
                          <div className="quantity-controls">
                            <button onClick={() => removeFromCart(product.id)}><Minus size={12} /></button>
                            <span>{cartItem.quantity}</span>
                            <button onClick={() => addToCart(product)}><Plus size={12} /></button>
                          </div>
                        ) : (
                          <button className="add-btn" onClick={() => addToCart(product)}>
                            + Купить
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </main>
          )}
        </>
      )}

      {/* Полоска быстрой корзины внизу главного экрана (если в ней есть товары) */}
      {cart.length > 0 && (
        <div className="floating-cart-bar" onClick={() => setIsCartOpen(true)}>
          <div className="floating-cart-info">
            <ShoppingBag size={18} />
            <span>В корзине {totalItemsCount} пары</span>
          </div>
          <div className="floating-cart-price">
            {totalAmount.toLocaleString()} ₽
          </div>
        </div>
      )}

      {/* ДЕТАЛЬНАЯ КАРТОЧКА ТОВАРА */}
      {selectedProduct && (() => {
        const modalCartItem = cart.find(item => item.id === selectedProduct.id);
        return (
          <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
            <div className="product-details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-handle"></div>
              <button className="close-modal-btn" onClick={() => setSelectedProduct(null)}>
                <X size={20} />
              </button>
              <div className="modal-content-scroll">
                <div className="modal-image-container">
                  <img src={selectedProduct.image} alt={selectedProduct.name} onError={(e) => { e.target.src = 'https://placehold.co/300x300?text=No+Image' }} />
                </div>
                <div className="modal-info">
                  {selectedProduct.brand && <span className="modal-brand-tag">{selectedProduct.brand}</span>}
                  <h2>{selectedProduct.name}</h2>
                  <div className="status-badge">В наличии</div>
                  <p className="description-header">Описание модели</p>
                  <p className="modal-description">{selectedProduct.description || "Описание для данной пары обуви дополняется."}</p>
                </div>
              </div>
              <div className="modal-footer">
                <div className="modal-price-pane">
                  <span className="price-sub">Стоимость</span>
                  <span className="modal-price">{selectedProduct.price.toLocaleString()} ₽</span>
                </div>
                {modalCartItem ? (
                  <div className="quantity-controls big-controls">
                    <button onClick={() => removeFromCart(selectedProduct.id)}><Minus size={14} /></button>
                    <span>{modalCartItem.quantity}</span>
                    <button onClick={() => addToCart(selectedProduct)}><Plus size={14} /></button>
                  </div>
                ) : (
                  <button className="modal-add-btn" onClick={() => addToCart(selectedProduct)}>
                    В корзину
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* МОДАЛКА КОРЗИНЫ */}
      {isCartOpen && cart.length > 0 && (
        <div className="cart-modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div className="cart-modal-header">
              <h2>Выбранные товары</h2>
              <button className="close-modal-btn" onClick={() => setIsCartOpen(false)}>
                <X size={20} />
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
                    <p>{(item.price * item.quantity).toLocaleString()} ₽</p>
                  </div>
                  <div className="quantity-controls">
                    <button onClick={() => removeFromCart(item.id)}><Minus size={12} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => addToCart(item)}><Plus size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="cart-modal-bottom-actions">
              <div className="cart-total-summary">
                <span>Итого:</span>
                <h3>{totalAmount.toLocaleString()} ₽</h3>
              </div>
              <button 
                className="go-to-checkout-btn"
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckoutStage(true);
                }}
              >
                Перейти к оформлению
              </button>
              <button className="clear-cart-btn-modal" onClick={clearCart}>
                Очистить полностью
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ДОБАВЛЕНИЕ ТОВАРА АДМИНИСТРАТОРОМ */}
      {isAdminModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAdminModalOpen(false)}>
          <div className="product-details-modal admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div className="cart-modal-header">
              <h2>Панель управления товарами</h2>
              <button className="close-modal-btn" onClick={() => setIsAdminModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddProductSubmit} className="admin-form">
              <div className="input-box">
                <label>Название кроссовок</label>
                <input 
                  type="text" 
                  value={newProduct.name} 
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="input-box">
                <label>Бренд производителя</label>
                <input 
                  type="text"
                  value={newProduct.brand} 
                  onChange={e => setNewProduct({...newProduct, brand: e.target.value})} 
                  required 
                />
              </div>
              <div className="input-box">
                <label>Цена продажи (₽)</label>
                <input 
                  type="number" 
                  value={newProduct.price} 
                  onChange={e => setNewProduct({...newProduct, price: e.target.value})} 
                  required 
                />
              </div>
              <div className="input-box">
                <label>Описание и размеры</label>
                <textarea 
                  value={newProduct.description} 
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})} 
                />
              </div>
              <div className="input-box">
                <label className="file-uploader">
                  <span>Загрузить фото пары</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setNewProduct({...newProduct, image_file: e.target.files[0]})} 
                  />
                </label>
                {newProduct.image_file && (
                  <span className="file-ready-tag"><Check size={14} /> {newProduct.image_file.name}</span>
                )}
              </div>
              <button type="submit" className="modal-add-btn w-full">
                Добавить в PostgreSQL
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;