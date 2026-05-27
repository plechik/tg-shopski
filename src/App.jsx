import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [backendMessage, setBackendMessage] = useState('');

  useEffect(() => {
    // Проверяем, что приложение открыто внутри Telegram
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready(); // Сообщаем ТГ, что приложение загрузилось
      setUser(tg.initDataUnsafe?.user);
    }
  }, []);

  const callPythonBackend = async () => {
    try {
      // Сюда мы подставим адрес твоего localtunnel / ngrok
      const response = await fetch('https://YOUR-SUBDOMAIN.loca.lt/api/hello');
      const data = await response.json();
      setBackendMessage(data.message);
    } catch (error) {
      setBackendMessage('Ошибка связи с бэкендом');
    }
  };

  return (
    <div className="app-container">
      <h1>Привет, {user ? user.first_name : 'Незнакомец'}!</h1>
      <p>Это Mini App на React + Python</p>

      <button onClick={callPythonBackend}>Спросить бэкенд</button>
      {backendMessage && <p className="response">{backendMessage}</p>}
    </div>
  );
}

export default App;