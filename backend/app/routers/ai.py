"""
Gemini AI Integration and Chat router.
Grounds responses in real-time campus database telemetry.
Falls back safely to clearly labeled local analytics when the Gemini API key is unconfigured or unavailable.
"""
import asyncio
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_TIMEOUT_SECONDS,
    ELECTRICITY_TARIFF,
    GRID_EMISSION_FACTOR,
    is_gemini_configured,
)
from app.models import (
    Building,
    Room,
    WaterAlert,
    WasteIncident,
    EnergySavingEvent,
    MaintenanceTicket,
    Camera,
    DetectionRecord,
    Sensor,
    SensorReading,
)

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatMessage(BaseModel):
    role: str  # user | assistant | model
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    response: str
    reply: Optional[str] = None
    source: str  # gemini | local_fallback
    structured_recommendations: list[dict] = []
    error: Optional[str] = None


def _gather_campus_context(db: Session) -> dict:
    """Collect current campus metrics and records for AI context grounding."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    buildings = db.query(Building).all()
    rooms = db.query(Room).all()
    water_alerts = db.query(WaterAlert).filter(WaterAlert.status != "resolved").all()
    waste_incidents = db.query(WasteIncident).filter(WasteIncident.status != "resolved").all()
    energy_events = (
        db.query(EnergySavingEvent)
        .filter(EnergySavingEvent.created_at >= today)
        .all()
    )
    tickets = (
        db.query(MaintenanceTicket)
        .filter(MaintenanceTicket.status.in_(["open", "in_progress"]))
        .all()
    )
    cameras = db.query(Camera).all()
    recent_detections = (
        db.query(DetectionRecord)
        .order_by(DetectionRecord.recorded_at.desc())
        .limit(10)
        .all()
    )

    total_load = sum(r.current_load_kw for r in rooms)
    occupied_rooms = [r for r in rooms if r.occupied]
    vacant_with_equipment = [
        r for r in rooms if not r.occupied and (r.lights_on or r.ac_on or r.projector_on)
    ]
    energy_saved = sum(e.energy_saved_kwh for e in energy_events)
    cost_saved = sum(e.cost_saved_inr for e in energy_events)
    co2_avoided = sum(e.co2_avoided_kg for e in energy_events)

    building_map = {b.id: b.name for b in buildings}

    building_statuses = [
        {
            "id": b.id,
            "code": b.code,
            "name": b.name,
            "category": b.category or "Academic",
            "status": b.status,
            "floors": b.floors,
        }
        for b in buildings
    ]
    critical_buildings = [b["name"] for b in building_statuses if b["status"] == "critical"]
    warning_buildings = [b["name"] for b in building_statuses if b["status"] == "warning"]
    normal_buildings = [b["name"] for b in building_statuses if b["status"] == "normal"]

    # Key facilities and rooms breakdown
    rooms_data = [
        {
            "id": r.id,
            "code": r.code,
            "name": r.name,
            "building": building_map.get(r.building_id, f"Building {r.building_id}"),
            "floor": r.floor,
            "facility_type": r.facility_type or "Room",
            "occupied": r.occupied,
            "lights_on": r.lights_on,
            "ac_on": r.ac_on,
            "projector_on": r.projector_on,
            "current_load_kw": round(r.current_load_kw, 2),
        }
        for r in rooms
    ]

    vacant_wasting_rooms = [
        {
            "room": r.name,
            "code": r.code,
            "building": building_map.get(r.building_id, f"Building {r.building_id}"),
            "floor": r.floor,
            "current_load_kw": round(r.current_load_kw, 2),
            "lights": r.lights_on,
            "ac": r.ac_on,
            "projector": r.projector_on,
        }
        for r in vacant_with_equipment
    ]

    water_alert_details = [
        {
            "id": a.id,
            "building": building_map.get(a.building_id, "Campus Main"),
            "alert_type": a.alert_type,
            "severity": a.severity,
            "flow_lpm": a.flow_lpm,
            "threshold_lpm": a.threshold_lpm,
            "detection_reason": a.detection_reason,
            "recommended_action": a.recommended_action,
        }
        for a in water_alerts
    ]

    waste_incident_details = [
        {
            "id": i.id,
            "building": building_map.get(i.building_id, "Campus Main"),
            "location": i.location_desc,
            "category": i.category,
            "severity": i.severity,
            "fill_level": i.fill_level,
            "notes": i.notes,
        }
        for i in waste_incidents
    ]

    ticket_details = [
        {
            "id": t.id,
            "building": building_map.get(t.building_id, "Campus"),
            "type": t.ticket_type,
            "title": t.title,
            "priority": t.priority,
            "status": t.status,
            "assigned_to": t.assigned_to,
        }
        for t in tickets
    ]

    camera_details = [
        {
            "code": c.code,
            "name": c.name,
            "location": c.location,
            "status": c.status,
        }
        for c in cameras
    ]

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "tariff_inr_per_kwh": ELECTRICITY_TARIFF,
        "grid_emission_factor_kg_co2_per_kwh": GRID_EMISSION_FACTOR,
        "total_current_load_kw": round(total_load, 2),
        "total_rooms_count": len(rooms),
        "occupied_rooms_count": len(occupied_rooms),
        "vacant_rooms_count": len(rooms) - len(occupied_rooms),
        "energy_saved_kwh_today": round(energy_saved, 3),
        "cost_saved_inr_today": round(cost_saved, 2),
        "co2_avoided_kg_today": round(co2_avoided, 4),
        "active_water_alerts_count": len(water_alerts),
        "active_waste_incidents_count": len(waste_incidents),
        "open_tickets_count": len(tickets),
        "buildings_summary": building_statuses,
        "critical_buildings": critical_buildings,
        "warning_buildings": warning_buildings,
        "normal_buildings": normal_buildings,
        "vacant_rooms_with_equipment_on": vacant_wasting_rooms,
        "rooms": rooms_data,
        "water_alerts": water_alert_details,
        "waste_incidents": waste_incident_details,
        "maintenance_tickets": ticket_details,
        "cameras": camera_details,
        "recent_cv_detections_count": len(recent_detections),
    }


def _local_analytics_response(message: str, ctx: dict) -> tuple[str, list[dict]]:
    """
    Rule-based local analytics fallback.
    Clearly states that it is local analytics operating over real campus database records.
    Returns (markdown_response, structured_recommendations).
    """
    msg = message.lower()
    recommendations = []
    sections = []

    sections.append("**[Local Analytics Mode — Gemini API not configured or unavailable]**\n\n*Note: This response is generated by local rule-based analytics using actual verified records from the campus database.*\n")

    # 0. Unmonitored / Out of Scope Facilities
    if any(k in msg for k in ["swimming", "pool", "gym", "sports", "stadium", "hostel mess", "parking rate", "cricket"]):
        sections.append("### Unmonitored Facility Inquiry")
        sections.append("NexusEco currently has no telemetry or sensors registered for that facility in the campus database.")
        sections.append("\nMonitored campus facilities include Academic Block A (Classrooms & Labs), Central Library, Administration Block, Engineering Workshop, Computer Laboratory, and Campus Cafeteria.")

    # 1. Energy & Load
    elif any(k in msg for k in ["energy", "power", "load", "consumption", "kw", "kwh", "electricity", "tariff"]):
        sections.append("### Campus Energy Telemetry")
        sections.append(f"- **Current Campus Electrical Load:** {ctx['total_current_load_kw']} kW")
        sections.append(f"- **Energy Saved Today:** {ctx['energy_saved_kwh_today']} kWh")
        sections.append(f"- **Cost Saved Today:** ₹{ctx['cost_saved_inr_today']:.2f} (Tariff: ₹{ctx['tariff_inr_per_kwh']}/kWh)")
        sections.append(f"- **CO₂ Avoided Today:** {ctx['co2_avoided_kg_today']:.2f} kg CO₂e")

        vacant = ctx["vacant_rooms_with_equipment_on"]
        if vacant:
            sections.append(f"\n#### ⚠ Energy Waste Anomaly ({len(vacant)} Vacant Room{'s' if len(vacant) > 1 else ''} with Active Equipment)")
            for r in vacant:
                equip = []
                if r["lights"]:
                    equip.append("Lights")
                if r["ac"]:
                    equip.append("Air Conditioning")
                if r["projector"]:
                    equip.append("Projector")
                sections.append(f"- **{r['room']}** ({r['building']}, Floor {r['floor']}): {', '.join(equip)} running idle — Load: **{r['current_load_kw']} kW**")

            recommendations.append({
                "finding": f"{len(vacant)} vacant room(s) have active HVAC/lighting consuming {sum(r['current_load_kw'] for r in vacant):.1f} kW",
                "recommended_action": "Execute Energy-Saving Simulation and automated turn-off schedule in Energy Management",
                "priority": "high",
                "expected_impact": f"Reduce campus load by up to {sum(r['current_load_kw'] for r in vacant):.1f} kW",
            })
        else:
            sections.append("\n✅ All vacant rooms currently have their lighting and HVAC turned off.")

    # 2. Water Telemetry & Leaks
    elif any(k in msg for k in ["water", "leak", "pipe", "flow", "lpm", "plumbing"]):
        sections.append("### Campus Water Network Status")
        sections.append(f"- **Active Water Alerts:** {ctx['active_water_alerts_count']}")
        if ctx["water_alerts"]:
            sections.append("\n| Building | Alert Type | Severity | Flow Rate | Threshold | Recommended Action |")
            sections.append("|---|---|---|---|---|---|")
            for a in ctx["water_alerts"]:
                sections.append(f"| {a['building']} | {a['alert_type'].replace('_', ' ').title()} | **{a['severity'].upper()}** | {a['flow_lpm']} LPM | {a['threshold_lpm']} LPM | {a['recommended_action'] or 'Inspect valve'} |")

            recommendations.append({
                "finding": f"{ctx['active_water_alerts_count']} active water anomalies flagged in the campus plumbing grid",
                "recommended_action": "Inspect flagged building valves in Water Management and isolate faulty pipe sections",
                "priority": "critical" if any(a["severity"] == "critical" for a in ctx["water_alerts"]) else "high",
                "expected_impact": "Prevent clean water loss and infrastructure water damage",
            })
        else:
            sections.append("\n✅ No active water leaks or flow threshold breaches detected.")

    # 3. Waste Management & Bins
    elif any(k in msg for k in ["waste", "bin", "overflow", "garbage", "trash", "recycle", "plastic"]):
        sections.append("### Campus Waste & Collection Status")
        sections.append(f"- **Active Waste Incidents:** {ctx['active_waste_incidents_count']}")
        if ctx["waste_incidents"]:
            sections.append("\n| Building / Location | Category | Severity | Fill Level | Notes |")
            sections.append("|---|---|---|---|---|")
            for w in ctx["waste_incidents"]:
                sections.append(f"| {w['building']} ({w['location'] or 'Central'}) | {w['category'].title()} | **{w['severity'].upper()}** | {w['fill_level']}% | {w['notes'] or 'Pending pickup'} |")

            overflows = [w for w in ctx["waste_incidents"] if w["fill_level"] >= 80]
            if overflows:
                recommendations.append({
                    "finding": f"{len(overflows)} waste container(s) exceed 80% capacity",
                    "recommended_action": "Dispatch housekeeping crew for immediate bin emptying via Waste Management",
                    "priority": "high",
                    "expected_impact": "Eliminate overflow hazards and maintain campus cleanliness",
                })
        else:
            sections.append("\n✅ All monitored waste receptacles are within safe fill limits.")

    # 4. Facilities, Classrooms & Laboratories
    elif any(k in msg for k in ["room", "lab", "laboratory", "cafeteria", "canteen", "library", "class", "classroom"]):
        sections.append("### Campus Facilities & Laboratories Status")
        sections.append(f"- **Monitored Rooms & Facilities:** {ctx['total_rooms_count']}")
        sections.append(f"- **Occupied Facilities:** {ctx['occupied_rooms_count']}")
        sections.append(f"- **Vacant Facilities:** {ctx['vacant_rooms_count']}\n")

        # Specific facilities highlight
        sections.append("#### Key Monitored Locations:")
        for r in ctx["rooms"]:
            status_text = "Occupied" if r["occupied"] else "Vacant"
            sections.append(f"- **{r['name']}** ({r['building']}, Floor {r['floor']}): {status_text} — Current Load: **{r['current_load_kw']} kW**")

        if any("cafeteria" in msg for k in ["cafeteria", "canteen"]):
            sections.append("\n**Cafeteria Note:** Central dining facility with seating, food counters, and active CCTV camera `CAM-01`.")

    # 5. Computer Vision & Cameras
    elif any(k in msg for k in ["camera", "cctv", "vision", "cv", "detection", "stream"]):
        sections.append("### Computer Vision & CCTV Telemetry")
        sections.append(f"- **Active Cameras:** {len(ctx['cameras'])}")
        sections.append(f"- **Recent Vision Detections:** {ctx['recent_cv_detections_count']}\n")
        sections.append("| Camera Code | Name | Location | Stream Status |")
        sections.append("|---|---|---|---|")
        for c in ctx["cameras"]:
            sections.append(f"| `{c['code']}` | {c['name']} | {c['location']} | **{c['status'].upper()}** |")

    # 6. Critical alerts, tickets, and priorities
    elif any(k in msg for k in ["critical", "alert", "urgent", "priority", "ticket", "maintenance"]):
        sections.append("### Critical Campus Alerts & Maintenance Priorities")
        if ctx["critical_buildings"]:
            sections.append(f"- 🔴 **Critical Buildings:** {', '.join(ctx['critical_buildings'])}")
        if ctx["warning_buildings"]:
            sections.append(f"- 🟡 **Warning Buildings:** {', '.join(ctx['warning_buildings'])}")
        sections.append(f"- **Open Maintenance Tickets:** {ctx['open_tickets_count']}")
        sections.append(f"- **Active Water Leaks:** {ctx['active_water_alerts_count']}")
        sections.append(f"- **Active Waste Incidents:** {ctx['active_waste_incidents_count']}")

        if ctx["maintenance_tickets"]:
            sections.append("\n#### Urgent Tickets:")
            for t in ctx["maintenance_tickets"]:
                sections.append(f"- **#{t['id']} [{t['priority'].upper()}]** {t['title']} ({t['building']}) — Assigned: {t['assigned_to'] or 'Unassigned'}")

    # 7. Summary / Overview / Report
    elif any(k in msg for k in ["report", "summary", "today", "overview", "kpi"]):
        sections.append("### Campus Sustainability Daily Summary")
        sections.append(f"- **Total Electrical Load:** {ctx['total_current_load_kw']} kW across {ctx['total_rooms_count']} rooms")
        sections.append(f"- **Energy Saved Today:** {ctx['energy_saved_kwh_today']} kWh (₹{ctx['cost_saved_inr_today']:.2f})")
        sections.append(f"- **CO₂ Avoided Today:** {ctx['co2_avoided_kg_today']:.2f} kg CO₂e")
        sections.append(f"- **Plumbing Leaks / Alerts:** {ctx['active_water_alerts_count']}")
        sections.append(f"- **Waste Incidents:** {ctx['active_waste_incidents_count']}")
        sections.append(f"- **Open Work Tickets:** {ctx['open_tickets_count']}")

    # 8. Unmonitored or Unknown Query
    else:
        # Check if the query asks about something not in database
        sections.append("### NexusEco Campus Assistance")
        sections.append("I am NexusEco Intelligence. I track and optimize campus sustainability telemetry from the verified campus database.")
        sections.append("\n**Available Telemetry Categories:**")
        sections.append("1. **Energy Management:** Real-time kW load, vacant room equipment waste, kWh and ₹ saved.")
        sections.append("2. **Water Management:** Flow rates (LPM), leak alerts, threshold exceedances.")
        sections.append("3. **Waste Management:** Bin fill levels, overflow warnings, segregation categories.")
        sections.append("4. **Facilities & Labs:** Computer Laboratory, Engineering Workshop, Cafeteria, Library, Classrooms.")
        sections.append("5. **Computer Vision:** CCTV camera streams (`CAM-01`, `CAM-02`, `CAM-COMP`), detection logs.")
        sections.append("6. **Sustainability Reports:** Comprehensive daily and weekly carbon and cost avoidance metrics.")
        sections.append("\n*If you asked about a specific facility not mentioned above, NexusEco currently has no telemetry or sensors registered for that item in the campus database.*")

    return "\n".join(sections), recommendations


async def _gemini_response(message: str, history: list[ChatMessage], ctx: dict) -> tuple[str, str]:
    """
    Call Gemini API with grounded campus telemetry context.
    Returns (response_markdown, source).
    """
    import google.generativeai as genai

    genai.configure(api_key=GEMINI_API_KEY)

    system_prompt = f"""You are NexusEco Intelligence, the AI reasoning engine of the NexusEco Campus Sustainability & Digital Twin platform.
