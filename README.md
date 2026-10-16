# SMART AI CAMPUS — AI-Powered Sustainable Campus

> **Tagline:** See Waste. Predict Impact. Build a Greener Campus.

NexusEco is an AI-powered Digital Twin command centre that integrates 3D campus visualisation, Computer Vision, simulated telemetry, and Generative AI to detect waste accumulation, eliminate energy wastage, catch water leakage, and generate actionable sustainability reports.

---

## 1. Visual Identity & Design System

The interface uses a sustainability-tech command centre dark theme with three primary natural colour families:

- **Camel:** Warm sand and muted tan accents (`#c8883a`, `#e0be82`, `#8f5a25`).
- **Black Earth:** Deep black-brown backgrounds and glass surfaces (`#0a0704`, `#140e0a`, `#26201a`).
- **Robin Hood:** Rich forest green for healthy states, operational efficiency, and positive sustainability metrics (`#3d9440`, `#5ab25a`, `#246028`).

Neutral, institution-agnostic campus labels are used throughout (Academic Block A, Library, Engineering Laboratory, Computer Laboratory, Classroom A101, Cafeteria, etc.).

---

## 2. Technology Stack

### Frontend
- **React 19** with **TypeScript**
- **Vite 6** & **Tailwind CSS v4** (`@tailwindcss/vite`)
- **React Three Fiber (R3F)** & **Three.js** & **@react-three/drei** for the 3D Digital Twin
- **Recharts** for hourly and building-level energy telemetry
- **Lucide React** for icons
- **Axios** with global interceptors and typed API contract

### Backend
- **Python 3.13**
- **FastAPI** with async lifespan and modular routers
- **SQLAlchemy 2.0** ORM with relationship cascading and SQLite persistence
- **Pydantic v2** request and response schemas
- **OpenCV (`opencv-python-headless`)** for color-based waste segmentation and bounding boxes
- **Google Gemini API (`google-generativeai`)** for campus intelligence with automatic local analytics fallback
- **Pytest** and **HTTPX** for integration tests

---

## 3. Implemented Navigation & Pages

The application features a persistent responsive sidebar and compact top navigation bar supporting 9 functional modules:

1. **Overview Dashboard:** Live KPI cards (Energy Consumed, Energy Saved, Water Usage, Active Alerts, Waste Incidents, CO₂e Avoided), 24h hourly energy line chart, building load bar chart, and real-time operations feed.
2. **3D Digital Twin:** Interactive 3D campus with procedural architecture, lighting, roads, trees, waste collection points, orbit/zoom/pan controls, camera focus animations, status color mapping (Robin Hood, Camel, Red, Dark Neutral), real-time building panel with facility photographs, and an automatic WebGL fallback.
3. **Computer Vision:** Camera selector (Main Entrance, Academic Corridor, Library, Cafeteria, Waste Collection Zone, Engineering Lab) with explicit states (Demo, Connected, Offline, Unconfigured), image upload/drag-and-drop, OpenCV color segmentation with bounding box rendering, and single-click incident creation linked to buildings.
4. **Energy Management:** Real-time load metrics, room selector with interactive device toggles (Occupancy, Lights, AC, Projector), and a prominent **Run Energy-Saving Simulation** button that computes power reduction, tariff savings (₹), and avoided emissions (kg CO₂e), updating the digital twin and dashboard in real time.
5. **Water Management:** Flow rate monitors (LPM), estimated daily consumption, active leak detection with configurable flow thresholds, simulated leak trigger, confirmation, and one-click resolution.
6. **Waste Management:** Collection points, bin fill-level progress bars, CV-linked incidents, priority collection assignment, and incident resolution tracking.
7. **NexusEco Intelligence:** Chat assistant powered by Google Gemini API with system context injection (campus load, vacant rooms, active leaks, open tickets). Automatically switches to an offline **Local Analytics Fallback** when credentials are not configured or rate-limited.
8. **Sustainability Reports:** Automated daily and weekly reporting with period aggregation, KPI summaries, ticket statuses, AI recommendations, and browser print export.
9. **Settings:** Health and database connection monitor, Gemini integration status, editable electricity tariff (₹/kWh), grid emission factor, idle-delay threshold, simulation mode, and secure credential handling.

---

## 4. Directory Structure

