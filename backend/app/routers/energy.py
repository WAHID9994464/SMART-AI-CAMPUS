"""
Energy Management router.
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Room, Building, EnergySavingEvent, MaintenanceTicket
from app.config import ELECTRICITY_TARIFF, GRID_EMISSION_FACTOR

router = APIRouter(prefix="/energy", tags=["energy"])


# ---- schemas ----
class SimulationRequest(BaseModel):
    room_id: int
    duration_hours: float = 1.0
    tariff: Optional[float] = None
    emission_factor: Optional[float] = None


class SimulationResult(BaseModel):
    room_id: int
    room_name: str
    before_load_kw: float
    after_load_kw: float
    reduction_kw: float
    duration_hours: float
    energy_saved_kwh: float
    cost_saved_inr: float
    co2_avoided_kg: float
    tariff_used: float
    emission_factor_used: float
    equipment_turned_off: list[str]
    notes: str
    event_id: int


class EnergyEventOut(BaseModel):
    id: int
    building_id: Optional[int]
    room_id: Optional[int]
    before_load_kw: float
    after_load_kw: float
    reduction_kw: float
    duration_hours: float
    energy_saved_kwh: float
    cost_saved_inr: float
    co2_avoided_kg: float
    simulation_mode: bool
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardMetrics(BaseModel):
    total_energy_kwh_today: float
    energy_saved_kwh_today: float
    cost_saved_inr_today: float
    co2_avoided_kg_today: float
    current_load_kw: float
    rooms_occupied: int = 0
    rooms_total: int = 0
    lights_on: int = 0
    ac_on: int = 0
    projectors_on: int = 0
    vacant_wasting_rooms: int = 0
    estimated_cost_per_hour_inr: float = 0.0


# ---- helpers ----

def _room_base_load(room: Room) -> float:
    """Estimate base load from room equipment state."""
    load = 0.0
    if room.lights_on:
        load += 0.5 * max(1, room.capacity // 20)
    if room.ac_on:
        load += 1.5 * max(1, room.capacity // 30)
    if room.projector_on:
        load += 0.4
    return round(load, 2)


def _calculate_savings(
    before_kw: float,
    after_kw: float,
    duration_hours: float,
    tariff: float,
    ef: float,
) -> dict:
    reduction = max(0.0, round(before_kw - after_kw, 3))
    saved_kwh = round(reduction * duration_hours, 4)
    cost_saved = round(saved_kwh * tariff, 2)
    co2 = round(saved_kwh * ef, 4)
    return {
        "reduction_kw": reduction,
        "energy_saved_kwh": saved_kwh,
        "cost_saved_inr": cost_saved,
        "co2_avoided_kg": co2,
    }


# ---- routes ----

@router.get("/dashboard", response_model=DashboardMetrics)
def energy_dashboard(db: Session = Depends(get_db)):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    events = db.query(EnergySavingEvent).filter(EnergySavingEvent.created_at >= today_start).all()

    saved_kwh = sum(e.energy_saved_kwh for e in events)
    cost_saved = sum(e.cost_saved_inr for e in events)
    co2 = sum(e.co2_avoided_kg for e in events)

    # Estimate total consumption from all room loads
    rooms = db.query(Room).all()
    current_load = sum(r.current_load_kw for r in rooms)

    # Additional stats
    rooms_occupied = sum(1 for r in rooms if r.occupied)
    rooms_total = len(rooms)
    lights_on = sum(1 for r in rooms if r.lights_on)
    ac_on = sum(1 for r in rooms if r.ac_on)
    projectors_on = sum(1 for r in rooms if r.projector_on)
    vacant_wasting = sum(1 for r in rooms if not r.occupied and (r.lights_on or r.ac_on or r.projector_on))
    cost_per_hour = round(current_load * ELECTRICITY_TARIFF, 2)

    # Rough daily kwh estimate (hours since midnight)
    hours_elapsed = max(1, (datetime.utcnow() - today_start).seconds / 3600)
    total_kwh = round(current_load * hours_elapsed, 2)

    return DashboardMetrics(
        total_energy_kwh_today=total_kwh,
        energy_saved_kwh_today=round(saved_kwh, 3),
        cost_saved_inr_today=round(cost_saved, 2),
        co2_avoided_kg_today=round(co2, 4),
        current_load_kw=round(current_load, 2),
        rooms_occupied=rooms_occupied,
        rooms_total=rooms_total,
        lights_on=lights_on,
        ac_on=ac_on,
        projectors_on=projectors_on,
        vacant_wasting_rooms=vacant_wasting,
        estimated_cost_per_hour_inr=cost_per_hour,
    )


@router.post("/simulate", response_model=SimulationResult)
def run_energy_simulation(body: SimulationRequest, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == body.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    tariff = body.tariff or ELECTRICITY_TARIFF
    ef = body.emission_factor or GRID_EMISSION_FACTOR
    duration = max(0.1, body.duration_hours)

    before_kw = room.current_load_kw
    equipment_off = []

    # Turn off non-essential equipment in vacant rooms
    after_kw = before_kw
    if not room.occupied:
        if room.lights_on:
            room.lights_on = False
            after_kw -= 0.5 * max(1, room.capacity // 20)
            equipment_off.append("Lights")
        if room.ac_on:
            room.ac_on = False
            after_kw -= 1.5 * max(1, room.capacity // 30)
            equipment_off.append("Air Conditioning")
        if room.projector_on:
            room.projector_on = False
            after_kw -= 0.4
            equipment_off.append("Projector / Smart Board")
    else:
        # If occupied, only turn off projector if not in use
        if room.projector_on:
            room.projector_on = False
            after_kw -= 0.4
            equipment_off.append("Projector (idle detection)")

    after_kw = max(0.1, round(after_kw, 2))
    room.current_load_kw = after_kw
    room.updated_at = datetime.utcnow()

    calcs = _calculate_savings(before_kw, after_kw, duration, tariff, ef)

    if calcs["reduction_kw"] <= 0:
        notes = f"[SIMULATION] Room {room.name} is already optimised at {after_kw} kW. No non-essential equipment was active."
        db.commit()
        return SimulationResult(
            room_id=room.id,
            room_name=room.name,
            before_load_kw=before_kw,
            after_load_kw=after_kw,
            reduction_kw=0.0,
            duration_hours=duration,
            energy_saved_kwh=0.0,
            cost_saved_inr=0.0,
            co2_avoided_kg=0.0,
            tariff_used=tariff,
            emission_factor_used=ef,
            equipment_turned_off=[],
            notes=notes,
            event_id=0,
        )

    notes = (
        f"[SIMULATION] Turned off: {', '.join(equipment_off) if equipment_off else 'No changes'}. "
        f"Duration {duration}h. Reduced load from {before_kw} kW to {after_kw} kW."
    )

    event = EnergySavingEvent(
        building_id=room.building_id,
        room_id=room.id,
        before_load_kw=before_kw,
        after_load_kw=after_kw,
        reduction_kw=calcs["reduction_kw"],
        duration_hours=duration,
        energy_saved_kwh=calcs["energy_saved_kwh"],
        cost_saved_inr=calcs["cost_saved_inr"],
        co2_avoided_kg=calcs["co2_avoided_kg"],
        tariff_used=tariff,
        emission_factor_used=ef,
        simulation_mode=True,
        notes=notes,
    )
    db.add(event)

    # Update building status
    building = db.query(Building).filter(Building.id == room.building_id).first()
    if building and calcs["reduction_kw"] > 0:
        if building.status == "critical":
            pass  # Don't downgrade critical
        else:
            building.status = "normal"
            building.updated_at = datetime.utcnow()

    # Auto-create maintenance ticket if meaningful savings were found
    if calcs["reduction_kw"] > 0.5 and equipment_off:
        ticket = MaintenanceTicket(
            building_id=room.building_id,
            ticket_type="energy",
            title=f"[SIMULATION] Energy optimisation — {room.name}",
            description=f"Simulation turned off: {', '.join(equipment_off)}. Estimated savings: {calcs['energy_saved_kwh']:.2f} kWh.",
            priority="low",
            status="resolved",
            ref_incident_id=None,
            ref_incident_type="energy",
        )
        db.add(ticket)

    db.commit()
    db.refresh(event)

    return SimulationResult(
        room_id=room.id,
        room_name=room.name,
        before_load_kw=before_kw,
        after_load_kw=after_kw,
        reduction_kw=calcs["reduction_kw"],
        duration_hours=duration,
        energy_saved_kwh=calcs["energy_saved_kwh"],
        cost_saved_inr=calcs["cost_saved_inr"],
        co2_avoided_kg=calcs["co2_avoided_kg"],
        tariff_used=tariff,
        emission_factor_used=ef,
        equipment_turned_off=equipment_off,
        notes=notes,
        event_id=event.id,
    )


@router.get("/events", response_model=list[EnergyEventOut])
def list_energy_events(limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(EnergySavingEvent)
        .order_by(EnergySavingEvent.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/hourly")
def hourly_energy(hours: int = 24, campus_hours: bool = False, db: Session = Depends(get_db)):
    """Return hourly simulated energy consumption for charts."""
    from app.models import SensorReading, Sensor
    now = datetime.utcnow()
    since = now - timedelta(hours=hours)

    energy_sensors = db.query(Sensor).filter(Sensor.sensor_type == "energy").all()
    sensor_ids = [s.id for s in energy_sensors]

    readings = (
        db.query(SensorReading)
        .filter(
            SensorReading.sensor_id.in_(sensor_ids),
            SensorReading.recorded_at >= since,
        )
        .order_by(SensorReading.recorded_at.asc())
        .all()
    )

    if campus_hours:
        ist_offset = timedelta(hours=5, minutes=30)
        readings = [
            r for r in readings
            if 8 <= (r.recorded_at + ist_offset).hour <= 16
        ]

    # Bucket by hour
    buckets: dict[str, float] = {}
    for r in readings:
        key = r.recorded_at.strftime("%Y-%m-%dT%H:00:00")
        buckets[key] = round(buckets.get(key, 0.0) + r.value, 2)

    result = [{"time": k, "value": v} for k, v in sorted(buckets.items())]
    return result
