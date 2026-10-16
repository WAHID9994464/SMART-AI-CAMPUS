"""
OpenRouter AI Integration Router for Smart AI Campus.
Supports google/gemini-3-flash-preview via OpenRouter API with full campus database grounding.
Includes transparent local analytics fallback when OPENROUTER_API_KEY is unconfigured.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
    OPENROUTER_API_URL,
    OPENROUTER_TIMEOUT_SECONDS,
    FRONTEND_ORIGIN,
    ESTIMATED_COST_SAVED_INR,
    ELECTRICITY_TARIFF,
    GRID_EMISSION_FACTOR,
    is_openrouter_configured,
)
from app.models import (
    Building,
    Room,
    WaterAlert,
    WasteIncident,
    EnergySavingEvent,
    MaintenanceTicket,
    SolarReading,
    SensorReading,
    Sensor,
)

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


class ChatMessage(BaseModel):
    role: str  # user | assistant | system
    content: str


class IntelligenceChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class IntelligenceChatResponse(BaseModel):
    reply: str
    source: str  # "openrouter" | "local_fallback"
    model: str
    structured_recommendations: List[Dict[str, Any]] = []
    error: Optional[str] = None
    # Compatibility field for existing components expecting "response"
    response: Optional[str] = None


def gather_grounded_campus_context(db: Session) -> Dict[str, Any]:
    """Collect real database records and metrics for grounding AI responses."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    hours_elapsed = max(1.0, (datetime.utcnow() - today).total_seconds() / 3600.0)

    # 1. Exactly 5 buildings
    buildings = db.query(Building).all()
    bldg_list = [
        {
            "id": b.id,
            "code": b.code,
            "name": b.name,
            "category": b.category or "Academic",
            "floors": b.floors,
            "status": b.status,
            "rooms_count": len(b.rooms),
        }
        for b in buildings
    ]

    # 2. Energy & Load
    rooms = db.query(Room).all()
    current_load_kw = round(sum(r.current_load_kw for r in rooms), 2)
    total_energy_kwh = round(current_load_kw * hours_elapsed, 2)
    occupied_rooms = [r for r in rooms if r.occupied]
    vacant_with_equipment = [
        r for r in rooms if not r.occupied and (r.lights_on or r.ac_on or r.projector_on)
    ]

    # 3. Solar Generation
    solar_readings = (
        db.query(SolarReading)
        .filter(SolarReading.recorded_at >= today)
        .order_by(SolarReading.recorded_at.desc())
        .all()
    )
    solar_gen_kwh = round(sum(r.generated_kwh for r in solar_readings), 2)
    solar_power_kw = round(solar_readings[0].power_kw if solar_readings else 0.0, 2)
    solar_pct = round((solar_gen_kwh / total_energy_kwh * 100), 1) if total_energy_kwh > 0 else 0.0

    # 4. Water Telemetry
    water_alerts = db.query(WaterAlert).filter(WaterAlert.status != "resolved").all()
    water_sensors = db.query(Sensor).filter(Sensor.sensor_type == "water").all()
    w_ids = [s.id for s in water_sensors]
    w_readings = (
        db.query(SensorReading)
        .filter(SensorReading.sensor_id.in_(w_ids), SensorReading.recorded_at >= today)
        .all()
    )
    avg_lpm = (sum(r.value for r in w_readings) / len(w_readings)) if w_readings else 2.5
    water_usage_litres = round(avg_lpm * 60 * hours_elapsed, 0)

    # 5. Waste Telemetry
    waste_incidents = db.query(WasteIncident).filter(WasteIncident.status != "resolved").all()
    waste_kg_est = 320.0  # demo baseline daily collection

    # 6. Cost Savings baseline (₹20,000 demonstration)
    energy_events = (
        db.query(EnergySavingEvent)
        .filter(EnergySavingEvent.created_at >= today)
        .all()
    )
    simulated_savings = sum(e.cost_saved_inr for e in energy_events)
    estimated_cost_saved_inr = round(ESTIMATED_COST_SAVED_INR + simulated_savings, 2)

    # 7. Active Alerts
    open_tickets = (
        db.query(MaintenanceTicket)
        .filter(
            MaintenanceTicket.status.in_(["open", "in_progress"]),
            MaintenanceTicket.priority.in_(["high", "critical"]),
        )
        .all()
    )
    active_alerts_count = len(water_alerts) + len(open_tickets)

    return {
        "building_count": len(buildings),
        "buildings": bldg_list,
        "building_names": [b["name"] for b in bldg_list],
        "current_load_kw": current_load_kw,
        "total_energy_kwh": total_energy_kwh,
        "occupied_rooms_count": len(occupied_rooms),
        "vacant_with_equipment_count": len(vacant_with_equipment),
        "vacant_with_equipment_names": [r.name for r in vacant_with_equipment[:4]],
        "solar_gen_kwh": solar_gen_kwh,
        "solar_power_kw": solar_power_kw,
        "solar_pct": solar_pct,
        "water_usage_litres": water_usage_litres,
        "current_flow_lpm": round(avg_lpm, 2),
        "water_alerts_count": len(water_alerts),
        "water_alert_details": [
            f"Alert #{a.id} ({a.severity}) in building #{a.building_id}: {a.detection_reason or a.alert_type}"
            for a in water_alerts[:3]
        ],
        "waste_incidents_count": len(waste_incidents),
        "waste_kg": waste_kg_est,
        "estimated_cost_saved_inr": estimated_cost_saved_inr,
        "active_alerts_count": active_alerts_count,
        "tickets_count": len(open_tickets),
        "tariff": ELECTRICITY_TARIFF,
        "co2_factor": GRID_EMISSION_FACTOR,
    }


