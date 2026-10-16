"""
Seed data initialization for Smart AI Campus.
Creates tables and populates them with sample buildings, rooms, sensors, cameras, and solar telemetry.
Idempotent: will not duplicate records if run multiple times.
"""
from datetime import datetime, timedelta
import math
import random
from sqlalchemy.orm import Session
from app.models import (
    Building, Room, Sensor, SensorReading, Camera,
    WasteIncident, WaterAlert, EnergySavingEvent,
    MaintenanceTicket, AppSetting, SolarReading
)
from app.config import ELECTRICITY_TARIFF, GRID_EMISSION_FACTOR


BUILDINGS_SEED = [
    {
        "code": "ACAD-A",
        "name": "School of Engineering",
        "floors": 3,
        "pos_x": 0.0,
        "pos_z": -2.0,
        "status": "normal",
        "image_key": "School Of Engineering (2).jpg",
        "category": "Academic",
        "rooms": [
            # Ground Floor — Library (floor 0)
            {
                "code": "SOE-LIB-01",
                "name": "Central Library & Stack Area",
                "floor": 0,
                "capacity": 120,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": False,
                "current_load_kw": 4.5,
                "image_key": "library",
                "facility_type": "Library",
                "description": "Main campus library housing academic book-shelf rows, quiet reading tables, and core reference archives.",
                "equipment": "Book-shelf rows, study desks with reading lamps, reference catalogue terminals, acoustic baffles",
            },
            {
                "code": "SOE-LIB-02",
                "name": "Librarian Desk & Circulation Counter",
                "floor": 0,
                "capacity": 15,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": False,
                "current_load_kw": 1.8,
                "image_key": "library",
                "facility_type": "Reception & Circulation",
                "description": "Entrance reception, book issue/return counter, student assistance desk, and catalogue search terminals.",
                "equipment": "Librarian service desk, RFID issue kiosk, barcode scanners, digital management computer",
            },
            {
                "code": "SOE-LIB-03",
                "name": "Digital Learning & E-Resource Lab",
                "floor": 0,
                "capacity": 40,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": True,
                "current_load_kw": 6.2,
                "image_key": "Dennis M. Ritchie Common Computer Lab.jpg",
                "facility_type": "Digital Learning",
                "description": "Computer and digital-learning section providing high-speed access to online journals and research portals.",
                "equipment": "25 Computer terminals, high-speed internet, digital catalogue screens, laser printer",
            },
            {
                "code": "SOE-LIB-04",
                "name": "Reference & Book Storage Area",
                "floor": 0,
                "capacity": 25,
                "occupied": False,
                "lights_on": False,
                "ac_on": True,
                "projector_on": False,
                "current_load_kw": 0.8,
                "image_key": "library",
                "facility_type": "Archive",
                "description": "High-density reference stacks, archival literature, research theses, and technical publications.",
                "equipment": "Compact mobile shelving rows, document preservation dehumidifier, microform reader",
            },
            {
                "code": "SOE-LIB-05",
                "name": "Reading & Waiting Lounge",
                "floor": 0,
                "capacity": 30,
                "occupied": True,
                "lights_on": True,
                "ac_on": False,
                "projector_on": False,
                "current_load_kw": 1.2,
                "image_key": "library",
                "facility_type": "Study Lounge",
                "description": "Comfortable seating and waiting area near the library entrance for relaxed reading and discussion.",
                "equipment": "Upholstered lounge armchairs, coffee tables, newspaper & periodical display racks",
            },

            # First Floor — Engineering Laboratories (floor 1, 8 rooms)
            {
                "code": "SOE-LAB-01",
                "name": "Computer Programming Lab",
                "floor": 1,
                "capacity": 45,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": True,
                "current_load_kw": 8.5,
                "image_key": "Dennis M. Ritchie Common Computer Lab(3).jpg",
                "facility_type": "Computer Lab",
                "description": "Dedicated laboratory for software engineering, object-oriented programming, and algorithms coursework.",
                "equipment": "45 Developer workstations, dual-boot Linux/Win OS, overhead digital projector, Gigabit network switch",
            },
            {
                "code": "SOE-LAB-02",
                "name": "AI and Machine Learning Lab",
                "floor": 1,
                "capacity": 40,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": True,
                "current_load_kw": 12.4,
                "image_key": "Dennis M. Ritchie Common Computer Lab.jpg",
                "facility_type": "AI / ML Lab",
                "description": "High-performance GPU cluster lab for training deep learning models, neural networks, and computer vision models.",
                "equipment": "NVIDIA RTX GPU workstations, high-throughput NAS server, smart interactive monitor",
            },
            {
                "code": "SOE-LAB-03",
                "name": "Data Science Lab",
                "floor": 1,
                "capacity": 40,
                "occupied": False,
                "lights_on": True,
                "ac_on": True,
                "projector_on": False,
                "current_load_kw": 5.8,
                "image_key": "Dennis M. Ritchie Common Computer Lab.jpg",
                "facility_type": "Data Science Lab",
                "description": "Analytics laboratory dedicated to data mining, statistical modelling, and big data pipeline engineering.",
                "equipment": "High-RAM workstations, Apache Spark/Hadoop cluster interface, visualization wall displays",
            },
            {
                "code": "SOE-LAB-04",
                "name": "Electronics Lab",
                "floor": 1,
                "capacity": 35,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": False,
                "current_load_kw": 7.2,
                "image_key": "Subrahmanyan Chandrasekhar Physics Lab.jpg",
                "facility_type": "Electronics Lab",
                "description": "Hands-on electrical and electronics experimentation lab for analog/digital circuit design and signal testing.",
                "equipment": "Digital storage oscilloscopes, function generators, bench power supplies, multimeters, soldering stations",
            },
            {
                "code": "SOE-LAB-05",
                "name": "Hardware and Embedded Systems Lab",
                "floor": 1,
                "capacity": 35,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": False,
                "current_load_kw": 6.9,
                "image_key": "Subrahmanyan Chandrasekhar Physics Lab(1).jpg",
                "facility_type": "Hardware Lab",
                "description": "Embedded microprocessor, microcontroller, and FPGA development laboratory for robotics and cyber-physical systems.",
                "equipment": "ARM Cortex boards, Arduino/ESP32 kits, logic analyzers, FPGA development boards, sensor arrays",
            },
            {
                "code": "SOE-LAB-06",
                "name": "Project and Innovation Lab",
                "floor": 1,
                "capacity": 30,
                "occupied": False,
                "lights_on": False,
                "ac_on": False,
                "projector_on": False,
                "current_load_kw": 0.2,
                "image_key": "Venkatraman Ramakrishnan Chemistry Lab.jpg",
                "facility_type": "Innovation Lab",
                "description": "Multidisciplinary innovation hub for student capstone projects, hackathons, and hardware prototyping.",
                "equipment": "3D printers, laser engraver, PCB prototyping router, power tools, modular workbenches",
            },
            {
                "code": "SOE-LAB-07",
                "name": "Laboratory Store",
                "floor": 1,
                "capacity": 10,
                "occupied": False,
                "lights_on": False,
                "ac_on": False,
                "projector_on": False,
                "current_load_kw": 0.1,
                "image_key": "Subrahmanyan Chandrasekhar Physics Lab.jpg",
                "facility_type": "Storage Facility",
                "description": "Central secure component repository for electronic sensors, replacement modules, and consumable project supplies.",
                "equipment": "ESD component storage cabinets, barcode inventory tracking, heavy-duty shelving units",
            },
            {
                "code": "SOE-LAB-08",
                "name": "Faculty or Lab Instructor Room",
                "floor": 1,
                "capacity": 12,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": False,
                "current_load_kw": 2.4,
                "image_key": "tutorial-room",
                "facility_type": "Faculty Office",
                "description": "Workspace for laboratory directors, technical superintendents, and teaching assistants.",
                "equipment": "Instructor computer desks, file cabinets, testing bench, intercom communication hub",
            },

            # Second Floor — Classrooms (floor 2, 8 rooms)
            {
                "code": "SOE-CLS-201",
                "name": "Classroom 201",
                "floor": 2,
                "capacity": 60,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": True,
                "current_load_kw": 4.8,
                "image_key": "classroom",
                "facility_type": "Classroom",
                "description": "Standard engineering lecture classroom with ergonomic student tiered seating and audiovisual amenities.",
                "equipment": "High-lumen laser projector, motorized projection screen, teaching podium with mic, whiteboards",
            },
            {
                "code": "SOE-CLS-202",
                "name": "Classroom 202",
                "floor": 2,
                "capacity": 60,
                "occupied": False,
                "lights_on": True,
                "ac_on": True,
                "projector_on": True,
                "current_load_kw": 4.9,
                "image_key": "classroom",
                "facility_type": "Classroom",
                "description": "Engineering lecture hall with energy-saving occupancy sensors and motorized blackout blinds.",
                "equipment": "Ultra-short-throw projector, interactive whiteboard, ceiling speaker array, wireless presentation receiver",
            },
            {
                "code": "SOE-CLS-203",
                "name": "Classroom 203",
                "floor": 2,
                "capacity": 60,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": False,
                "current_load_kw": 3.6,
                "image_key": "classroom",
                "facility_type": "Classroom",
                "description": "Lecture room optimized for technical math, theory of computation, and engineering analysis lectures.",
                "equipment": "Dual magnetic chalkboards, digital podium, automated environmental HVAC damper, student desks",
            },
            {
                "code": "SOE-CLS-204",
                "name": "Classroom 204",
                "floor": 2,
                "capacity": 60,
                "occupied": False,
                "lights_on": False,
                "ac_on": False,
                "projector_on": False,
                "current_load_kw": 0.1,
                "image_key": "classroom",
                "facility_type": "Classroom",
                "description": "Multi-utility lecture hall with movable lecture tables for reconfigurable classroom setups.",
                "equipment": "Modular student study desks, ceiling projector, glass whiteboard, natural daylight harvesting louvers",
            },
            {
                "code": "SOE-CLS-SMART",
                "name": "Smart Classroom",
                "floor": 2,
                "capacity": 50,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": True,
                "current_load_kw": 5.5,
                "image_key": "classroom",
                "facility_type": "Smart Classroom",
                "description": "Next-generation smart learning suite featuring 4K interactive digital touchscreens and hybrid lecture streaming.",
                "equipment": "86-inch 4K Interactive Touchscreen, dual auto-tracking PTZ cameras, beamforming mic array, hybrid lecture stream server",
            },
            {
                "code": "SOE-CLS-SEM",
                "name": "Seminar Room",
                "floor": 2,
                "capacity": 80,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": True,
                "current_load_kw": 7.0,
                "image_key": "tutorial-room",
                "facility_type": "Seminar Room",
                "description": "Executive conference and seminar hall for departmental dissertations, guest keynotes, and colloquiums.",
                "equipment": "Dual 75-inch commercial displays, wireless delegate mics, video conferencing codec, executive leather seating",
            },
            {
                "code": "SOE-CLS-FAC",
                "name": "Faculty Room",
                "floor": 2,
                "capacity": 20,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": False,
                "current_load_kw": 3.2,
                "image_key": "tutorial-room",
                "facility_type": "Faculty Room",
                "description": "Department faculty workstation suites, consultation cubicles, and faculty discussion lounge.",
                "equipment": "20 Faculty workstations, high-speed network, laser printer, private meeting corner, secure storage lockers",
            },
            {
                "code": "SOE-CLS-DISC",
                "name": "Student Discussion and Collaboration Area",
                "floor": 2,
                "capacity": 40,
                "occupied": True,
                "lights_on": True,
                "ac_on": True,
                "projector_on": False,
                "current_load_kw": 2.8,
                "image_key": "Cafeteria.jpg",
                "facility_type": "Collaboration Space",
                "description": "Open-plan student collaborative commons with breakout pods, whiteboard partitions, and mobile device charging.",
                "equipment": "Modular breakout tables, dry-erase mobile partitions, charging kiosks, comfortable bench seating",
            },
        ],
        "sensors": [
            {"code": "ACAD-A-E-01", "sensor_type": "energy", "location_desc": "Main DB Panel", "unit": "kWh"},
            {"code": "ACAD-A-W-01", "sensor_type": "water", "location_desc": "Ground floor supply line", "unit": "LPM"},
        ],
    },
    {
        "code": "CAFE",
        "name": "Campus Cafeteria",
        "floors": 2,
        "pos_x": -21.0,
        "pos_z": 7.0,
        "status": "normal",
        "image_key": "Cafeteria.jpg",
        "category": "Food and Dining",
        "rooms": [
            {"code": "CAFE-01", "name": "Main Dining Area", "floor": 1, "capacity": 300, "occupied": True, "lights_on": True, "ac_on": True, "projector_on": False, "current_load_kw": 22.3, "image_key": "Cafeteria.jpg"},
            {"code": "CAFE-KITCHEN", "name": "Kitchen", "floor": 1, "capacity": 20, "occupied": True, "lights_on": True, "ac_on": False, "projector_on": False, "current_load_kw": 35.8, "image_key": None},
            {"code": "CAFE-MEZZ", "name": "Mezzanine Dining Lounge", "floor": 2, "capacity": 60, "occupied": True, "lights_on": True, "ac_on": True, "projector_on": False, "current_load_kw": 4.5, "image_key": None},
        ],
        "sensors": [
            {"code": "CAFE-E-01", "sensor_type": "energy", "location_desc": "Main panel", "unit": "kWh"},
            {"code": "CAFE-W-01", "sensor_type": "water", "location_desc": "Kitchen supply", "unit": "LPM"},
            {"code": "CAFE-WASTE-01", "sensor_type": "waste", "location_desc": "Waste bins", "unit": "%"},
        ],
    },
    {
        "code": "HEALTH",
        "name": "School of Health Sciences",
        "floors": 4,
        "pos_x": -21.0,
        "pos_z": -17.0,
        "status": "normal",
        "image_key": "School Of Health Sciences.jpg",
        "category": "Academic",
        "rooms": [
            {"code": "HEALTH-101", "name": "Clinical Ward H101", "floor": 1, "capacity": 40, "occupied": True, "lights_on": True, "ac_on": True, "projector_on": False, "current_load_kw": 4.5, "image_key": "classroom"},
            {"code": "HEALTH-201", "name": "Health Sciences Lecture Hall", "floor": 2, "capacity": 100, "occupied": True, "lights_on": True, "ac_on": True, "projector_on": True, "current_load_kw": 8.0, "image_key": "tutorial-room"},
            {"code": "HEALTH-301", "name": "Physiology Laboratory", "floor": 3, "capacity": 30, "occupied": False, "lights_on": False, "ac_on": False, "projector_on": False, "current_load_kw": 0.2, "image_key": None},
        ],
        "sensors": [
            {"code": "HEALTH-E-01", "sensor_type": "energy", "location_desc": "Main Electrical Panel", "unit": "kWh"},
            {"code": "HEALTH-W-01", "sensor_type": "water", "location_desc": "Ground Floor Riser", "unit": "LPM"},
        ],
    },
    {
        "code": "CDSIMER",
        "name": "CDSIMER Hospital",
        "floors": 5,
        "pos_x": 21.0,
        "pos_z": -17.0,
        "status": "warning",
        "image_key": "CDSIMER Entrance.jpg",
        "category": "Healthcare",
        "rooms": [
            {"code": "CDSIMER-101", "name": "Hospital Main Reception", "floor": 1, "capacity": 30, "occupied": True, "lights_on": True, "ac_on": True, "projector_on": False, "current_load_kw": 6.5, "image_key": None},
            {"code": "CDSIMER-102", "name": "Outpatient Clinic OPD", "floor": 1, "capacity": 50, "occupied": True, "lights_on": True, "ac_on": True, "projector_on": False, "current_load_kw": 8.2, "image_key": None},
            {"code": "CDSIMER-201", "name": "Radiology & Imaging Suite", "floor": 2, "capacity": 20, "occupied": True, "lights_on": True, "ac_on": True, "projector_on": True, "current_load_kw": 18.5, "image_key": None},
        ],
        "sensors": [
            {"code": "CDSIMER-E-01", "sensor_type": "energy", "location_desc": "Substation Panel 1", "unit": "kWh"},
            {"code": "CDSIMER-W-01", "sensor_type": "water", "location_desc": "Main Hydro Supply", "unit": "LPM"},
            {"code": "CDSIMER-ENV-01", "sensor_type": "env", "location_desc": "Hospital Air Quality", "unit": "AQI"},
        ],
    },
    {
        "code": "HOSP-ER",
        "name": "Hospital Emergency Block",
        "floors": 3,
        "pos_x": 21.0,
        "pos_z": 7.0,
        "status": "normal",
        "image_key": "Hospital Emergency Block.jpg",
        "category": "Healthcare",
        "rooms": [
            {"code": "HOSP-ER-101", "name": "Emergency Trauma Bay", "floor": 1, "capacity": 25, "occupied": True, "lights_on": True, "ac_on": True, "projector_on": False, "current_load_kw": 16.2, "image_key": None},
            {"code": "HOSP-ER-102", "name": "Intensive Care Unit (ICU)", "floor": 1, "capacity": 15, "occupied": True, "lights_on": True, "ac_on": True, "projector_on": False, "current_load_kw": 22.0, "image_key": None},
            {"code": "HOSP-ER-201", "name": "Critical Care Observation", "floor": 2, "capacity": 20, "occupied": True, "lights_on": True, "ac_on": True, "projector_on": False, "current_load_kw": 12.5, "image_key": None},
        ],
        "sensors": [
            {"code": "HOSP-ER-E-01", "sensor_type": "energy", "location_desc": "Critical UPS DB", "unit": "kWh"},
        ],
    },
]

