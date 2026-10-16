"""
Smart AI Campus FastAPI Application Entry Point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import FRONTEND_ORIGIN
from app.database import engine, Base, SessionLocal
from app.models import *  # ensure all models are registered
from app.seed import seed_database
from app.routers import buildings, energy, water, waste, cv, ai, reports, dashboard, solar, intelligence


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (safe on restart — won't drop existing data)
    Base.metadata.create_all(bind=engine)
    # Seed initial data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Smart AI Campus API",
    description="AI-Powered Sustainable Campus Management System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(buildings.router, prefix="/api")
app.include_router(energy.router, prefix="/api")
app.include_router(water.router, prefix="/api")
app.include_router(waste.router, prefix="/api")
app.include_router(cv.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(dashboard.settings_router, prefix="/api")
app.include_router(solar.router, prefix="/api")
app.include_router(intelligence.router, prefix="/api")


@app.get("/api/health")
def health():
    """Health check endpoint."""
    try:
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        db_status = "ok"
    except Exception as exc:
        db_status = f"error: {str(exc)[:64]}"

    from app.config import is_gemini_configured, is_openrouter_configured
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "openrouter_configured": is_openrouter_configured(),
        "gemini_configured": is_gemini_configured(),
        "version": "1.0.0",
    }
