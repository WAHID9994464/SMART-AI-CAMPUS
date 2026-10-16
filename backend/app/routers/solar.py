from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models import SolarReading, Room
from app.config import ELECTRICITY_TARIFF, GRID_EMISSION_FACTOR

router = APIRouter(prefix="/solar", tags=["solar"])


@router.get("/dashboard")
def solar_dashboard(db: Session = Depends(get_db)):
    """Solar energy dashboard with today's generation, savings and sustainability metrics."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    readings = db.query(SolarReading).filter(SolarReading.recorded_at >= today).order_by(SolarReading.recorded_at).all()

    total_generated = sum(r.generated_kwh for r in readings)
    total_consumed = sum(r.consumed_kwh for r in readings)
    total_exported = sum(r.exported_kwh for r in readings)
    current_power = readings[-1].power_kw if readings else 0.0

    # Campus total energy consumption
    total_campus_kw = sum(r.current_load_kw for r in db.query(Room).all())
    hours_elapsed = max(1, (datetime.utcnow() - today).total_seconds() / 3600)
    total_campus_kwh = total_campus_kw * hours_elapsed

    solar_contribution_pct = (total_consumed / total_campus_kwh * 100) if total_campus_kwh > 0 else 0.0
    grid_avoided_kwh = total_consumed  # solar consumed on campus offsets grid
    cost_saved_inr = grid_avoided_kwh * ELECTRICITY_TARIFF
    co2_avoided_kg = grid_avoided_kwh * GRID_EMISSION_FACTOR
    is_simulated = all(r.is_simulated for r in readings) if readings else True

    return {
        "solar_generated_kwh": round(total_generated, 2),
        "current_power_kw": round(current_power, 2),
        "total_campus_kwh": round(total_campus_kwh, 2),
        "solar_consumed_kwh": round(total_consumed, 2),
        "solar_exported_kwh": round(total_exported, 2),
        "solar_contribution_pct": round(solar_contribution_pct, 1),
        "grid_avoided_kwh": round(grid_avoided_kwh, 2),
        "cost_saved_inr": round(cost_saved_inr, 2),
        "co2_avoided_kg": round(co2_avoided_kg, 2),
        "is_simulated": is_simulated,
        "readings_count": len(readings),
    }


@router.get("/hourly")
def solar_hourly(hours: int = 24, db: Session = Depends(get_db)):
    """Hourly solar generation data for charts."""
    since = datetime.utcnow() - timedelta(hours=hours)
    readings = db.query(SolarReading).filter(SolarReading.recorded_at >= since).order_by(SolarReading.recorded_at).all()
    return [
        {
            "time": r.recorded_at.isoformat(),
            "generated_kwh": round(r.generated_kwh, 2),
            "consumed_kwh": round(r.consumed_kwh, 2),
            "power_kw": round(r.power_kw, 2),
        }
        for r in readings
    ]


@router.get("/summary")
def solar_summary(days: int = 7, db: Session = Depends(get_db)):
    """Solar summary for sustainability reports over N days."""
    since = datetime.utcnow() - timedelta(days=days)
    readings = db.query(SolarReading).filter(SolarReading.recorded_at >= since).all()
    total_generated = sum(r.generated_kwh for r in readings)
    total_consumed = sum(r.consumed_kwh for r in readings)
    grid_avoided = total_consumed
    return {
        "period_days": days,
        "total_generated_kwh": round(total_generated, 2),
        "total_consumed_kwh": round(total_consumed, 2),
        "grid_avoided_kwh": round(grid_avoided, 2),
        "cost_saved_inr": round(grid_avoided * ELECTRICITY_TARIFF, 2),
        "co2_avoided_kg": round(grid_avoided * GRID_EMISSION_FACTOR, 2),
        "is_simulated": all(r.is_simulated for r in readings) if readings else True,
    }
