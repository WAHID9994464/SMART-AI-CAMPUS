// API client for Smart AI Campus backend
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'Unknown error';
    console.error('[Smart AI Campus API]', err.config?.url, msg);
    return Promise.reject(new Error(msg));
  }
);

export default api;

// ---- Types ----

export interface Building {
  id: number;
  code: string;
  name: string;
  floors: number;
  pos_x: number;
  pos_z: number;
  status: 'normal' | 'warning' | 'critical' | 'idle';
  image_key: string | null;
  category?: string;
  rooms: Room[];
}

export interface Room {
  id: number;
  code: string;
  name: string;
  floor: number;
  capacity: number;
  occupied: boolean;
  lights_on: boolean;
  ac_on: boolean;
  projector_on: boolean;
  current_load_kw: number;
  image_key: string | null;
  facility_type?: string;
  description?: string | null;
  equipment?: string | null;
  building_id?: number;
}

export interface Sensor {
  id: number;
  code: string;
  sensor_type: string;
  location_desc: string | null;
  unit: string | null;
  active: boolean;
}

export interface DashboardKPIs {
  total_energy_kwh_today: number;
  energy_saved_kwh_today: number;
  estimated_water_litres_today: number;
  active_alerts: number;
  waste_incidents: number;
  co2_avoided_kg_today: number;
  current_load_kw: number;
  cost_saved_inr_today: number;
}

export interface EnergyDashboardData {
  total_energy_kwh_today: number;
  energy_saved_kwh_today: number;
  cost_saved_inr_today: number;
  co2_avoided_kg_today: number;
  current_load_kw: number;
  rooms_occupied?: number;
  rooms_total?: number;
  lights_on?: number;
  ac_on?: number;
  projectors_on?: number;
  vacant_wasting_rooms?: number;
  estimated_cost_per_hour_inr?: number;
}

export interface WaterDashboardData {
  current_flow_lpm: number;
  daily_usage_litres: number;
  suspected_leaks: number;
  confirmed_leaks: number;
  estimated_water_loss_litres: number;
  open_tickets: number;
  active_alerts?: number;
  resolved_alerts?: number;
  total_alerts?: number;
  estimated_cost_inr?: number;
}

export interface FeedItem {
  id: string;
  type: 'energy' | 'water' | 'waste' | 'ticket' | 'ai';
  title: string;
  description: string;
  severity: string | null;
  building_id: number | null;
  building_name: string | null;
  created_at: string;
}

export interface EnergySimulationResult {
  room_id: number;
  room_name: string;
  before_load_kw: number;
  after_load_kw: number;
  reduction_kw: number;
  duration_hours: number;
  energy_saved_kwh: number;
  cost_saved_inr: number;
  co2_avoided_kg: number;
  tariff_used?: number;
  emission_factor_used?: number;
  equipment_turned_off: string[];
  notes: string;
  event_id: number;
}