CAMERAS_SEED = [
    {"code": "CAM-SOE", "name": "School of Engineering", "location": "Engineering Quadrangle", "status": "demo"},
    {"code": "CAM-CAFE", "name": "Campus Cafeteria", "location": "Dining Pavilion", "status": "demo"},
    {"code": "CAM-HEALTH", "name": "School of Health Sciences", "location": "Health Sciences Block", "status": "demo"},
    {"code": "CAM-CDSIMER", "name": "CDSIMER Hospital", "location": "Hospital Main Entrance", "status": "demo"},
    {"code": "CAM-ER", "name": "Hospital Emergency Block", "location": "Emergency & Trauma Care", "status": "demo"},
]

SETTINGS_SEED = [
    {"key": "electricity_tariff", "value": str(ELECTRICITY_TARIFF), "value_type": "float", "description": "Electricity tariff in ₹/kWh"},
    {"key": "grid_emission_factor", "value": str(GRID_EMISSION_FACTOR), "value_type": "float", "description": "Grid CO₂e emission factor in kg/kWh"},
    {"key": "idle_delay_minutes", "value": "30", "value_type": "int", "description": "Minutes before vacant room auto-shutoff simulation"},
    {"key": "simulation_mode", "value": "true", "value_type": "bool", "description": "Whether energy actions are simulations only"},
    {"key": "gemini_model", "value": "gemini-1.5-flash", "value_type": "string", "description": "Gemini model identifier"},
    {"key": "data_refresh_seconds", "value": "30", "value_type": "int", "description": "Dashboard auto-refresh interval"},
]


