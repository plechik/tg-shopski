import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { init, AppRoot } from '@telegram-apps/sdk-react'

// Инициализируем SDK Telegram Mini Apps
try {
  init();
} catch (error) {
  console.error("Ошибка инициализации SDK:", error);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRoot>
      <App />
    </AppRoot>
  </React.StrictMode>,
)