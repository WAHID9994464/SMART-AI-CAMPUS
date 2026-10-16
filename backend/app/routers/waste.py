"""
Waste Management router.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import WasteIncident, Building, MaintenanceTicket

router = APIRouter(prefix="/waste", tags=["waste"])


class WasteIncidentOut(BaseModel):
    id: int
    building_id: Optional[int]
    location_desc: Optional[str]
    category: str
    severity: str
    fill_level: float
    status: str
    notes: Optional[str]
    assigned_to: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreateWasteIncident(BaseModel):
    building_id: Optional[int] = None
    location_desc: Optional[str] = None
    category: str = "general"
    severity: str = "medium"
    fill_level: float = 75.0
    notes: Optional[str] = None


class UpdateWasteIncident(BaseModel):
    fill_level: Optional[float] = None
    status: Optional[str] = None
    severity: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


class WasteDashboard(BaseModel):
    total_incidents: int
    open_incidents: int
    critical_incidents: int
    resolved_today: int
    open_tickets: int
    avg_fill_level: float


@router.get("/dashboard", response_model=WasteDashboard)
def waste_dashboard(db: Session = Depends(get_db)):
    all_incidents = db.query(WasteIncident).all()
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    resolved_today = sum(
        1 for i in all_incidents
        if i.status == "resolved" and i.resolved_at and i.resolved_at >= today_start
    )
    open_inc = [i for i in all_incidents if i.status != "resolved"]
    critical = sum(1 for i in open_inc if i.severity == "critical")
    avg_fill = (sum(i.fill_level for i in open_inc) / len(open_inc)) if open_inc else 0.0

    open_tickets = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.ticket_type == "waste",
        MaintenanceTicket.status.in_(["open", "in_progress"])
    ).count()

    return WasteDashboard(
        total_incidents=len(all_incidents),
        open_incidents=len(open_inc),
        critical_incidents=critical,
        resolved_today=resolved_today,
        open_tickets=open_tickets,
        avg_fill_level=round(avg_fill, 1),
    )


@router.get("/incidents", response_model=list[WasteIncidentOut])
def list_incidents(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(WasteIncident)
    if status:
        q = q.filter(WasteIncident.status == status)
    return q.order_by(WasteIncident.created_at.desc()).all()


@router.post("/incidents", response_model=WasteIncidentOut)
def create_incident(body: CreateWasteIncident, db: Session = Depends(get_db)):
    if body.building_id:
        building = db.query(Building).filter(Building.id == body.building_id).first()
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        # Update building status if critical
        if body.severity == "critical" and building.status != "critical":
            building.status = "critical"
            building.updated_at = datetime.utcnow()

    incident = WasteIncident(**body.model_dump())
    db.add(incident)
    db.flush()

    # Create maintenance ticket for high/critical
    if body.severity in ("high", "critical"):
        ticket = MaintenanceTicket(
            building_id=body.building_id,
            ticket_type="waste",
            title=f"Waste collection required — {body.location_desc or 'Unknown location'}",
            description=f"Fill level: {body.fill_level}%. Category: {body.category}.",
            priority=body.severity,
            status="open",
            ref_incident_id=incident.id,
            ref_incident_type="waste",
        )
        db.add(ticket)

    db.commit()
    db.refresh(incident)
    return incident


@router.patch("/incidents/{incident_id}", response_model=WasteIncidentOut)
def update_incident(incident_id: int, body: UpdateWasteIncident, db: Session = Depends(get_db)):
    incident = db.query(WasteIncident).filter(WasteIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(incident, field, val)
    if body.status == "resolved":
        incident.resolved_at = datetime.utcnow()
    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)
    return incident