```text
NexusEco/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py             # Environment config and directory setup
│   │   ├── database.py           # SQLAlchemy engine & session factory
│   │   ├── main.py               # FastAPI entry point, lifespan, CORS & router registration
│   │   ├── models.py             # ORM models (Buildings, Rooms, Sensors, Alerts, Tickets, Reports)
│   │   ├── seed.py               # Idempotent database seeder with sample data
│   │   ├── routers/
│   │   │   ├── ai.py             # Gemini chat & local analytics fallback
│   │   │   ├── buildings.py      # Building and room management endpoints
│   │   │   ├── cv.py             # Camera listing, image upload, object detection & incident creation
│   │   │   ├── dashboard.py       # KPIs, operations feed, building loads & settings
│   │   │   ├── energy.py         # Energy dashboard & simulation engine
│   │   │   ├── reports.py        # Maintenance tickets & sustainability reports
│   │   │   ├── waste.py          # Waste dashboard & incident workflows
│   │   │   └── water.py          # Water monitoring & leak simulation
│   │   └── services/
│   │       └── cv_service.py     # OpenCV image analysis & color segmentation
│   ├── data/
│   │   └── nexuseco.db           # Persistent SQLite database (survives restarts)
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_api.py           # 16 automated integration tests
│   ├── uploads/                  # Persistent image upload storage
│   ├── .env.example              # Environment variables template
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── public/
│   │   └── campus/               # Supplied campus photographs
│   ├── src/
│   │   ├── api.ts                # Typed Axios API client & data interfaces
│   │   ├── App.tsx               # App shell, persistent sidebar, navigation & telemetry
│   │   ├── index.css             # Tailwind v4 theme, CSS variables & design tokens
│   │   ├── main.tsx              # React DOM root
│   │   ├── utils.ts              # Status colors, badge helpers & asset mappers
│   │   └── pages/
│   │       ├── ComputerVision.tsx
│   │       ├── Dashboard.tsx
│   │       ├── DigitalTwin.tsx   # React Three Fiber 3D scene
│   │       ├── EnergyManagement.tsx
│   │       ├── NexusIntelligence.tsx
│   │       ├── Settings.tsx
│   │       ├── SustainabilityReports.tsx
│   │       ├── WasteManagement.tsx
│   │       └── WaterManagement.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.app.json
│   └── vite.config.ts
├── assets/
│   └── campus/                   # Original photographic assets
└── README.md
```

---

## 5. Getting Started & Installation

### Prerequisites
- **Node.js**: v20+ (tested on Node v24)
- **Python**: 3.11+ (tested on Python 3.13)
- **npm**: 10+

---

### Step 1: Backend Setup

1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Edit `.env` if you wish to set a Google Gemini API key or customize tariffs).*
5. Start the backend server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   The backend API will be live at `http://127.0.0.1:8000`. You can explore interactive docs at `http://127.0.0.1:8000/docs`.

---

### Step 2: Frontend Setup

1. Open a second terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## 6. Configuring Google Gemini AI

NexusEco is designed to function out-of-the-box even **without** an API key through its built-in **Local Analytics Fallback engine**.

To enable full Generative AI reasoning with Google Gemini:
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. Add your key to `backend/.env`:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   ```
3. Restart the backend server. The telemetry widget in the application will indicate `Gemini Active`.

---

## 7. Database Persistence & Backup

- **Local Development:** NexusEco stores all relational state in `backend/data/nexuseco.db` via SQLite.
- **Restart Resilience:** The database schema is initialized using `create_all(checkfirst=True)` and seed routines are strictly idempotent. Simulated energy events, water alerts, CV detections, and reports persist across server restarts.
- **Backup:**
  ```bash
  # Manual backup of database
  cp backend/data/nexuseco.db backend/data/nexuseco_backup_$(date +%Y%m%d).db
  ```
- **Production Deployment Note:** On containerized or cloud platforms with ephemeral storage (e.g. AWS ECS, Render, Heroku), configure a persistent volume mount for `backend/data` and `backend/uploads`, or set `DATABASE_URL=postgresql://user:password@host:5432/nexuseco` in `.env`.

---

## 8. Running Automated Tests

### Backend Integration Tests (Pytest)
From the `backend/` directory:
```bash
pytest tests/test_api.py -v
```
All 16 test cases verify:
- Health and database connection checks
- Building retrieval and real-time status transitions
- Vacant-room energy simulation math & event persistence
- Water leak detection, alert triggering, and resolution
- Waste incident tracking and ticket generation
- Computer vision detection endpoints and camera listing
- AI local analytics fallback grounding
- Sustainability report generation

### Frontend Type Check & Build
From the `frontend/` directory:
```bash
npm run build
```
Executes TypeScript compilation (`tsc -b`) and generates production bundles in `frontend/dist/`.

---

## 9. Implemented Features & Known Limitations

### Implemented Features
- **True 3D Campus:** Complete interactive procedural 3D world with lighting, smooth camera lerping, and building focus.
- **Visual References:** Supplied campus photographs (`School Of Engineering.jpg`, `Library.jpg`, `Classroom.jpg`, `Tutorial Room.jpg`, `physics-lab.jpg`, `chemistry-lab.jpg`) integrated into building and facility inspection views.
- **Transparent Simulation:** Energy, water, and waste simulators explicitly calculate realistic savings according to standard physical formulas and display appropriate disclaimers.
- **Zero Mock Fallacy:** Never fabricates live video feeds or pretend ML scores. Demo modes and analytical fallbacks are clearly labeled.

### Known Limitations & Honest Disclaimers
- **Hardware Integration:** The energy toggles and water simulators demonstrate computational controls; they do not physically switch relays on campus equipment without authorized IoT hardware bridges.
- **Computer Vision:** In the absence of a dedicated pre-trained YOLO weights file, the backend runs genuine OpenCV HSV color segmentation for waste contours, with an explicitly labeled demo fallback.
- **CCTV Feeds:** Video streams are simulated or connected via configurable RTSP/HLS stream URLs; static photographs are never misrepresented as live CCTV video.
