from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.database import init_db
from core.config import settings
from api.deals import router as deals_router
from api.execution import router as execution_router
from api.research import router as research_router
from api.deepdive import router as deepdive_router
from api.financials import router as financials_router
from api.synthesis import router as synthesis_router
from api.documents import router as documents_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Pre-warm ChromaDB and seed corpus
    try:
        from agents.rag import get_chroma
        get_chroma()
    except Exception:
        pass
    yield

app = FastAPI(title="Dealigent API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(deals_router)
app.include_router(execution_router)
app.include_router(research_router)
app.include_router(deepdive_router)
app.include_router(financials_router)
app.include_router(synthesis_router)
app.include_router(documents_router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "dealigent-api"}
