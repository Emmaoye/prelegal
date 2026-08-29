import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.db import init_db
from app.routes.auth import router as auth_router
from app.routes.document_chat import router as document_chat_router
from app.routes.documents import router as documents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Prelegal", lifespan=lifespan)

app.include_router(auth_router)
app.include_router(document_chat_router)
app.include_router(documents_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


static_dir = Path(os.environ.get("STATIC_DIR", "static"))
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
