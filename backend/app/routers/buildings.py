"""
Buildings and Rooms router.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Building, Room, Sensor, SensorReading

router = APIRouter(prefix="/buildings", tags=["buildings"])


# ---- Pydantic schemas ----
class RoomOut(BaseModel):
    id: int
    code: str
    name: str
    floor: int
    capacity: int
    occupied: bool
    lights_on: bool
    ac_on: bool
    projector_on: bool
    current_load_kw: float
    image_key: Optional[str]
    facility_type: Optional[str] = "Room"
    description: Optional[str] = None
    equipment: Optional[str] = None
    building_id: int

    class Config:
        from_attributes = True


class BuildingOut(BaseModel):
    id: int
    code: str
    name: str
    floors: int
    pos_x: float
    pos_z: float
    status: str
    image_key: Optional[str]
    category: Optional[str] = "Academic"
    rooms: list[RoomOut] = []

    class Config:
        from_attributes = True


class RoomUpdate(BaseModel):
    occupied: Optional[bool] = None
    lights_on: Optional[bool] = None
    ac_on: Optional[bool] = None
    projector_on: Optional[bool] = None
    current_load_kw: Optional[float] = None


class BuildingStatusUpdate(BaseModel):
    status: str  # normal | warning | critical | idle


class SensorOut(BaseModel):
    id: int
    code: str
    sensor_type: str
    location_desc: Optional[str]
    unit: Optional[str]
    active: bool

    class Config:
        from_attributes = True


class ReadingOut(BaseModel):
    id: int
    sensor_id: int
    value: float
    recorded_at: datetime

    class Config:
        from_attributes = True


# ---- Routes ----

@router.get("/", response_model=list[BuildingOut])
def list_buildings(db: Session = Depends(get_db)):
    return db.query(Building).all()


@router.get("/{building_id}", response_model=BuildingOut)
def get_building(building_id: int, db: Session = Depends(get_db)):
    b = db.query(Building).filter(Building.id == building_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
    return b


@router.get("/{building_id}/sensors", response_model=list[SensorOut])
def get_building_sensors(building_id: int, db: Session = Depends(get_db)):
    return db.query(Sensor).filter(Sensor.building_id == building_id).all()


@router.get("/{building_id}/rooms", response_model=list[RoomOut])
def get_building_rooms(building_id: int, db: Session = Depends(get_db)):
    return db.query(Room).filter(Room.building_id == building_id).all()


@router.patch("/{building_id}/status", response_model=BuildingOut)
def update_building_status(building_id: int, body: BuildingStatusUpdate, db: Session = Depends(get_db)):
    b = db.query(Building).filter(Building.id == building_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
    valid_statuses = {"normal", "warning", "critical", "idle"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=422, detail=f"Status must be one of {valid_statuses}")
    b.status = body.status
    b.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(b)
    return b


@router.get("/rooms/all", response_model=list[RoomOut])
def list_all_rooms(db: Session = Depends(get_db)):
    return db.query(Room).all()


@router.get("/rooms/{room_id}", response_model=RoomOut)
def get_room(room_id: int, db: Session = Depends(get_db)):
    r = db.query(Room).filter(Room.id == room_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Room not found")
    return r


@router.patch("/rooms/{room_id}", response_model=RoomOut)
def update_room(room_id: int, body: RoomUpdate, db: Session = Depends(get_db)):
    r = db.query(Room).filter(Room.id == room_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Room not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(r, field, val)
    r.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(r)
    return r


@router.get("/sensors/{sensor_id}/readings", response_model=list[ReadingOut])
def get_sensor_readings(
    sensor_id: int,
    hours: int = 24,
    db: Session = Depends(get_db),
):
    from datetime import timedelta
    since = datetime.utcnow() - timedelta(hours=hours)
    readings = (
        db.query(SensorReading)
        .filter(SensorReading.sensor_id == sensor_id, SensorReading.recorded_at >= since)
        .order_by(SensorReading.recorded_at.asc())
        .all()
    )
    return readings
