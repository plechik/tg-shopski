import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn

# Импортируем всё необходимое из aiogram 3.x
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.client.session.aiohttp import AiohttpSession

# ================= CONFIGURATION =================
BOT_TOKEN = "8944152643:AAGREuxaxUFMKVm6KkB9TZ6v4MBaQjQcSjI"
MINI_APP_URL = "https://t.me/zolikstore_bot/app"
PROXY_URL = 'http://127.0.0.1:12334'
# =================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Этот код выполнится НА СТАРТЕ приложения
    asyncio.create_task(dp.start_polling(bot))
    print("🤖 Бот успешно запущен в фоне (через Lifespan)!")
    yield
    # Этот код выполнится ПРИ ОСТАНОВКЕ приложения
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

session = AiohttpSession(proxy=PROXY_URL)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# --- СХЕМЫ ДАННЫХ ДЛЯ ЗАКАЗА ---
class Item(BaseModel):
    id: int
    name: str
    price: int
    image: str

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
    
    await bot.send_message(
        chat_id=1160765121,
        text=f"Новый заказ на {order.total} руб\n"
            "Товары:\n" + "\n".join([f"{item.name} | {item.price} руб." for item in order.items])
        )
    
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
    # Запускаем FastAPI сервер
    uvicorn.run(app, host="127.0.0.1", port=8000)



# npx localtunnel --port 8000 --subdomain zolikstore