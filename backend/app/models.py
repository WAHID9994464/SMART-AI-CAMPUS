"""
SQLAlchemy ORM Models for Smart AI Campus.
All tables use explicit names, foreign keys, and timestamps.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base


def now() -> datetime:
    return datetime.utcnow()


# ---------------------------------------------------------------------------
# Buildings
# ---------------------------------------------------------------------------
class Building(Base):
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    floors = Column(Integer, default=1)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    # 3D twin position
    pos_x = Column(Float, default=0.0)
    pos_z = Column(Float, default=0.0)
    status = Column(String(32), default="normal")  # normal | warning | critical | idle
    image_key = Column(String(128), nullable=True)  # asset key
    category = Column(String(64), default="Academic", nullable=True)

    rooms = relationship("Room", back_populates="building", cascade="all, delete-orphan")
    sensors = relationship("Sensor", back_populates="building", cascade="all, delete-orphan")
    water_alerts = relationship("WaterAlert", back_populates="building")
    waste_incidents = relationship("WasteIncident", back_populates="building")
    energy_events = relationship("EnergySavingEvent", back_populates="building")
    maintenance_tickets = relationship("MaintenanceTicket", back_populates="building")

    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)


# ---------------------------------------------------------------------------
# Rooms
# ---------------------------------------------------------------------------
class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=False)
    code = Column(String(32), index=True, nullable=False)
    name = Column(String(128), nullable=False)
    floor = Column(Integer, default=1)
    capacity = Column(Integer, default=30)
    occupied = Column(Boolean, default=False)
    lights_on = Column(Boolean, default=False)
    ac_on = Column(Boolean, default=False)
    projector_on = Column(Boolean, default=False)
    current_load_kw = Column(Float, default=0.0)
    image_key = Column(String(128), nullable=True)
    facility_type = Column(String(64), default="Room", nullable=True)
    description = Column(String(512), nullable=True)
    equipment = Column(String(512), nullable=True)

    building = relationship("Building", back_populates="rooms")
    energy_events = relationship("EnergySavingEvent", back_populates="room")

    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)


# ---------------------------------------------------------------------------
# Sensors
# ---------------------------------------------------------------------------
class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=False)
    code = Column(String(64), unique=True, index=True, nullable=False)
    sensor_type = Column(String(32), nullable=False)  # energy | water | waste | env
    location_desc = Column(String(256), nullable=True)
    unit = Column(String(32), nullable=True)
    active = Column(Boolean, default=True)

    building = relationship("Building", back_populates="sensors")
    readings = relationship("SensorReading", back_populates="sensor", cascade="all, delete-orphan")

    created_at = Column(DateTime, default=now)


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id"), nullable=False)
    value = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=now, index=True)

    sensor = relationship("Sensor", back_populates="readings")


# ---------------------------------------------------------------------------
# Cameras
# ---------------------------------------------------------------------------
class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    location = Column(String(256), nullable=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=True)
    stream_url = Column(String(512), nullable=True)  # never returned to frontend raw
    status = Column(String(32), default="demo")  # demo | connected | offline | unconfigured
    last_seen = Column(DateTime, nullable=True)

    detections = relationship("DetectionRecord", back_populates="camera", foreign_keys="DetectionRecord.camera_id")

    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)


# ---------------------------------------------------------------------------
# CV Detection Records
# ---------------------------------------------------------------------------
class DetectionRecord(Base):
    __tablename__ = "detection_records"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=True)
    image_path = Column(String(512), nullable=True)
    detections_json = Column(Text, nullable=True)  # JSON list of detection objects
    processing_mode = Column(String(32), default="demo")  # demo | opencv | yolo
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=True)
    incident_created = Column(Boolean, default=False)
    recorded_at = Column(DateTime, default=now, index=True)

    camera = relationship("Camera", back_populates="detections", foreign_keys=[camera_id])


# ---------------------------------------------------------------------------
# Waste Incidents
# ---------------------------------------------------------------------------
class WasteIncident(Base):
    __tablename__ = "waste_incidents"

    id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=True)
    location_desc = Column(String(256), nullable=True)
    category = Column(String(64), default="general")  # plastic | paper | organic | general | overflow
    severity = Column(String(32), default="low")  # low | medium | high | critical
    fill_level = Column(Float, default=0.0)  # 0-100 %
    status = Column(String(32), default="open")  # open | assigned | resolved
    detection_record_id = Column(Integer, ForeignKey("detection_records.id"), nullable=True)
    notes = Column(Text, nullable=True)
    assigned_to = Column(String(128), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now, index=True)
    updated_at = Column(DateTime, default=now, onupdate=now)

    building = relationship("Building", back_populates="waste_incidents")


# ---------------------------------------------------------------------------
# Water Alerts
# ---------------------------------------------------------------------------
class WaterAlert(Base):
    __tablename__ = "water_alerts"

    id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=True)
    alert_type = Column(String(64), default="suspected_leak")  # suspected_leak | confirmed_leak | high_usage
    flow_lpm = Column(Float, nullable=True)       # litres per minute
    threshold_lpm = Column(Float, nullable=True)
    severity = Column(String(32), default="medium")
    status = Column(String(32), default="open")   # open | investigating | confirmed | resolved
    detection_reason = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now, index=True)
    updated_at = Column(DateTime, default=now, onupdate=now)

    building = relationship("Building", back_populates="water_alerts")


# ---------------------------------------------------------------------------
# Energy Saving Events
# ---------------------------------------------------------------------------
class EnergySavingEvent(Base):
    __tablename__ = "energy_saving_events"

    id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    before_load_kw = Column(Float, nullable=False)
    after_load_kw = Column(Float, nullable=False)
    reduction_kw = Column(Float, nullable=False)
    duration_hours = Column(Float, nullable=False)
    energy_saved_kwh = Column(Float, nullable=False)
    cost_saved_inr = Column(Float, nullable=False)
    co2_avoided_kg = Column(Float, nullable=False)
    tariff_used = Column(Float, nullable=False)
    emission_factor_used = Column(Float, nullable=False)
    simulation_mode = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now, index=True)

    building = relationship("Building", back_populates="energy_events")
    room = relationship("Room", back_populates="energy_events")


# ---------------------------------------------------------------------------
# Maintenance Tickets
# ---------------------------------------------------------------------------
class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"

    id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=True)
    ticket_type = Column(String(64), nullable=False)  # energy | water | waste | general
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(32), default="medium")   # low | medium | high | critical
    status = Column(String(32), default="open")       # open | in_progress | resolved | closed
    assigned_to = Column(String(128), nullable=True)
    ref_incident_id = Column(Integer, nullable=True)
    ref_incident_type = Column(String(64), nullable=True)  # waste | water | energy
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now, index=True)
    updated_at = Column(DateTime, default=now, onupdate=now)

    building = relationship("Building", back_populates="maintenance_tickets")


# ---------------------------------------------------------------------------
# Sustainability Reports
# ---------------------------------------------------------------------------
class SustainabilityReport(Base):
    __tablename__ = "sustainability_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String(32), default="daily")  # daily | weekly
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    total_energy_kwh = Column(Float, default=0.0)
    energy_saved_kwh = Column(Float, default=0.0)
    cost_saved_inr = Column(Float, default=0.0)
    co2_avoided_kg = Column(Float, default=0.0)
    total_water_litres = Column(Float, default=0.0)
    water_incidents = Column(Integer, default=0)
    waste_incidents = Column(Integer, default=0)
    open_tickets = Column(Integer, default=0)
    resolved_tickets = Column(Integer, default=0)
    solar_generated_kwh = Column(Float, default=0.0)
    solar_consumed_kwh = Column(Float, default=0.0)
    solar_cost_saved_inr = Column(Float, default=0.0)
    solar_co2_avoided_kg = Column(Float, default=0.0)
    solar_contribution_pct = Column(Float, default=0.0)
    recommendations = Column(Text, nullable=True)
    generated_by = Column(String(64), default="system")  # system | gemini
    created_at = Column(DateTime, default=now)


# ---------------------------------------------------------------------------
# App Settings (key-value store)
# ---------------------------------------------------------------------------
class AppSetting(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True)
    key = Column(String(128), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    value_type = Column(String(32), default="string")  # string | float | int | bool
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=now, onupdate=now)


# ---------------------------------------------------------------------------
# Solar Readings
# ---------------------------------------------------------------------------
class SolarReading(Base):
    __tablename__ = "solar_readings"

    id = Column(Integer, primary_key=True, index=True)
    generated_kwh = Column(Float, nullable=False)  # energy generated in this interval
    power_kw = Column(Float, nullable=False)        # instantaneous power output
    consumed_kwh = Column(Float, nullable=False)     # solar energy consumed on campus
    exported_kwh = Column(Float, default=0.0)        # solar energy exported to grid
    is_simulated = Column(Boolean, default=True)     # True if demonstration data
    recorded_at = Column(DateTime, default=now, index=True)

