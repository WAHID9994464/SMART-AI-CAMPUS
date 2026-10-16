import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/nexuseco.db")

# OpenRouter AI Configuration
OPENROUTER_API_KEY: str | None = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "google/gemini-3-flash-preview")
OPENROUTER_API_URL: str = os.getenv("OPENROUTER_API_URL", "https://openrouter.ai/api/v1/chat/completions")
OPENROUTER_TIMEOUT_SECONDS: int = int(os.getenv("OPENROUTER_TIMEOUT_SECONDS", "25"))

# Demonstration Cost Savings baseline
ESTIMATED_COST_SAVED_INR: float = float(os.getenv("ESTIMATED_COST_SAVED_INR", "20000.0"))

# Legacy Gemini AI (fallback)
GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_TIMEOUT_SECONDS: int = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "20"))

FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))
ELECTRICITY_TARIFF: float = float(os.getenv("ELECTRICITY_TARIFF", "8.5"))
GRID_EMISSION_FACTOR: float = float(os.getenv("GRID_EMISSION_FACTOR", "0.82"))
IDLE_DELAY_MINUTES: int = int(os.getenv("IDLE_DELAY_MINUTES", "30"))
UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")


def is_openrouter_configured() -> bool:
    """Check if a valid OpenRouter API key is configured."""
    key = (OPENROUTER_API_KEY or "").strip()
    return bool(key and key != "your_openrouter_api_key_here" and len(key) >= 10)


def is_gemini_configured() -> bool:
    """Check if a potentially valid Gemini API key is configured."""
    key = (GEMINI_API_KEY or "").strip()
    return bool(key and key != "your_gemini_api_key_here" and len(key) >= 15)


os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs("./data", exist_ok=True)
