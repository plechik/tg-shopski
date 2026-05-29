import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.client.session.aiohttp import AiohttpSession

# ================= CONFIGURATION =================
BOT_TOKEN = "8944152643:AAGREuxaxUFMKVm6KkB9TZ6v4MBaQjQcSjI"
MINI_APP_URL = "https://t.me/zolikstore_bot/app"
PROXY_URL = 'http://127.0.0.1:12334'
# =================================================

# Автоматически проверяем, запущены ли мы на сервере Render
IS_RENDER = os.environ.get("PORT") is not None

# Инициализируем сессию в зависимости от того, где запущен код
if IS_RENDER:
    # На Render прокси НЕ НУЖЕН, создаем стандартного бота
    bot = Bot(token=BOT_TOKEN)
    print("🌐 Бот инициализирован напрямую (для Render)")
else:
    # На локальном ПК используем твой прокси
    session = AiohttpSession(proxy=PROXY_URL)
    bot = Bot(token=BOT_TOKEN, session=session)
    print("💻 Бот инициализирован через локальный прокси")

dp = Dispatcher()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Фоновое выполнение polling
    polling_task = asyncio.create_task(dp.start_polling(bot))
    print("🤖 Бот успешно запущен в фоне (через Lifespan)!")
    yield
    # При остановке сервера отменяем фоновую задачу бота и закрываем сессию
    polling_task.cancel()
    await bot.session.close()
    print("🛑 Сессия бота закрыта.")

# Инициализируем FastAPI
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- СХЕМЫ ДАННЫХ ДЛЯ ЗАКАЗА ---
class Item(BaseModel):
    id: int
    name: str
    price: int
    image: str
    quantity: int = 1

class Order(BaseModel):
    items: List[Item]
    total: int

# --- API ЭНДПОИНТ ДЛЯ ПРИЕМА ЗАКАЗОВ ИЗ REACT ---
@app.post("/api/orders")
async def create_order(order: Order):
    print("\n--- 🛒 ПОЛУЧЕН НОВЫЙ ЗАКАЗ ИЗ MINI APP! ---")
    print(f"Общая сумма: {order.total} руб.")
    print("Товары:")
    for item in order.items:
        print(f"  - {item.name} | Цена: {item.price} руб. {item.image}")
    
    # Отправка уведомления администратору в Telegram
    try:
        items_text = "\n".join([f"• {item.name} — **{item.quantity} шт.** x {item.price} руб." for item in order.items])
        await bot.send_message(
            chat_id=1160765121,
            text=f"🛍️ **Новый заказ!**\n\n"
                 f"**Товары:**\n{items_text}\n\n"
                 f"💰 **Итого:** {order.total} руб.",
            parse_mode="Markdown"
        )
    except Exception as e:
        print(f"Ошибка отправки сообщения в ТГ: {e}")
    
    return {"status": "success"}


# --- ЛОГИКА ТЕЛЕГРАМ БОТА ---
@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    builder = InlineKeyboardBuilder()
    builder.row(
        types.InlineKeyboardButton(
            text="🛍️ Открыть магазин",
            url=MINI_APP_URL
        )
    )
    
    await message.answer(
        f"Привет, {message.from_user.first_name}!\n\n"
        "Добро пожаловать в **ZolikStore** — самый технологичный магазин одежды.\n"
        "Нажми на кнопку ниже, чтобы открыть каталог товаров 👇",
        reply_markup=builder.as_markup(),
        parse_mode="Markdown"
    )

if __name__ == "__main__":
    # Локальный запуск на ПК
    uvicorn.run(app, host="127.0.0.1", port=8000)



# npx localtunnel --port 8000 --subdomain zolikstore