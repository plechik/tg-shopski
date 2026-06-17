import React, { useState, useEffect } from 'react';
import { miniApp } from '@telegram-apps/sdk-react';
import { ShoppingBag, X, Plus, Minus, Info, PackagePlus, Search, Check, ArrowLeft } from 'lucide-react';
import './App.css';
import { Carousel, IconButton, Box } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

const API_BASE_URL = 'https://zolikstore.vercel.app/';
const ADMIN_TELEGRAM_ID = 1160765121;

function App() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Все');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', price: '', description: '', image_file: null });

  const [customerDetails, setCustomerDetails] = useState({
    fullName: '',
    phone: '',
    deliveryMethod: 'cdek',
    address: '',
    comment: ''
  });

  useEffect(() => {
    try {
      if (miniApp && typeof miniApp.mount === 'function' && !miniApp.isMounted()) {
        miniApp.mount();
      }

      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        const userId = tg.initDataUnsafe?.user?.id;
        if (userId && String(userId).trim() === String(ADMIN_TELEGRAM_ID).trim()) {
          setIsAdmin(true);
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
            image: imgUrl || 'https://placehold.co/300x300/1e293b/f8fafc?text=No+Image'
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
        setIsCheckoutMode(false);
      }
    } else {
      setCart(cart.map(item => 
        item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      ));
    }
  };

  const clearCart = () => {
    setCart([]);
    setIsCheckoutMode(false);
  };

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (customerDetails.deliveryMethod === 'cdek' && !customerDetails.address.trim()) {
      alert('Пожалуйста, укажите адрес доставки для СДЭК');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cart, 
          total: totalAmount,
          customer_details: customerDetails
        })
      });
      
      if (response.ok) {
        setCart([]);
        setIsSuccess(true);
        setIsCheckoutMode(false);
      } else {
        alert('Ошибка при отправке заказа: ' + response.status);
      }
    } catch (error) {
      alert('Ошибка соединения с сервером: ' + error.message);
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

  if (isSuccess) {
    return (
      <div className="success-screen">
        <div className="success-card">
          <div className="success-icon-animated">
            <Check size={40} />
          </div>
          <h2>Заказ принят!</h2>
          <p className="modal-description" style={{marginBottom: '24px'}}>
            Менеджер уже обрабатывает твою заявку и свяжется в Telegram в ближайшее время.
          </p>
          <button className="confirm-order-btn" onClick={() => setIsSuccess(false)}>
            Вернуться в каталог
          </button>
        </div>
      </div>
    );
  }

  if (isCheckoutMode) {
    return (
      <div className="checkout-page">
        <header className="checkout-header">
          <button className="nav-trigger close-modal-btn" style={{position: 'static'}} onClick={() => setIsCheckoutMode(false)}>
            <ArrowLeft size={20} />
          </button>
          <h3>Оформление заказа</h3>
          <div style={{width: '36px'}}></div>
        </header>

        <div className="checkout-scroll-content">
          <form onSubmit={handleConfirmOrder}>
            <div className="checkout-section">
              <div className="section-title">Контакты</div>
              <div className="checkout-input-field">
                <input 
                  type="text" 
                  placeholder="ФИО получателя" 
                  value={customerDetails.fullName}
                  onChange={e => setCustomerDetails({...customerDetails, fullName: e.target.value})}
                  required 
                />
              </div>
              <div className="checkout-input-field">
                <input 
                  type="tel" 
                  placeholder="Номер телефона" 
                  value={customerDetails.phone}
                  onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value})}
                  required 
                />
              </div>
            </div>

            <div className="checkout-section">
              <div className="section-title">Способ доставки</div>
              <div className="delivery-selector">
                <div 
                  className={`delivery-option ${customerDetails.deliveryMethod === 'cdek' ? 'active' : ''}`}
                  onClick={() => setCustomerDetails({...customerDetails, deliveryMethod: 'cdek'})}
                >
                  <div className="radio-dot"></div>
                  <div className="option-info">
                    <h4>СДЭК / Почта России</h4>
                    <p>Доставка в любой регион до пункта выдачи или двери</p>
                  </div>
                </div>

                <div 
                  className={`delivery-option ${customerDetails.deliveryMethod === 'pickup' ? 'active' : ''}`}
                  onClick={() => setCustomerDetails({...customerDetails, deliveryMethod: 'pickup', address: 'Шоурум ZolikStore'})}
                >
                  <div className="radio-dot"></div>
                  <div className="option-info">
                    <h4>Самовывоз</h4>
                    <p>Бесплатно из нашего шоурума</p>
                  </div>
                </div>
              </div>
            </div>

            {customerDetails.deliveryMethod === 'cdek' && (
              <div className="checkout-section">
                <div className="section-title">Адрес доставки</div>
                <div className="checkout-input-field">
                  <input 
                    type="text" 
                    placeholder="Город, улица, дом, кв/офис" 
                    value={customerDetails.address === 'Шоурум ZolikStore' ? '' : customerDetails.address}
                    onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})}
                    required
                  />
                </div>
              </div>
            )}

            <div className="checkout-section">
              <div className="section-title">Комментарий (необязательно)</div>
              <textarea 
                className="checkout-textarea" 
                rows="3" 
                placeholder="Укажите нужный размер обуви или важные примечания..."
                value={customerDetails.comment}
                onChange={e => setCustomerDetails({...customerDetails, comment: e.target.value})}
              />
            </div>

            <div className="checkout-sticky-bottom">
              <button type="submit" className="confirm-order-btn">
                Подтвердить заказ • {totalAmount.toLocaleString()} ₽
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
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
    <div className="shop-container">

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
          {products.length > 0 && selectedBrand === 'Все' && !searchQuery && (
            <div className="carousel-container">
              <h2 className="block-title">Новинки</h2>
              <Carousel.Root slideCount={products.slice(0, 5).length} maxW="xl" mx="auto" allowMouseDrag>
                <Carousel.ItemGroup>
                  {products.slice(0, 8).map((product, index) => (
                    <Carousel.Item key={`slide-${product.id}`} index={index}>
                      <Box w="100%" h="220px" rounded="24px" overflow="hidden" position="relative" className="slide-card" onClick={() => setSelectedProduct(product)}>
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.src = 'https://placehold.co/600x300/1e293b/f8fafc?text=No+Image' }} 
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
                <Carousel.Control justifyContent="center" gap="4" mt="4">
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
                      <img src={product.image} alt={product.name} onError={(e) => { e.target.src = 'https://placehold.co/150x150/1e293b/f8fafc?text=No+Image' }} />
                      <div className="info-overlay"><Info size={16} /></div>
                    </div>
                    <div className="product-main-details">
                      <h3 className="product-title" onClick={() => setSelectedProduct(product)}>{product.name}</h3>
                      <div className="product-footer">
                        <span className="product-price">{product.price.toLocaleString()} ₽</span>
                        {cartItem ? (
                          <div className="quantity-controls">
                            <button onClick={() => removeFromCart(product.id)}><Minus size={14} /></button>
                            <span>{cartItem.quantity}</span>
                            <button onClick={() => addToCart(product)}><Plus size={14} /></button>
                          </div>
                        ) : (
                          <button className="add-btn" onClick={() => addToCart(product)}>
                            В корзину
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

      {cart.length > 0 && !isCheckoutMode && (
        <div className="floating-cart-bar" onClick={() => { setIsCartOpen(false); setIsCheckoutMode(true); }}>
          <span>🛒 Корзина ({totalItemsCount})</span>
          <span>Оформить • {totalAmount.toLocaleString()} ₽</span>
        </div>
      )}

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
                  <img src={selectedProduct.image} alt={selectedProduct.name} onError={(e) => { e.target.src = 'https://placehold.co/300x300/1e293b/f8fafc?text=No+Image' }} />
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
                    <button onClick={() => removeFromCart(selectedProduct.id)}><Minus size={16} /></button>
                    <span>{modalCartItem.quantity}</span>
                    <button onClick={() => addToCart(selectedProduct)}><Plus size={16} /></button>
                  </div>
                ) : (
                  <button className="modal-add-btn" onClick={() => addToCart(selectedProduct)}>
                    Добавить в корзину
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {isCartOpen && cart.length > 0 && (
        <div className="cart-modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div className="cart-modal-header">
              <h2>Выбранные товары</h2>
              <button className="close-modal-btn" style={{position: 'static'}} onClick={() => setIsCartOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="cart-items-list">
              {cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-img">
                    <img src={item.image} alt={item.name} onError={(e) => { e.target.src = 'https://placehold.co/50x50/1e293b/f8fafc?text=Err' }} />
                  </div>
                  <div className="cart-item-info">
                    <h4>{item.name}</h4>
                    <p>{(item.price * item.quantity).toLocaleString()} ₽</p>
                  </div>
                  <div className="quantity-controls">
                    <button onClick={() => removeFromCart(item.id)}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => addToCart(item)}><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              <button className="confirm-order-btn" onClick={() => { setIsCartOpen(false); setIsCheckoutMode(true); }}>
                Перейти к оформлению
              </button>
              <button className="clear-cart-btn-modal" onClick={clearCart}>
                Очистить корзину
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdminModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAdminModalOpen(false)}>
          <div className="product-details-modal admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div className="cart-modal-header">
              <h2>Управление товарами</h2>
              <button className="close-modal-btn" style={{position: 'static'}} onClick={() => setIsAdminModalOpen(false)}>
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
                  rows="3"
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
                  <span className="file-ready-tag"><Check size={16} /> {newProduct.image_file.name}</span>
                )}
              </div>
              <button type="submit" className="confirm-order-btn w-full" style={{marginTop: '8px'}}>
                Добавить в базу
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default App;