def seed_database(db: Session) -> None:
    """Idempotent seed: only inserts records that do not already exist."""
    # Seed settings
    for s in SETTINGS_SEED:
        existing = db.query(AppSetting).filter_by(key=s["key"]).first()
        if not existing:
            db.add(AppSetting(**s))

    # Seed buildings
    for bdata in BUILDINGS_SEED:
        rooms_data = bdata.pop("rooms")
        sensors_data = bdata.pop("sensors")

        building = db.query(Building).filter_by(code=bdata["code"]).first()
        if not building:
            building = Building(**bdata)
            db.add(building)
            db.flush()
        else:
            bdata["id"] = building.id  # already exists, skip

        # Seed rooms
        for rdata in rooms_data:
            room = db.query(Room).filter_by(code=rdata["code"]).first()
            if not room:
                rdata["building_id"] = building.id
                db.add(Room(**rdata))

        # Seed sensors
        for sdata in sensors_data:
            sensor = db.query(Sensor).filter_by(code=sdata["code"]).first()
            if not sensor:
                sdata["building_id"] = building.id
                sensor = Sensor(**sdata)
                db.add(sensor)
                db.flush()
                # Add historical readings
                _seed_sensor_readings(db, sensor)

        bdata["rooms"] = rooms_data
        bdata["sensors"] = sensors_data

    # Seed cameras
    for cdata in CAMERAS_SEED:
        cam = db.query(Camera).filter_by(code=cdata["code"]).first()
        if not cam:
            db.add(Camera(**cdata))

    # Seed sample waste incident
    if db.query(WasteIncident).count() == 0:
        cafe = db.query(Building).filter_by(code="CAFE").first()
        if cafe:
            db.add(WasteIncident(
                building_id=cafe.id,
                location_desc="Cafeteria main bins",
                category="organic",
                severity="high",
                fill_level=88.0,
                status="open",
                notes="[SAMPLE] Bins near overflow. Requires urgent collection."
            ))

    # Seed sample water alert
    if db.query(WaterAlert).count() == 0:
        cdsimer = db.query(Building).filter_by(code="CDSIMER").first()
        if cdsimer:
            db.add(WaterAlert(
                building_id=cdsimer.id,
                alert_type="suspected_leak",
                flow_lpm=4.2,
                threshold_lpm=2.0,
                severity="medium",
                status="open",
                detection_reason="[SAMPLE] Flow rate 110% above baseline for >15 minutes",
                recommended_action="Inspect plumbing in Radiology corridor"
            ))

    # Seed sample maintenance tickets
    if db.query(MaintenanceTicket).count() == 0:
        acad = db.query(Building).filter_by(code="ACAD-A").first()
        if acad:
            db.add(MaintenanceTicket(
                building_id=acad.id,
                ticket_type="energy",
                title="[SAMPLE] AC left running in vacant Classroom A102",
                description="Classroom A102 has been vacant for 2+ hours with AC and projector on.",
                priority="medium",
                status="open",
                assigned_to="Facilities Team"
            ))

    # Seed sample solar readings
    _seed_solar_readings(db)

    db.commit()