Your mission is to provide accurate, grounded analysis of campus resource efficiency, energy optimization, water conservation, waste reduction, computer vision alerts, and facilities operations.

CRITICAL GROUNDING RULES:
1. Base all facts, numbers, and building/facility statuses STRICTLY on the real-time verified campus database telemetry provided below.
2. DO NOT fabricate, assume, or hallucinate sensor values, fictitious rooms, unmonitored facilities, or arbitrary figures.
3. If the user asks about a facility, room, or metric that does NOT exist in the campus database (e.g. swimming pool, hostel mess menu, auditorium acoustics), clearly state: "NexusEco currently has no telemetry or sensors registered for that facility in the campus database."
4. Clearly distinguish between physical sensor telemetry (e.g. water flow LPM, room electrical load kW) and simulated or calculated values (e.g. energy-saving simulation projections, estimated daily water usage).
5. Structure answers with clean, professional Markdown: bold headings, bullet points, concise summary tables when comparing data, and numbered actionable next steps for campus facilities staff.

VERIFIED CAMPUS DATABASE TELEMETRY (Snapshot as of {ctx['timestamp']}):
- Electricity Tariff: ₹{ctx['tariff_inr_per_kwh']}/kWh | Grid Emission Factor: {ctx['grid_emission_factor_kg_co2_per_kwh']} kg CO2e/kWh
- Total Campus Electrical Load: {ctx['total_current_load_kw']} kW
- Monitored Rooms Count: {ctx['total_rooms_count']} (Occupied: {ctx['occupied_rooms_count']}, Vacant: {ctx['vacant_rooms_count']})
- Energy Saved Today: {ctx['energy_saved_kwh_today']} kWh | Cost Saved: ₹{ctx['cost_saved_inr_today']:.2f} | CO2 Avoided: {ctx['co2_avoided_kg_today']:.2f} kg
- Active Water Alerts: {ctx['active_water_alerts_count']} | Active Waste Incidents: {ctx['active_waste_incidents_count']} | Open Tickets: {ctx['open_tickets_count']}
- Buildings Status:
{chr(10).join(f"  * {b['name']} ({b['code']}): {b['status'].upper()} status, {b['floors']} floors, {b['category']}" for b in ctx['buildings_summary'])}
- Vacant Rooms With Active Equipment Running (Energy Waste Anomaly):
{chr(10).join(f"  * {r['room']} ({r['building']}, Floor {r['floor']}): Load={r['current_load_kw']}kW | Lights={r['lights']}, AC={r['ac']}, Projector={r['projector']}" for r in ctx['vacant_rooms_with_equipment_on']) if ctx['vacant_rooms_with_equipment_on'] else '  * None (All vacant rooms have power turned off)'}
- Active Water Alerts:
{chr(10).join(f"  * {a['building']}: {a['alert_type']} ({a['severity']}) - Flow {a['flow_lpm']} LPM vs threshold {a['threshold_lpm']} LPM. Reason: {a['detection_reason']}. Action: {a['recommended_action']}" for a in ctx['water_alerts']) if ctx['water_alerts'] else '  * None'}
- Active Waste Incidents:
{chr(10).join(f"  * {w['building']} ({w['location']}): {w['category']} bin at {w['fill_level']}% fill ({w['severity']}). Notes: {w['notes']}" for w in ctx['waste_incidents']) if ctx['waste_incidents'] else '  * None'}
- Monitored CCTV Cameras:
{chr(10).join(f"  * {c['name']} ({c['code']}) at {c['location']} - Status: {c['status']}" for c in ctx['cameras'])}
- Urgent Maintenance Tickets:
{chr(10).join(f"  * #{t['id']} [{t['priority']}] {t['title']} ({t['building']}) - Assigned: {t['assigned_to']}" for t in ctx['maintenance_tickets']) if ctx['maintenance_tickets'] else '  * None'}
"""

    # Build history with strict Gemini SDK role mapping ('user' and 'model')
    chat_history = []
    for msg in history[-8:]:
        role = "model" if msg.role in ("assistant", "model") else "user"
        chat_history.append({"role": role, "parts": [msg.content]})

    # Initialize model with system instruction
    model_name = GEMINI_MODEL or "gemini-1.5-flash"
    try:
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_prompt,
        )
    except Exception:
        # Fallback for SDK versions that don't support system_instruction keyword
        model = genai.GenerativeModel(model_name=model_name)
        if not chat_history:
            message = f"{system_prompt}\n\nUser Question: {message}"

    chat_session = model.start_chat(history=chat_history)

    # Run blocking SDK call in background thread with timeout
    def _call_gemini():
        resp = chat_session.send_message(message)
        return resp.text

    response_text = await asyncio.wait_for(
        asyncio.to_thread(_call_gemini),
        timeout=float(GEMINI_TIMEOUT_SECONDS),
    )

    return response_text, "gemini"


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, db: Session = Depends(get_db)):
    """
    Main NexusEco Intelligence chat endpoint.
    Retrieves grounded database records and queries Gemini with verified context.
    Falls back gracefully to local rule-based analytics if the key is missing or an error occurs.
    """
    ctx = _gather_campus_context(db)

    # 1. Check if Gemini is configured
    if not is_gemini_configured():
        text, recs = _local_analytics_response(body.message, ctx)
        return ChatResponse(
            response=text,
            reply=text,
            source="local_fallback",
            structured_recommendations=recs,
        )

    # 2. Query Gemini with timeout and error handling
    try:
        text, source = await _gemini_response(body.message, body.history, ctx)
        return ChatResponse(response=text, reply=text, source=source)
    except asyncio.TimeoutError:
        display_error = "Gemini API request timed out. Switched to local analytics fallback."
    except Exception as exc:
        err_str = str(exc)
        # Sanitize error message to never leak raw key or internal traces
        if any(term in err_str.upper() for term in ["API_KEY", "PERMISSION_DENIED", "UNAUTHENTICATED", "INVALID_ARGUMENT"]):
            display_error = "Invalid or unauthorized Gemini API key. Please check GEMINI_API_KEY in backend/.env."
        elif any(term in err_str.upper() for term in ["QUOTA", "RESOURCE_EXHAUSTED", "429"]):
            display_error = "Gemini API rate limit or quota exceeded. Switched to local analytics fallback."
        elif any(term in err_str.upper() for term in ["CONNECTION", "NETWORK", "UNAVAILABLE"]):
            display_error = "Unable to reach Gemini API servers. Switched to local analytics fallback."
        else:
            clean_err = err_str.split("\n")[0][:100]
            display_error = f"Gemini API error ({clean_err}). Switched to local analytics fallback."

    # 3. Fall back to local analytics if Gemini fails
    text, recs = _local_analytics_response(body.message, ctx)
    return ChatResponse(
        response=text,
        reply=text,
        source="local_fallback",
        structured_recommendations=recs,
        error=display_error,
    )


@router.get("/context")
def get_context(db: Session = Depends(get_db)):
    """Return verified current campus telemetry context for transparency and debugging."""
    return _gather_campus_context(db)