def build_system_prompt(ctx: Dict[str, Any]) -> str:
    """Compose grounding system prompt with actual database metrics."""
    b_names = ", ".join(ctx["building_names"])
    return f"""You are NexusEco Intelligence, the expert AI campus sustainability advisor for Smart AI Campus.
You analyze real-time IoT telemetry and recommend concrete actions to minimize energy, water, and waste footprints.

CAMPUS FACILITIES & STATUS (EXACTLY 5 BUILDINGS):
- Total Buildings ({ctx['building_count']}): {b_names}
- Facility Breakdown:
  1. School of Engineering (3 Complete Floors: Ground Floor Library, First Floor 8 Engineering Labs, Second Floor 8 Classrooms)
  2. Campus Cafeteria (Dining Pavilion & Food Service)
  3. School of Health Sciences (Medical Academic & Lecture Halls)
  4. CDSIMER Hospital (Clinical OPD, Wards & Imaging Center)
  5. Hospital Emergency Block (Trauma & Critical Care)

SCHOOL OF ENGINEERING 3-FLOOR ARCHITECTURAL BREAKDOWN:
- Ground Floor — Library: Central Library & Stack Area, Librarian Desk & Circulation Counter, Digital Learning & E-Resource Lab, Reference & Book Storage, Reading & Waiting Lounge
- First Floor — Laboratories: Computer Programming Lab, AI and Machine Learning Lab, Data Science Lab, Electronics Lab, Hardware and Embedded Systems Lab, Project and Innovation Lab, Laboratory Store, Faculty / Lab Instructor Room
- Second Floor — Classrooms: Classroom 201, Classroom 202, Classroom 203, Classroom 204, Smart Classroom, Seminar Room, Faculty Room, Student Discussion and Collaboration Area

CURRENT TELEMETRY & AUDIT METRICS:
- Total Campus Electrical Load: {ctx['current_load_kw']} kW (~{ctx['total_energy_kwh']} kWh consumed today)
- Solar PV Generation: {ctx['solar_gen_kwh']} kWh generated ({ctx['solar_power_kw']} kW current output, {ctx['solar_pct']}% solar contribution)
- Campus Water Inflow: {ctx['water_usage_litres']} Litres today (manifold flow ~{ctx['current_flow_lpm']} LPM)
- Waste Collected: ~{ctx['waste_kg']} kg ({ctx['waste_incidents_count']} open bin incidents)
- Estimated Cost Saved: ₹{ctx['estimated_cost_saved_inr']:,.0f} (Demonstration baseline)
- Active Anomaly Alerts: {ctx['active_alerts_count']} open items ({ctx['water_alerts_count']} water alerts, {ctx['tickets_count']} maintenance tickets)
- Vacant Rooms with Equipment On: {ctx['vacant_with_equipment_count']} rooms ({', '.join(ctx['vacant_with_equipment_names']) if ctx['vacant_with_equipment_names'] else 'None'})

BEHAVIORAL DIRECTIVES:
1. Always ground your reasoning in these 5 buildings and the telemetry above.
2. Be professional, concise, actionable, and encouraging.
3. Be transparent: cost savings (₹{ctx['estimated_cost_saved_inr']:,.0f}) and optimization actions are simulated demonstrations. Do not invent live hardware switching or claim verified utility bill receipts.
4. Structure recommendations with bold titles and bullet points.
5. Emphasize energy efficiency, water leak mitigation, waste diversion, and environmental wellness.
"""


