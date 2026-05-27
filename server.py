from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI()

# Разрешаем твоему сайту на Vercel слать запросы на твой ПК
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Когда всё настроишь, сюда можно вставить адрес своего Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Описываем структуру данных, которые прилетят из React
class Item(BaseModel):
    id: int
    name: str
    price: int
    image: str

class Order(BaseModel):
    items: List[Item]
    total: int

@app.post("/api/orders")
async def create_order(order: Order):
    print("--- НОВЫЙ ЗАКАЗ! ---")
    print(f"Общая сумма: {order.total} руб.")
    print("Товары в заказе:")
    for item in order.items:
        print(f"- {item.name} ({item.price} руб.)")
        
    # Тут в будущем будет логика: сохранить в БД или отправить админу в ТГ-уведомление
    return {"status": "success", "message": "Заказ успешно принят бэкендом!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)