def _seed_sensor_readings(db: Session, sensor: Sensor) -> None:
    """Add 48 hours of hourly historical readings for charts."""
    now = datetime.utcnow()
    base_values = {
        "energy": 15.0,
        "water": 2.5,
        "waste": 40.0,
        "env": 85.0,
    }
    base = base_values.get(sensor.sensor_type, 10.0)
    for h in range(48):
        ts = now - timedelta(hours=48 - h)
        hour_of_day = ts.hour
        variation = base * 0.3 * math.sin(math.pi * hour_of_day / 12)
        noise = base * 0.05 * (random.random() - 0.5)
        value = max(0.0, base + variation + noise)
        db.add(SensorReading(sensor_id=sensor.id, value=round(value, 2), recorded_at=ts))


def _seed_solar_readings(db: Session) -> None:
    """Generate 48 hours of hourly solar telemetry for charts and savings."""
    if db.query(SolarReading).count() > 0:
        return

    now = datetime.utcnow()
    for h in range(48):
        ts = now - timedelta(hours=48 - h)
        # Convert UTC to IST (+5.5h) to compute solar generation profile accurately
        ist_dt = ts + timedelta(hours=5, minutes=30)
        ist_hour = ist_dt.hour + ist_dt.minute / 60.0

        # Solar bell curve between 6:00 AM and 6:30 PM (06:00 - 18:30 IST)
        if 6.0 <= ist_hour <= 18.5:
            # Peak at 12:30 PM of ~75 kW maximum capacity
            rad = math.pi * (ist_hour - 6.0) / 12.5
            power = max(0.0, 75.0 * math.sin(rad))
            # Minor cloud variation
            power *= (0.85 + 0.15 * random.random())
        else:
            power = 0.0

        gen_kwh = power * 1.0  # 1 hour slot
        # Campus daytime load is around 70-120 kW
        campus_demand_estimate = 85.0 + 20.0 * math.sin(math.pi * ist_hour / 24.0)
        consumed_kwh = min(gen_kwh, campus_demand_estimate * 0.9)
        exported_kwh = max(0.0, gen_kwh - consumed_kwh)

        db.add(SolarReading(
            generated_kwh=round(gen_kwh, 2),
            power_kw=round(power, 2),
            consumed_kwh=round(consumed_kwh, 2),
            exported_kwh=round(exported_kwh, 2),
            is_simulated=True,
            recorded_at=ts
        ))