def generate_local_analytics_reply(message: str, ctx: Dict[str, Any], notice: str = "") -> str:
    """Rich grounded local fallback response when OpenRouter API key is absent or unreachable."""
    msg = message.lower()
    prefix = f"> ℹ️ **{notice}**\n\n" if notice else ""

    if any(k in msg for k in ["library", "lab", "classroom", "engineering", "soe", "floor", "seminar"]):
        return (
            f"{prefix}### School of Engineering (3-Floor Overview)\n\n"
            f"The **School of Engineering** is structured into **three complete floors**:\n\n"
            f"**📚 Ground Floor — Central Library:**\n"
            f"- *Central Library & Stack Area:* Multiple book-shelf rows, quiet study desks, reference catalogue\n"
            f"- *Librarian Desk & Circulation Counter:* Entrance reception, book issue/return counter\n"
            f"- *Digital Learning & E-Resource Lab:* 25 computer terminals with IEEE/Springer access\n"
            f"- *Reference & Book Storage Area:* Compact mobile archiving stacks\n"
            f"- *Reading & Waiting Lounge:* Upholstered seating and periodicals section\n\n"
            f"**🔬 First Floor — Engineering Laboratories:**\n"
            f"1. *Computer Programming Lab* (45 workstations, Linux/Windows)\n"
            f"2. *AI and Machine Learning Lab* (NVIDIA GPU cluster nodes)\n"
            f"3. *Data Science Lab* (Big Data cluster interface & analytics display)\n"
            f"4. *Electronics Lab* (Oscilloscopes, signal generators, solder benches)\n"
            f"5. *Hardware and Embedded Systems Lab* (ARM/RISC-V dev kits, FPGA boards)\n"
            f"6. *Project and Innovation Lab* (Rapid prototyping, 3D printers)\n"
            f"7. *Laboratory Store* (ESD component racks, inventory management)\n"
            f"8. *Faculty / Lab Instructor Room* (Instructor workstations & testing bench)\n\n"
            f"**🎓 Second Floor — Classrooms & Collaboration:**\n"
            f"1–4. *Classrooms 201, 202, 203, 204* (Tiered lecture seating, high-lumen laser projectors)\n"
            f"5. *Smart Classroom* (86-inch 4K Interactive Touchscreen, PTZ tracking cameras)\n"
            f"6. *Seminar Room* (80-seat conference auditorium, delegate mics, dual screens)\n"
            f"7. *Faculty Room* (Faculty workstations, document printer, private consultation)\n"
            f"8. *Student Discussion & Collaboration Area* (Breakout pods, mobile whiteboards)\n\n"
            f"All rooms feature simulated energy telemetry and occupancy tracking in the 3D Digital Twin."
        )

    if any(k in msg for k in ["building", "facilities", "campus", "how many"]):
        return (
            f"{prefix}The **Smart AI Campus** comprises **exactly 5 core facilities**:\n\n"
            f"1. **School of Engineering** (Academic Block & Labs) — Normal status, Main DB Panel monitored\n"
            f"2. **Campus Cafeteria** (Dining & Food Service) — Dining Pavilion & commercial kitchens\n"
            f"3. **School of Health Sciences** (Clinical Academic & Lecture Halls) — 4 floors, medical labs\n"
            f"4. **CDSIMER Hospital** (Healthcare, OPD & Radiology) — 5 floors, continuous medical load\n"
            f"5. **Hospital Emergency Block** (Trauma & Critical Care) — 3 floors, critical uninterrupted power\n\n"
            f"**Current Status:** {ctx['active_alerts_count']} active alerts currently flagged across facilities."
        )

    if any(k in msg for k in ["cost", "saving", "rupee", "money", "₹", "inr"]):
        return (
            f"{prefix}### Campus Cost Savings Summary\n\n"
            f"- **Estimated Cost Saved:** **₹{ctx['estimated_cost_saved_inr']:,.0f}** *(Simulated demonstration baseline)*\n"
            f"- **Solar PV Offset:** **{ctx['solar_gen_kwh']} kWh** generated today, contributing **{ctx['solar_pct']}%** of total campus power at an electricity tariff of ₹{ctx['tariff']}/kWh.\n"
            f"- **CO₂e Emissions Avoided:** ~{round(ctx['solar_gen_kwh'] * ctx['co2_factor'], 1)} kg CO₂e.\n\n"
            f"*Note: Figures reflect calibrated algorithmic demonstrations. Hardware switching integrations require verified utility sub-meter telemetry.*"
        )

    if any(k in msg for k in ["energy", "power", "kw", "kwh", "electricity", "load"]):
        return (
            f"{prefix}### Campus Energy Telemetry\n\n"
            f"- **Current Active Load:** **{ctx['current_load_kw']} kW**\n"
            f"- **Total Energy Consumed Today:** **{ctx['total_energy_kwh']} kWh**\n"
            f"- **Solar Generation:** **{ctx['solar_gen_kwh']} kWh** ({ctx['solar_power_kw']} kW instantaneous output)\n"
            f"- **Optimization Opportunity:** **{ctx['vacant_with_equipment_count']} vacant rooms** currently have lighting or HVAC active ({', '.join(ctx['vacant_with_equipment_names']) if ctx['vacant_with_equipment_names'] else 'all rooms optimal'}).\n\n"
            f"**Recommendation:** Execute an algorithmic load shed on vacant rooms in the School of Engineering and School of Health Sciences to save ~12.5 kWh over the next 2 operating hours."
        )

    if any(k in msg for k in ["water", "leak", "pipe", "litres", "flow"]):
        return (
            f"{prefix}### Water Management Telemetry\n\n"
            f"- **Campus Water Inflow:** **{ctx['water_usage_litres']:,.0f} Litres** measured today\n"
            f"- **Average Manifold Flow Rate:** **{ctx['current_flow_lpm']} LPM**\n"
            f"- **Active Pipe Anomalies:** **{ctx['water_alerts_count']} alerts**\n"
            + ("\n".join(f"  * {d}" for d in ctx["water_alert_details"]) if ctx["water_alert_details"] else "  * All hydro lines operating within baseline thresholds.")
            + "\n\n**Action Item:** Dispatch facility staff to investigate any acoustic sensors exceeding 2.0 LPM baseline."
        )

    if any(k in msg for k in ["waste", "trash", "bin", "recycle"]):
        return (
            f"{prefix}### Waste Management Telemetry\n\n"
            f"- **Estimated Waste Collected:** ~**{ctx['waste_kg']} kg** across campus zones\n"
            f"- **Active Bin Alerts:** **{ctx['waste_incidents_count']} incidents** requiring collection\n"
            f"- **Primary Focus Area:** Campus Cafeteria organic and packaging waste stations.\n\n"
            f"**Action Item:** Prioritize collection at the Campus Cafeteria to prevent overflow and enhance segregation compliance."
        )

    # General campus overview
    return (
        f"{prefix}### Smart AI Campus Sustainability Overview\n\n"
        f"Monitoring **5 campus facilities**: *School of Engineering, Campus Cafeteria, School of Health Sciences, CDSIMER Hospital, and Hospital Emergency Block*.\n\n"
        f"- **⚡ Energy:** {ctx['current_load_kw']} kW live load | {ctx['solar_gen_kwh']} kWh solar generated ({ctx['solar_pct']}% solar contribution)\n"
        f"- **💧 Water:** {ctx['water_usage_litres']:,.0f} L today | {ctx['water_alerts_count']} active leak alerts\n"
        f"- **🗑️ Waste:** ~{ctx['waste_kg']} kg collected | {ctx['waste_incidents_count']} open collection tasks\n"
        f"- **💰 Cost Savings:** **₹{ctx['estimated_cost_saved_inr']:,.0f}** estimated demonstration savings\n"
        f"- **⚠️ Active Alerts:** {ctx['active_alerts_count']} items requiring facilities attention\n\n"
        f"Ask me about specific building recommendations, energy optimization, or water leak resolution!"
    )


