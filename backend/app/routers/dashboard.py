"""
Dashboard and Settings routers.
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import ESTIMATED_COST_SAVED_INR
from app.models import (
    Building, Room, WaterAlert, WasteIncident,
    EnergySavingEvent, MaintenanceTicket, AppSetting, SensorReading, Sensor
)

router = APIRouter(tags=["dashboard"])


class DashboardKPIs(BaseModel):
    total_energy_kwh_today: float
    energy_saved_kwh_today: float
    estimated_water_litres_today: float
    active_alerts: int
    waste_incidents: int
    co2_avoided_kg_today: float
    current_load_kw: float
    cost_saved_inr_today: float


class FeedItem(BaseModel):
    id: str
    type: str  # energy | water | waste | ticket | ai
    title: str
    description: str
    severity: Optional[str]
    building_id: Optional[int]
    building_name: Optional[str]
    created_at: datetime


@router.get("/dashboard/kpis", response_model=DashboardKPIs)
def get_kpis(db: Session = Depends(get_db)):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    energy_events = db.query(EnergySavingEvent).filter(
        EnergySavingEvent.created_at >= today
    ).all()
    energy_saved = sum(e.energy_saved_kwh for e in energy_events)
    cost_saved = ESTIMATED_COST_SAVED_INR + sum(e.cost_saved_inr for e in energy_events)
    co2 = sum(e.co2_avoided_kg for e in energy_events)

    rooms = db.query(Room).all()
    current_load = sum(r.current_load_kw for r in rooms)
    hours_elapsed = max(1, (datetime.utcnow() - today).seconds / 3600)
    total_energy = round(current_load * hours_elapsed, 2)

    # Water estimate
    water_sensors = db.query(Sensor).filter(Sensor.sensor_type == "water").all()
    w_ids = [s.id for s in water_sensors]
    w_readings = db.query(SensorReading).filter(
        SensorReading.sensor_id.in_(w_ids),
        SensorReading.recorded_at >= today
    ).all()
    avg_lpm = (sum(r.value for r in w_readings) / len(w_readings)) if w_readings else 2.0
    water_litres = round(avg_lpm * 60 * hours_elapsed, 0)

    active_alerts = (
        db.query(WaterAlert).filter(WaterAlert.status != "resolved").count()
        + db.query(MaintenanceTicket).filter(
            MaintenanceTicket.status.in_(["open", "in_progress"]),
            MaintenanceTicket.priority.in_(["high", "critical"])
        ).count()
    )

    waste_incidents = db.query(WasteIncident).filter(
        WasteIncident.status != "resolved"
    ).count()

    return DashboardKPIs(
        total_energy_kwh_today=total_energy,
        energy_saved_kwh_today=round(energy_saved, 3),
        estimated_water_litres_today=water_litres,
        active_alerts=active_alerts,
        waste_incidents=waste_incidents,
        co2_avoided_kg_today=round(co2, 4),
        current_load_kw=round(current_load, 2),
        cost_saved_inr_today=round(cost_saved, 2),
    )


@router.get("/dashboard/feed", response_model=list[FeedItem])
def get_feed(limit: int = 30, db: Session = Depends(get_db)):
    items: list[FeedItem] = []
    buildings = {b.id: b.name for b in db.query(Building).all()}

    # Energy events
    for e in db.query(EnergySavingEvent).order_by(EnergySavingEvent.created_at.desc()).limit(10).all():
        items.append(FeedItem(
            id=f"energy-{e.id}",
            type="energy",
            title="Energy saving event",
            description=f"Saved {e.energy_saved_kwh:.3f} kWh / ₹{e.cost_saved_inr:.2f} — {e.notes or ''}",
            severity="low",
            building_id=e.building_id,
            building_name=buildings.get(e.building_id) if e.building_id else None,
            created_at=e.created_at,
        ))

    # Water alerts
    for a in db.query(WaterAlert).order_by(WaterAlert.created_at.desc()).limit(10).all():
        items.append(FeedItem(
            id=f"water-{a.id}",
            type="water",
            title=f"Water {a.alert_type.replace('_', ' ').title()}",
            description=a.detection_reason or "Water anomaly detected",
            severity=a.severity,
            building_id=a.building_id,
            building_name=buildings.get(a.building_id) if a.building_id else None,
            created_at=a.created_at,
        ))

    # Waste incidents
    for i in db.query(WasteIncident).order_by(WasteIncident.created_at.desc()).limit(10).all():
        items.append(FeedItem(
            id=f"waste-{i.id}",
            type="waste",
            title=f"Waste incident — {i.category}",
            description=f"Fill level: {i.fill_level}%. {i.notes or ''}",
            severity=i.severity,
            building_id=i.building_id,
            building_name=buildings.get(i.building_id) if i.building_id else None,
            created_at=i.created_at,
        ))

    # Tickets
    for t in db.query(MaintenanceTicket).order_by(MaintenanceTicket.created_at.desc()).limit(10).all():
        items.append(FeedItem(
            id=f"ticket-{t.id}",
            type="ticket",
            title=t.title,
            description=t.description or "",
            severity=t.priority,
            building_id=t.building_id,
            building_name=buildings.get(t.building_id) if t.building_id else None,
            created_at=t.created_at,
        ))

    # Sort by recency
    items.sort(key=lambda x: x.created_at, reverse=True)
    return items[:limit]


@router.get("/dashboard/energy-by-building")
def energy_by_building(db: Session = Depends(get_db)):
    rooms = db.query(Room).all()
    buildings = {b.id: b.name for b in db.query(Building).all()}
    by_building: dict[int, float] = {}
    for r in rooms:
        by_building[r.building_id] = by_building.get(r.building_id, 0.0) + r.current_load_kw
    return [
        {"building": buildings.get(bid, f"Building {bid}"), "load_kw": round(load, 2)}
        for bid, load in by_building.items()
    ]


# ---- Notifications ----

class NotificationItem(BaseModel):
    id: str
    type: str  # water | waste | energy | ticket | building
    title: str
    description: str
    severity: str  # critical | warning | info
    building_id: Optional[int] = None
    building_name: Optional[str] = None
    target_page: str  # water | waste | energy | reports | digital-twin
    timestamp: datetime


@router.get("/notifications", response_model=list[NotificationItem])
def get_notifications(db: Session = Depends(get_db)):
    """Return active campus alerts and notifications for the top-bar notification center."""
    notifications: list[NotificationItem] = []
    buildings = {b.id: b.name for b in db.query(Building).all()}

    # 1. Active Water Alerts
    water_alerts = (
        db.query(WaterAlert)
        .filter(WaterAlert.status != "resolved")
        .order_by(WaterAlert.created_at.desc())
        .limit(10)
        .all()
    )
    for a in water_alerts:
        b_name = buildings.get(a.building_id, "Campus") if a.building_id else "Campus"
        notifications.append(
            NotificationItem(
                id=f"water-{a.id}",
                type="water",
                title=f"Water {a.alert_type.replace('_', ' ').title()}",
                description=f"{a.detection_reason or 'Flow rate anomaly'} ({a.flow_lpm or 0} LPM, {b_name})",
                severity="critical" if a.severity in ("critical", "high") else "warning",
                building_id=a.building_id,
                building_name=b_name,
                target_page="water",
                timestamp=a.created_at,
            )
        )

    # 2. Active Waste Incidents
    waste_incidents = (
        db.query(WasteIncident)
        .filter(WasteIncident.status != "resolved")
        .order_by(WasteIncident.created_at.desc())
        .limit(10)
        .all()
    )
    for w in waste_incidents:
        b_name = buildings.get(w.building_id, "Campus") if w.building_id else "Campus"
        is_crit = w.severity in ("critical", "high") or w.fill_level >= 85
        notifications.append(
            NotificationItem(
                id=f"waste-{w.id}",
                type="waste",
                title=f"Waste Incident: {w.category.title()} Bin",
                description=f"{w.location_desc or 'Bin'} at {w.fill_level:.0f}% capacity ({b_name})",
                severity="critical" if is_crit else "warning",
                building_id=w.building_id,
                building_name=b_name,
                target_page="waste",
                timestamp=w.created_at,
            )
        )

    # 3. Urgent Maintenance Tickets
    tickets = (
        db.query(MaintenanceTicket)
        .filter(
            MaintenanceTicket.status.in_(["open", "in_progress"]),
            MaintenanceTicket.priority.in_(["high", "critical"]),
        )
        .order_by(MaintenanceTicket.created_at.desc())
        .limit(10)
        .all()
    )
    for t in tickets:
        b_name = buildings.get(t.building_id, "Campus") if t.building_id else "Campus"
        notifications.append(
            NotificationItem(
                id=f"ticket-{t.id}",
                type="ticket",
                title=f"Urgent Ticket: {t.title}",
                description=t.description or f"Priority ticket in {b_name}",
                severity="critical" if t.priority == "critical" else "warning",
                building_id=t.building_id,
                building_name=b_name,
                target_page="reports",
                timestamp=t.created_at,
            )
        )

    # 4. Critical & Warning Buildings
    anomaly_buildings = db.query(Building).filter(Building.status.in_(["warning", "critical"])).all()
    for b in anomaly_buildings:
        notifications.append(
            NotificationItem(
                id=f"building-{b.id}",
                type="building",
                title=f"{b.name} Status Alert",
                description=f"Building status is {b.status}. Review active room loads and HVAC scheduling.",
                severity=b.status,
                building_id=b.id,
                building_name=b.name,
                target_page="digital-twin",
                timestamp=b.updated_at or b.created_at,
            )
        )

    # Sort all notifications newest first
    notifications.sort(key=lambda x: x.timestamp, reverse=True)
    return notifications



# ---- Settings ----
settings_router = APIRouter(prefix="/settings", tags=["settings"])


class SettingOut(BaseModel):
    key: str
    value: Optional[str]
    value_type: str
    description: Optional[str]

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    value: str


@settings_router.get("/", response_model=list[SettingOut])
def list_settings(db: Session = Depends(get_db)):
    return db.query(AppSetting).all()


@settings_router.patch("/{key}", response_model=SettingOut)
def update_setting(key: str, body: SettingUpdate, db: Session = Depends(get_db)):
    s = db.query(AppSetting).filter(AppSetting.key == key).first()
    if not s:
        raise HTTPException(status_code=404, detail="Setting not found")
    # Never store credentials as settings
    if "key" in key.lower() or "secret" in key.lower() or "password" in key.lower():
        raise HTTPException(status_code=403, detail="Use environment variables for credentials")
    s.value = body.value
    s.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return s
