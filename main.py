from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# КРИТИЧЕСКИ ВАЖНО: Разрешаем React-сайту делать запросы к нашему Python
app.add_middleware(
   CORSMiddleware,
   allow_origins=["*"], # В продакшене лучше указать конкретный URL твоего React-сайта
   allow_credentials=True,
   allow_methods=["*"],
   allow_headers=["*"],
)

@app.get("/api/hello")
def read_root():
    return {"message": "Привет из Python-бэкенда на твоем ПК!"}