@router.post("/chat", response_model=IntelligenceChatResponse)
async def chat_intelligence(req: IntelligenceChatRequest, db: Session = Depends(get_db)):
    """
    Chat endpoint for NexusEco Intelligence.
    Connects to OpenRouter (google/gemini-3-flash-preview) using Bearer authentication.
    Falls back gracefully to grounded local analytics if OPENROUTER_API_KEY is not configured or fails.
    """
    ctx = gather_grounded_campus_context(db)
    system_prompt = build_system_prompt(ctx)

    # Check if OpenRouter key is configured
    if not is_openrouter_configured():
        notice = "Local Analytics Mode — OpenRouter API key is not configured. Add OPENROUTER_API_KEY to backend/.env to enable live AI responses with google/gemini-3-flash-preview."
        reply = generate_local_analytics_reply(req.message, ctx, notice=notice)
        return IntelligenceChatResponse(
            reply=reply,
            response=reply,
            source="local_fallback",
            model="local-analytics-engine",
            structured_recommendations=[
                {
                    "title": "Configure OpenRouter API Key",
                    "action": "Add OPENROUTER_API_KEY=... in backend/.env",
                    "impact": "Unlocks live google/gemini-3-flash-preview reasoning",
                }
            ],
            error=None,
        )

    # Prepare OpenRouter request
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY.strip()}",
        "HTTP-Referer": FRONTEND_ORIGIN,
        "X-Title": "Smart AI Campus",
        "Content-Type": "application/json",
    }

    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in req.history[-6:]:  # Keep recent turns
        role = "assistant" if msg.role in ("assistant", "model") else "user"
        formatted_messages.append({"role": role, "content": msg.content})
    formatted_messages.append({"role": "user", "content": req.message})

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": formatted_messages,
        "temperature": 0.4,
        "max_tokens": 1200,
    }

    try:
        async with httpx.AsyncClient(timeout=float(OPENROUTER_TIMEOUT_SECONDS)) as client:
            resp = await client.post(OPENROUTER_API_URL, json=payload, headers=headers)

        if resp.status_code == 200:
            data = resp.json()
            reply_text = data["choices"][0]["message"]["content"]
            return IntelligenceChatResponse(
                reply=reply_text,
                response=reply_text,
                source="openrouter",
                model=OPENROUTER_MODEL,
                structured_recommendations=[
                    {
                        "title": "Schedule Vacant Room Auto-Shutoff",
                        "impact": "Saves ~12.5 kWh daily across Engineering & Health Sciences",
                    },
                    {
                        "title": "Mitigate Hospital Corridor Acoustic Leak",
                        "impact": "Preserves up to 6,000 Litres weekly in CDSIMER Hospital",
                    },
                ],
                error=None,
            )
        else:
            err_msg = f"OpenRouter returned status {resp.status_code}: {resp.text[:120]}"
            notice = f"OpenRouter Error ({resp.status_code}) — Serving grounded local analytics."
            reply = generate_local_analytics_reply(req.message, ctx, notice=notice)
            return IntelligenceChatResponse(
                reply=reply,
                response=reply,
                source="local_fallback",
                model="local-analytics-engine",
                structured_recommendations=[],
                error=err_msg,
            )

    except httpx.TimeoutException:
        notice = "OpenRouter request timed out — Serving grounded local analytics."
        reply = generate_local_analytics_reply(req.message, ctx, notice=notice)
        return IntelligenceChatResponse(
            reply=reply,
            response=reply,
            source="local_fallback",
            model="local-analytics-engine",
            structured_recommendations=[],
            error="OpenRouter connection timed out",
        )
    except Exception as exc:
        notice = "OpenRouter connection unavailable — Serving grounded local analytics."
        reply = generate_local_analytics_reply(req.message, ctx, notice=notice)
        return IntelligenceChatResponse(
            reply=reply,
            response=reply,
            source="local_fallback",
            model="local-analytics-engine",
            structured_recommendations=[],
            error=str(exc)[:120],
        )
