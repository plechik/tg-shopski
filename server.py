import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
import boto3  # Используем стандартный стабильный boto3
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.client.session.aiohttp import AiohttpSession

# SQLAlchemy
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, selectinload
from sqlalchemy import Column, Integer, String, Numeric, Boolean, ForeignKey
from sqlalchemy.future import select

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / "variables.env")
# ================= CONFIGURATION =================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
DATABASE_URL = os.environ.get("DATABASE_URL")

B2_ENDPOINT_URL = os.environ.get("B2_ENDPOINT_URL")
B2_KEY_ID = os.environ.get("B2_KEY_ID")
B2_APPLICATION_KEY = os.environ.get("B2_APPLICATION_KEY")
B2_BUCKET_NAME = os.environ.get("B2_BUCKET_NAME")
MINI_APP_URL = "https://tg-shopski.vercel.app"
PROXY_URL = 'http://127.0.0.1:12334'

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:wasdqwe123@localhost:5432/zolikstore")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
if DATABASE_URL and "sslmode=" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("sslmode=require", "ssl=require")
    DATABASE_URL = DATABASE_URL.replace("sslmode=", "ssl=")
# =================================================

IS_RENDER = os.environ.get("PORT") is not None

if IS_RENDER:
    bot = Bot(token=BOT_TOKEN)
else:
    session = AiohttpSession(proxy=PROXY_URL)
    bot = Bot(token=BOT_TOKEN, session=session)

dp = Dispatcher()

# ================= DATABASE SETUP =================
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# Зависимость для БД
async def get_db():
    async with async_session() as session:
        yield session

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    brand = Column(String(100), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    description = Column(String, nullable=True)
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")

class ProductImage(Base):
    __tablename__ = "product_images"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String, nullable=False)
    is_main = Column(Boolean, default=False)
    product = relationship("Product", back_populates="images")
# ==================================================

# ================= PYDANTIC MODELS =================
class Item(BaseModel):
    id: int
    name: str
    price: int
    image: str
    quantity: int = 1

class Order(BaseModel):
    items: List[Item]
    total: int

class ImageCreate(BaseModel):
    image_url: str
    is_main: bool = False
# ===================================================

def sync_upload_to_b2(file_content, filename, content_type):
    s3_client = boto3.client(
        's3',
        endpoint_url=B2_ENDPOINT_URL,
        aws_access_key_id=B2_KEY_ID,
        aws_secret_access_key=B2_APPLICATION_KEY
    )
    
    import uuid
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"products/{uuid.uuid4()}{file_extension}"
    
    s3_client.put_object(
        Bucket=B2_BUCKET_NAME,
        Key=unique_filename,
        Body=file_content,
        ContentType=content_type
    )
    
    return f"{B2_ENDPOINT_URL}/{B2_BUCKET_NAME}/{unique_filename}"

async def upload_file_to_b2(file: UploadFile) -> str:
    file_content = await file.read()
    public_url = await asyncio.to_thread(
        sync_upload_to_b2, 
        file_content, 
        file.filename, 
        file.content_type
    )
    return public_url


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("🗄️ Таблицы PostgreSQL проверены/созданы.")
    polling_task = asyncio.create_task(dp.start_polling(bot))
    yield
    polling_task.cancel()
    await bot.session.close()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- API ЭНДПОИНТЫ ---
@app.get("/api/products")
async def get_catalog(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).options(selectinload(Product.images)))
    products = result.scalars().all()
    return products


# ЭНДПОИНТ: Создание товара С ЗАГРУЗКОЙ ФАЙЛА В BACKBLAZE
@app.post("/api/products")
async def create_product(
    name: str = Form(...),
    brand: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    image_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db)
):
    new_product = Product(
        name=name,
        brand=brand,
        price=price,
        description=description
    )
    db.add(new_product)
    await db.commit()

    if image_file:
        try:
            b2_image_url = await upload_file_to_b2(image_file)
            new_image = ProductImage(
                product_id=new_product.id,
                image_url=b2_image_url,
                is_main=True
            )
            db.add(new_image)
            await db.commit()
            
            await db.execute(
                select(Product)
                .where(Product.id == new_product.id)
                .options(selectinload(Product.images))
            )
            
        except Exception as e:
            print(f"Ошибка при загрузке картинки в Backblaze B2: {e}")
            return {"status": "partial_success", "product_id": new_product.id, "warning": "Товар создан, но картинка не загрузилась"}

    return {"status": "success", "product_id": new_product.id}


# ЭНДПОИНТ: Ручное добавление текстовой ссылки на картинку (Использует ImageCreate)
@app.post("/api/products/{product_id}/images")
async def add_product_image(product_id: int, image_data: ImageCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
        
    new_image = ProductImage(
        product_id=product_id,
        image_url=image_data.image_url,
        is_main=image_data.is_main
    )
    db.add(new_image)
    await db.commit()
    return {"status": "success", "message": "Картинка успешно добавлена"}


# ЭНДПОИНТ: Прием заказов
@app.post("/api/orders")
async def create_order(order: Order):
    items_text = "\n".join([f"• {item.name} — {item.quantity} шт. x {item.price} руб." for item in order.items])
    print("\n--- 🛒 ПОЛУЧЕН НОВЫЙ ЗАКАЗ ИЗ MINI APP! ---")
    print(f"Товары:\n{items_text}\n")
    print(f"Общая сумма: {order.total} руб.")
    
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
            web_app=types.WebAppInfo(url=MINI_APP_URL)
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
    uvicorn.run(app, host="127.0.0.1", port=8000)