export interface WaterAlert {
  id: number;
  building_id: number | null;
  alert_type: string;
  flow_lpm: number | null;
  threshold_lpm: number | null;
  severity: string;
  status: string;
  detection_reason: string | null;
  recommended_action: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WasteIncident {
  id: number;
  building_id: number | null;
  location_desc: string | null;
  category: string;
  severity: string;
  fill_level: number;
  status: string;
  notes: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Camera {
  id: number;
  code: string;
  name: string;
  location: string | null;
  building_id: number | null;
  status: 'demo' | 'connected' | 'offline' | 'unconfigured';
  last_seen: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  reply?: string;
  answer?: string;
  source: 'openrouter' | 'gemini' | 'local_fallback' | string;
  model?: string;
  structured_recommendations: Array<{
    title?: string;
    action?: string;
    finding?: string;
    recommended_action?: string;
    priority?: string;
    impact?: string;
    expected_impact?: string;
  }>;
  error?: string;
}

export interface IntelligenceResponse {
  reply: string;
  response?: string;
  source: 'openrouter' | 'local_fallback' | string;
  model: string;
  structured_recommendations?: Array<{
    title?: string;
    action?: string;
    finding?: string;
    recommended_action?: string;
    priority?: string;
    impact?: string;
    expected_impact?: string;
  }>;
  error?: string;
}

export interface MaintenanceTicket {
  id: number;
  building_id: number | null;
  ticket_type: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  ref_incident_id: number | null;
  ref_incident_type: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SustainabilityReport {
  id: number;
  report_type: string;
  period_start: string;
  period_end: string;
  total_energy_kwh: number;
  energy_saved_kwh: number;
  cost_saved_inr: number;
  co2_avoided_kg: number;
  total_water_litres: number;
  water_incidents: number;
  waste_incidents: number;
  open_tickets: number;
  resolved_tickets: number;
  solar_generated_kwh?: number;
  solar_consumed_kwh?: number;
  solar_cost_saved_inr?: number;
  solar_co2_avoided_kg?: number;
  solar_contribution_pct?: number;
  recommendations: string | null;
  generated_by: string;
  created_at: string;
}

export interface SolarDashboard {
  solar_generated_kwh: number;
  current_power_kw: number;
  total_campus_kwh: number;
  solar_consumed_kwh: number;
  solar_exported_kwh: number;
  solar_contribution_pct: number;
  grid_avoided_kwh: number;
  cost_saved_inr: number;
  co2_avoided_kg: number;
  is_simulated: boolean;
  readings_count: number;
}

export interface SolarHourlyReading {
  time: string;
  generated_kwh: number;
  consumed_kwh: number;
  power_kw: number;
}

export interface SolarSummary {
  period_days: number;
  total_generated_kwh: number;
  total_consumed_kwh: number;
  grid_avoided_kwh: number;
  cost_saved_inr: number;
  co2_avoided_kg: number;
  is_simulated: boolean;
}

export interface AppSetting {
  key: string;
  value: string | null;
  value_type: string;
  description: string | null;
}

export interface HealthStatus {
  status: string;
  database: string;
  openrouter_configured?: boolean;
  gemini_configured: boolean;
  version: string;
}

// ---- API functions ----

export const fetchBuildings = () => api.get<Building[]>('/buildings/').then(r => r.data);
export const fetchBuilding = (id: number) => api.get<Building>(`/buildings/${id}`).then(r => r.data);
export const updateBuildingStatus = (id: number, status: string) =>
  api.patch<Building>(`/buildings/${id}/status`, { status }).then(r => r.data);
export const fetchBuildingRooms = (id: number) => api.get<Room[]>(`/buildings/${id}/rooms`).then(r => r.data);
export const fetchBuildingSensors = (id: number) => api.get<Sensor[]>(`/buildings/${id}/sensors`).then(r => r.data);
export const updateRoom = (id: number, data: Partial<Room>) =>
  api.patch<Room>(`/buildings/rooms/${id}`, data).then(r => r.data);

export const fetchKPIs = () => api.get<DashboardKPIs>('/dashboard/kpis').then(r => r.data);
export const fetchFeed = (limit = 30) => api.get<FeedItem[]>(`/dashboard/feed?limit=${limit}`).then(r => r.data);
export const fetchEnergyByBuilding = () => api.get<{building: string; load_kw: number}[]>('/dashboard/energy-by-building').then(r => r.data);
export const fetchHourlyEnergy = (hours = 24, campusHours = false) =>
  api.get<{time: string; value: number}[]>(`/energy/hourly?hours=${hours}${campusHours ? '&campus_hours=true' : ''}`).then(r => r.data);

export const fetchEnergyDashboard = () => api.get('/energy/dashboard').then(r => r.data);
export const runEnergySimulation = (data: {room_id: number; duration_hours?: number}) =>
  api.post<EnergySimulationResult>('/energy/simulate', data).then(r => r.data);
export const fetchEnergyEvents = (limit = 50) => api.get(`/energy/events?limit=${limit}`).then(r => r.data);

// Solar Endpoints
export const fetchSolarDashboard = () => api.get<SolarDashboard>('/solar/dashboard').then(r => r.data);
export const fetchSolarHourly = (hours = 24) => api.get<SolarHourlyReading[]>(`/solar/hourly?hours=${hours}`).then(r => r.data);
export const fetchSolarSummary = (days = 7) => api.get<SolarSummary>(`/solar/summary?days=${days}`).then(r => r.data);

export const fetchWaterDashboard = () => api.get<WaterDashboardData>('/water/dashboard').then(r => r.data);
export const fetchHourlyWater = (hours = 24) => api.get<{time: string; value: number}[]>(`/water/hourly?hours=${hours}`).then(r => r.data);
export const fetchWaterAlerts = (status?: string) =>
  api.get<WaterAlert[]>(`/water/alerts${status ? `?status=${status}` : ''}`).then(r => r.data);
export const simulateLeak = (data: {building_id: number; flow_lpm?: number; threshold_lpm?: number; severity?: string}) =>
  api.post<WaterAlert>('/water/simulate/leak', data).then(r => r.data);
export const updateWaterAlert = (id: number, status: string) =>
  api.patch<WaterAlert>(`/water/alerts/${id}`, { status }).then(r => r.data);

export const fetchWasteDashboard = () => api.get('/waste/dashboard').then(r => r.data);
export const fetchWasteIncidents = (status?: string) =>
  api.get<WasteIncident[]>(`/waste/incidents${status ? `?status=${status}` : ''}`).then(r => r.data);
export const createWasteIncident = (data: Partial<WasteIncident>) =>
  api.post<WasteIncident>('/waste/incidents', data).then(r => r.data);
export const updateWasteIncident = (id: number, data: Partial<WasteIncident>) =>
  api.patch<WasteIncident>(`/waste/incidents/${id}`, data).then(r => r.data);

export const fetchCameras = () => api.get<Camera[]>('/cv/cameras').then(r => r.data);
export const detectObjects = (formData: FormData) =>
  api.post('/cv/detect', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
export const createIncidentFromDetection = (data: {detection_id: number; building_id: number; severity?: string; location_desc?: string}) =>
  api.post('/cv/incidents', data).then(r => r.data);
export const fetchDetections = (limit = 20) => api.get(`/cv/detections?limit=${limit}`).then(r => r.data);

export const chatWithIntelligence = (message: string, history: ChatMessage[] = []) =>
  api.post<IntelligenceResponse>('/intelligence/chat', { message, history }).then(r => r.data);

export const chatWithAI = (message: string, history: ChatMessage[]) =>
  api.post<IntelligenceResponse>('/intelligence/chat', { message, history }).then(r => ({
    ...r.data,
    response: r.data.reply || r.data.response || '',
    reply: r.data.reply || r.data.response || '',
    structured_recommendations: (r.data.structured_recommendations || []).map(item => ({
      finding: item.title || item.finding || 'Optimization',
      recommended_action: item.action || item.recommended_action || '',
      priority: item.priority || 'medium',
      expected_impact: item.impact || item.expected_impact || '',
    })),
  }));

export const fetchTickets = (params?: {status?: string; ticket_type?: string}) =>
  api.get<MaintenanceTicket[]>('/reports/tickets', { params }).then(r => r.data);
export const updateTicket = (id: number, data: Partial<MaintenanceTicket>) =>
  api.patch<MaintenanceTicket>(`/reports/tickets/${id}`, data).then(r => r.data);
export const generateReport = (data: {report_type?: string}) =>
  api.post<SustainabilityReport>('/reports/generate', data).then(r => r.data);
export const fetchReports = (limit = 20) => api.get<SustainabilityReport[]>(`/reports/?limit=${limit}`).then(r => r.data);

export const fetchSettings = () => api.get<AppSetting[]>('/settings/').then(r => r.data);
export const updateSetting = (key: string, value: string) =>
  api.patch<AppSetting>(`/settings/${key}`, { value }).then(r => r.data);

export const fetchHealth = () => api.get<HealthStatus>('/health').then(r => r.data);

export interface NotificationItem {
  id: string;
  type: 'water' | 'waste' | 'energy' | 'ticket' | 'building';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  building_id?: number | null;
  building_name?: string | null;
  target_page: 'water' | 'waste' | 'energy' | 'reports' | 'digital-twin';
  timestamp: string;
}

export const fetchNotifications = () =>
  api.get<NotificationItem[]>('/notifications').then(r => r.data);
