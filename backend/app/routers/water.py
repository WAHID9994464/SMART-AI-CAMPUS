"""
Water Management router.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import WaterAlert, Building, MaintenanceTicket, SensorReading, Sensor

router = APIRouter(prefix="/water", tags=["water"])


class WaterAlertOut(BaseModel):
    id: int
    building_id: Optional[int]
    alert_type: str
    flow_lpm: Optional[float]
    threshold_lpm: Optional[float]
    severity: str
    status: str
    detection_reason: Optional[str]
    recommended_action: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeakSimulationRequest(BaseModel):
    building_id: int
    flow_lpm: float = 4.5
    threshold_lpm: float = 2.0
    severity: str = "medium"


class AlertStatusUpdate(BaseModel):
    status: str  # open | investigating | confirmed | resolved


class WaterDashboard(BaseModel):
    current_flow_lpm: float
    daily_usage_litres: float
    suspected_leaks: int
    confirmed_leaks: int
    estimated_water_loss_litres: float
    open_tickets: int
    active_alerts: int = 0
    resolved_alerts: int = 0
    total_alerts: int = 0
    estimated_cost_inr: float = 0.0


@router.get("/dashboard", response_model=WaterDashboard)
def water_dashboard(db: Session = Depends(get_db)):
    alerts = db.query(WaterAlert).filter(WaterAlert.status != "resolved").all()
    suspected = sum(1 for a in alerts if a.alert_type == "suspected_leak")
    confirmed = sum(1 for a in alerts if a.status == "confirmed")
    active_count = len(alerts)
    resolved_count = db.query(WaterAlert).filter(WaterAlert.status == "resolved").count()
    total_count = db.query(WaterAlert).count()

    # Estimate daily usage from water sensor readings
    from datetime import timedelta
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    sensors = db.query(Sensor).filter(Sensor.sensor_type == "water").all()
    sensor_ids = [s.id for s in sensors]
    readings = db.query(SensorReading).filter(
        SensorReading.sensor_id.in_(sensor_ids),
        SensorReading.recorded_at >= today
    ).all()
    avg_lpm = (sum(r.value for r in readings) / len(readings)) if readings else 2.0
    hours_elapsed = max(1, (datetime.utcnow() - today).seconds / 3600)
    daily_litres = round(avg_lpm * 60 * hours_elapsed, 1)

    # Water loss from confirmed/suspected leaks (rough estimate)
    loss_litres = 0.0
    for a in alerts:
        if a.flow_lpm and a.threshold_lpm:
            excess = max(0, a.flow_lpm - a.threshold_lpm)
            since = (datetime.utcnow() - a.created_at).total_seconds() / 60
            loss_litres += excess * since

    open_tickets = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.ticket_type == "water",
        MaintenanceTicket.status.in_(["open", "in_progress"])
    ).count()

    estimated_cost = round(daily_litres * 0.045, 2)  # Approx ₹45 per 1000L

    return WaterDashboard(
        current_flow_lpm=round(avg_lpm, 2),
        daily_usage_litres=daily_litres,
        suspected_leaks=suspected,
        confirmed_leaks=confirmed,
        estimated_water_loss_litres=round(loss_litres, 1),
        open_tickets=open_tickets,
        active_alerts=active_count,
        resolved_alerts=resolved_count,
        total_alerts=total_count,
        estimated_cost_inr=estimated_cost,
    )


@router.get("/hourly")
def hourly_water(hours: int = 24, db: Session = Depends(get_db)):
    """Return hourly water flow/consumption for charts."""
    from datetime import timedelta
    now = datetime.utcnow()
    since = now - timedelta(hours=hours)

    sensors = db.query(Sensor).filter(Sensor.sensor_type == "water").all()
    sensor_ids = [s.id for s in sensors]

    readings = (
        db.query(SensorReading)
        .filter(
            SensorReading.sensor_id.in_(sensor_ids),
            SensorReading.recorded_at >= since,
        )
        .order_by(SensorReading.recorded_at.asc())
        .all()
    )

    buckets: dict[str, float] = {}
    for r in readings:
        key = r.recorded_at.strftime("%Y-%m-%dT%H:00:00")
        buckets[key] = round(buckets.get(key, 0.0) + (r.value * 60), 1)  # litres per hour

    return [{"time": k, "value": v} for k, v in sorted(buckets.items())]


@router.get("/alerts", response_model=list[WaterAlertOut])
def list_alerts(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(WaterAlert)
    if status:
        q = q.filter(WaterAlert.status == status)
    return q.order_by(WaterAlert.created_at.desc()).all()


@router.post("/simulate/leak", response_model=WaterAlertOut)
def simulate_leak(body: LeakSimulationRequest, db: Session = Depends(get_db)):
    building = db.query(Building).filter(Building.id == body.building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    alert = WaterAlert(
        building_id=body.building_id,
        alert_type="suspected_leak",
        flow_lpm=body.flow_lpm,
        threshold_lpm=body.threshold_lpm,
        severity=body.severity,
        status="open",
        detection_reason=f"[SIMULATION] Flow rate {body.flow_lpm} LPM exceeds threshold {body.threshold_lpm} LPM by {((body.flow_lpm/body.threshold_lpm)-1)*100:.0f}%.",
        recommended_action="Inspect the supply line and check for visible leaks or running fixtures.",
    )
    db.add(alert)

    # Update building status
    if body.severity in ("high", "critical"):
        building.status = "critical"
    else:
        building.status = "warning"
    building.updated_at = datetime.utcnow()

    # Create maintenance ticket
    ticket = MaintenanceTicket(
        building_id=body.building_id,
        ticket_type="water",
        title=f"[SIMULATION] Suspected water leak — {building.name}",
        description=f"Flow rate {body.flow_lpm} LPM detected, exceeding threshold {body.threshold_lpm} LPM.",
        priority=body.severity,
        status="open",
        ref_incident_type="water",
    )
    db.add(ticket)
    db.commit()
    db.refresh(alert)
    return alert


@router.patch("/alerts/{alert_id}", response_model=WaterAlertOut)
def update_alert(alert_id: int, body: AlertStatusUpdate, db: Session = Depends(get_db)):
    alert = db.query(WaterAlert).filter(WaterAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    valid = {"open", "investigating", "confirmed", "resolved"}
    if body.status not in valid:
        raise HTTPException(status_code=422, detail=f"Status must be one of {valid}")
    alert.status = body.status
    if body.status == "resolved":
        alert.resolved_at = datetime.utcnow()
        # Update building status if no more open alerts
        if alert.building_id:
            remaining = db.query(WaterAlert).filter(
                WaterAlert.building_id == alert.building_id,
                WaterAlert.status != "resolved",
                WaterAlert.id != alert.id,
            ).count()
            if remaining == 0:
                b = db.query(Building).filter(Building.id == alert.building_id).first()
                if b:
                    b.status = "normal"
                    b.updated_at = datetime.utcnow()
    alert.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert
