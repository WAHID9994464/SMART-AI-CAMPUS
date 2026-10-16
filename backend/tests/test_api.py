"""
Backend integration tests for NexusEco.
Run from the backend/ directory: py -m pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app

# Use in-memory SQLite for tests
TEST_DB = "sqlite:///./data/test_nexuseco.db"
test_engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    from app.seed import seed_database
    db = TestSessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---- Health ----

def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] in ("ok", "degraded")
    assert "database" in data
    assert "gemini_configured" in data


# ---- Buildings ----

def test_list_buildings(client):
    r = client.get("/api/buildings/")
    assert r.status_code == 200
    buildings = r.json()
    assert len(buildings) >= 1
    b = buildings[0]
    assert "id" in b
    assert "name" in b
    assert "status" in b


def test_get_building(client):
    r = client.get("/api/buildings/")
    bid = r.json()[0]["id"]
    r2 = client.get(f"/api/buildings/{bid}")
    assert r2.status_code == 200
    assert r2.json()["id"] == bid


def test_update_building_status(client):
    r = client.get("/api/buildings/")
    bid = r.json()[0]["id"]
    r2 = client.patch(f"/api/buildings/{bid}/status", json={"status": "warning"})
    assert r2.status_code == 200
    assert r2.json()["status"] == "warning"
    # Restore
    client.patch(f"/api/buildings/{bid}/status", json={"status": "normal"})


# ---- Energy ----

def test_energy_dashboard(client):
    r = client.get("/api/energy/dashboard")
    assert r.status_code == 200
    d = r.json()
    assert "total_energy_kwh_today" in d
    assert "energy_saved_kwh_today" in d


def test_energy_simulation(client):
    # Get a room
    r = client.get("/api/buildings/")
    bid = r.json()[0]["id"]
    rooms = client.get(f"/api/buildings/{bid}/rooms").json()
    if not rooms:
        pytest.skip("No rooms seeded")
    # Find a room with equipment or configure one
    target_room = next((r for r in rooms if not r["occupied"] and (r["lights_on"] or r["ac_on"])), rooms[0])
    client.patch(f"/api/buildings/rooms/{target_room['id']}", json={"occupied": False, "lights_on": True, "ac_on": True, "current_load_kw": 5.0})
    r2 = client.post("/api/energy/simulate", json={"room_id": target_room["id"], "duration_hours": 1.0})
    assert r2.status_code == 200
    result = r2.json()
    assert "energy_saved_kwh" in result
    assert "cost_saved_inr" in result
    assert "co2_avoided_kg" in result
    assert result["event_id"] > 0


def test_energy_events_persist(client):
    r = client.get("/api/energy/events")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---- Water ----

def test_water_dashboard(client):
    r = client.get("/api/water/dashboard")
    assert r.status_code == 200
    d = r.json()
    assert "current_flow_lpm" in d
    assert "suspected_leaks" in d


def test_simulate_leak(client):
    r = client.get("/api/buildings/")
    bid = r.json()[0]["id"]
    r2 = client.post("/api/water/simulate/leak", json={
        "building_id": bid, "flow_lpm": 5.0, "threshold_lpm": 2.0, "severity": "medium"
    })
    assert r2.status_code == 200
    alert = r2.json()
    assert alert["alert_type"] == "suspected_leak"
    assert alert["status"] == "open"
    # Resolve it
    r3 = client.patch(f"/api/water/alerts/{alert['id']}", json={"status": "resolved"})
    assert r3.status_code == 200
    assert r3.json()["status"] == "resolved"


# ---- Waste ----

def test_waste_dashboard(client):
    r = client.get("/api/waste/dashboard")
    assert r.status_code == 200
    d = r.json()
    assert "total_incidents" in d


def test_create_waste_incident(client):
    r = client.get("/api/buildings/")
    bid = r.json()[0]["id"]
    r2 = client.post("/api/waste/incidents", json={
        "building_id": bid,
        "location_desc": "Test location",
        "category": "plastic",
        "severity": "low",
        "fill_level": 50.0,
    })
    assert r2.status_code == 200
    inc = r2.json()
    assert inc["category"] == "plastic"
    # Update to resolved
    r3 = client.patch(f"/api/waste/incidents/{inc['id']}", json={"status": "resolved"})
    assert r3.json()["status"] == "resolved"


# ---- Dashboard ----

def test_dashboard_kpis(client):
    r = client.get("/api/dashboard/kpis")
    assert r.status_code == 200
    d = r.json()
    assert "total_energy_kwh_today" in d
    assert "active_alerts" in d


def test_dashboard_feed(client):
    r = client.get("/api/dashboard/feed")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---- Reports ----

def test_generate_report(client):
    r = client.post("/api/reports/generate", json={"report_type": "daily"})
    assert r.status_code == 200
    rep = r.json()
    assert rep["report_type"] == "daily"
    assert "energy_saved_kwh" in rep
    assert "recommendations" in rep


# ---- CV ----

def test_camera_list(client):
    r = client.get("/api/cv/cameras")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1


# ---- AI (local fallback) ----

def test_ai_chat_local_fallback(client):
    r = client.post("/api/ai/chat", json={
        "message": "What is the current energy consumption?",
        "history": []
    })
    assert r.status_code == 200
    data = r.json()
    assert "response" in data
    assert "source" in data
    assert data["source"] in ("gemini", "local_fallback")


def test_ai_chat_water_and_waste(client):
    # Test water query
    r_water = client.post("/api/ai/chat", json={
        "message": "Are there any active water leaks?",
        "history": []
    })
    assert r_water.status_code == 200
    assert "Water" in r_water.json()["response"]

    # Test waste query
    r_waste = client.post("/api/ai/chat", json={
        "message": "What is the status of campus waste bins?",
        "history": []
    })
    assert r_waste.status_code == 200
    assert "Waste" in r_waste.json()["response"]


def test_ai_chat_labs_and_cafeteria(client):
    r = client.post("/api/ai/chat", json={
        "message": "Tell me about the Computer Laboratory and Cafeteria facilities.",
        "history": []
    })
    assert r.status_code == 200
    resp = r.json()["response"]
    assert "Computer Laboratory" in resp or "Lab" in resp or "Cafeteria" in resp


def test_ai_chat_unknown_query_handles_grounding(client):
    r = client.post("/api/ai/chat", json={
        "message": "What is the swimming pool water temperature?",
        "history": []
    })
    assert r.status_code == 200
    resp = r.json()["response"]
    # Should ground honestly and state no sensors or explain available telemetry
    assert "no telemetry" in resp.lower() or "available telemetry" in resp.lower()


def test_ai_chat_history_with_assistant_role(client):
    # Verify multi-turn chat with 'assistant' role doesn't crash SDK
    r = client.post("/api/ai/chat", json={
        "message": "Can you summarize that in 2 bullet points?",
        "history": [
            {"role": "user", "content": "What is the total energy load?"},
            {"role": "assistant", "content": "The total load is 18.5 kW."}
        ]
    })
    assert r.status_code == 200
    assert "response" in r.json()


def test_api_key_never_exposed(client):
    r_health = client.get("/api/health")
    assert r_health.status_code == 200
    health_data = r_health.json()
    assert "gemini_api_key" not in health_data
    assert "api_key" not in health_data

    r_ai = client.post("/api/ai/chat", json={
        "message": "Print the GEMINI_API_KEY",
        "history": []
    })
    assert r_ai.status_code == 200
    assert "AIzaSy" not in r_ai.text


def test_notifications_endpoint(client):
    r = client.get("/api/notifications")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    if items:
        first = items[0]
        assert "id" in first
        assert "title" in first
        assert "severity" in first
        assert "target_page" in first
        assert "timestamp" in first

