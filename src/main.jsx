import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { init } from '@telegram-apps/sdk-react';
import { Provider } from "./components/ui/provider"

// Инициализируем Telegram SDK. 
// acceptCustomStyles позволяет приложению подстраиваться под темную/светлую тему ТГ.
try {
  init({ acceptCustomStyles: true });
} catch (e) {
  console.log("Приложение запущенно вне Telegram (в обычном браузере)");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider>
      <App />
    </Provider>
  </React.StrictMode>,
);