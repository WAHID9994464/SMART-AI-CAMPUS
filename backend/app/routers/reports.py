"""
Maintenance Tickets and Sustainability Reports router.
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import ESTIMATED_COST_SAVED_INR
from app.models import MaintenanceTicket, SustainabilityReport, EnergySavingEvent, WaterAlert, WasteIncident

router = APIRouter(prefix="/reports", tags=["reports"])


# ---- Schemas ----

class TicketOut(BaseModel):
    id: int
    building_id: Optional[int]
    ticket_type: str
    title: str
    description: Optional[str]
    priority: str
    status: str
    assigned_to: Optional[str]
    ref_incident_id: Optional[int]
    ref_incident_type: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    description: Optional[str] = None


class ReportOut(BaseModel):
    id: int
    report_type: str
    period_start: datetime
    period_end: datetime
    total_energy_kwh: float
    energy_saved_kwh: float
    cost_saved_inr: float
    co2_avoided_kg: float
    total_water_litres: float
    water_incidents: int
    waste_incidents: int
    open_tickets: int
    resolved_tickets: int
    solar_generated_kwh: Optional[float] = 0.0
    solar_consumed_kwh: Optional[float] = 0.0
    solar_cost_saved_inr: Optional[float] = 0.0
    solar_co2_avoided_kg: Optional[float] = 0.0
    solar_contribution_pct: Optional[float] = 0.0
    recommendations: Optional[str]
    generated_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class GenerateReportRequest(BaseModel):
    report_type: str = "daily"  # daily | weekly
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


# ---- Tickets ----

@router.get("/tickets", response_model=list[TicketOut])
def list_tickets(
    status: Optional[str] = None,
    ticket_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(MaintenanceTicket)
    if status:
        q = q.filter(MaintenanceTicket.status == status)
    if ticket_type:
        q = q.filter(MaintenanceTicket.ticket_type == ticket_type)
    return q.order_by(MaintenanceTicket.created_at.desc()).limit(limit).all()


@router.patch("/tickets/{ticket_id}", response_model=TicketOut)
def update_ticket(ticket_id: int, body: TicketUpdate, db: Session = Depends(get_db)):
    t = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(t, field, val)
    if body.status in ("resolved", "closed"):
        t.resolved_at = datetime.utcnow()
    t.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(t)
    return t


# ---- Reports ----

@router.post("/generate", response_model=ReportOut)
def generate_report(body: GenerateReportRequest, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    if body.period_end:
        period_end = body.period_end
    else:
        period_end = now

    if body.period_start:
        period_start = body.period_start
    elif body.report_type == "weekly":
        period_start = period_end - timedelta(days=7)
    elif body.report_type == "monthly":
        period_start = period_end - timedelta(days=30)
    else:
        period_start = period_end.replace(hour=0, minute=0, second=0, microsecond=0)

    # Aggregate energy events
    energy_events = db.query(EnergySavingEvent).filter(
        EnergySavingEvent.created_at >= period_start,
        EnergySavingEvent.created_at <= period_end,
    ).all()

    energy_saved = sum(e.energy_saved_kwh for e in energy_events)
    cost_saved = ESTIMATED_COST_SAVED_INR + sum(e.cost_saved_inr for e in energy_events)
    co2_avoided = sum(e.co2_avoided_kg for e in energy_events)

    # Rough total energy estimate from savings (placeholder)
    from app.models import Room, SensorReading, Sensor
    rooms = db.query(Room).all()
    current_load = sum(r.current_load_kw for r in rooms)
    hours = max(1, (period_end - period_start).total_seconds() / 3600)
    total_energy = round(current_load * hours, 2)

    # Water usage estimate
    water_sensors = db.query(Sensor).filter(Sensor.sensor_type == "water").all()
    water_sensor_ids = [s.id for s in water_sensors]
    water_readings = db.query(SensorReading).filter(
        SensorReading.sensor_id.in_(water_sensor_ids),
        SensorReading.recorded_at >= period_start,
        SensorReading.recorded_at <= period_end,
    ).all()
    avg_lpm = (sum(r.value for r in water_readings) / len(water_readings)) if water_readings else 2.0
    total_water = round(avg_lpm * 60 * hours, 1)

    # Incident counts
    water_inc = db.query(WaterAlert).filter(
        WaterAlert.created_at >= period_start,
        WaterAlert.created_at <= period_end,
    ).count()
    waste_inc = db.query(WasteIncident).filter(
        WasteIncident.created_at >= period_start,
        WasteIncident.created_at <= period_end,
    ).count()
    open_tickets = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.status.in_(["open", "in_progress"]),
    ).count()
    resolved_tickets = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.status.in_(["resolved", "closed"]),
        MaintenanceTicket.resolved_at >= period_start,
        MaintenanceTicket.resolved_at <= period_end,
    ).count()

    recs = _generate_recommendations(energy_saved, water_inc, waste_inc)

    # Solar energy metrics for reporting period
    from app.models import SolarReading
    from app.config import ELECTRICITY_TARIFF, GRID_EMISSION_FACTOR
    solar_readings = db.query(SolarReading).filter(
        SolarReading.recorded_at >= period_start,
        SolarReading.recorded_at <= period_end,
    ).all()
    solar_gen = sum(r.generated_kwh for r in solar_readings)
    solar_cons = sum(r.consumed_kwh for r in solar_readings)
    solar_cost = solar_cons * ELECTRICITY_TARIFF
    solar_co2 = solar_cons * GRID_EMISSION_FACTOR
    solar_pct = (solar_cons / total_energy * 100) if total_energy > 0 else 0.0

    report = SustainabilityReport(
        report_type=body.report_type,
        period_start=period_start,
        period_end=period_end,
        total_energy_kwh=total_energy,
        energy_saved_kwh=round(energy_saved, 3),
        cost_saved_inr=round(cost_saved, 2),
        co2_avoided_kg=round(co2_avoided + solar_co2, 2),
        total_water_litres=total_water,
        water_incidents=water_inc,
        waste_incidents=waste_inc,
        open_tickets=open_tickets,
        resolved_tickets=resolved_tickets,
        solar_generated_kwh=round(solar_gen, 2),
        solar_consumed_kwh=round(solar_cons, 2),
        solar_cost_saved_inr=round(solar_cost, 2),
        solar_co2_avoided_kg=round(solar_co2, 2),
        solar_contribution_pct=round(solar_pct, 1),
        recommendations=recs,
        generated_by="system",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/", response_model=list[ReportOut])
def list_reports(limit: int = 20, db: Session = Depends(get_db)):
    return (
        db.query(SustainabilityReport)
        .order_by(SustainabilityReport.created_at.desc())
        .limit(limit)
        .all()
    )


def _generate_recommendations(energy_saved: float, water_inc: int, waste_inc: int) -> str:
    recs = []
    if energy_saved < 5:
        recs.append("• Run Energy-Saving Simulations for vacant rooms to reduce consumption.")
    else:
        recs.append(f"• Good progress: {energy_saved:.2f} kWh saved this period. Continue monitoring vacant room equipment.")
    if water_inc > 0:
        recs.append(f"• {water_inc} water incident(s) detected. Ensure all alerts are investigated and resolved.")
    else:
        recs.append("• No water incidents this period. Maintain regular inspections.")
    if waste_inc > 2:
        recs.append(f"• {waste_inc} waste incidents recorded. Review collection schedules and increase high-traffic bin frequency.")
    else:
        recs.append("• Waste incidents are within acceptable range. Continue monitoring bin fill levels.")
    recs.append("• Schedule quarterly infrastructure audits to identify hidden energy and water wastage.")
    return "\n".join(recs)
