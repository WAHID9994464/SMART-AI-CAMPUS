import React, { useEffect, useState, useCallback } from 'react';
import {
  Zap,
  Lightbulb,
  Wind,
  Monitor,
  Users,
  Play,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  Info,
  CheckCircle2,
  Clock,
  Building as BuildingIcon,
  Sun,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  fetchEnergyDashboard,
  fetchBuildings,
  updateRoom,
  runEnergySimulation,
  fetchEnergyEvents,
  fetchHourlyEnergy,
  fetchEnergyByBuilding,
  fetchSolarDashboard,
  type Building,
  type Room,
  type EnergySimulationResult,
  type EnergyDashboardData,
  type SolarDashboard,
} from '../api';
import {
  formatNumber,
  formatShortDate,
  CAMPUS_HOURS,
  formatHourLabel,
  filterToCampusHours,
  isWithinCampusHours,
} from '../utils';

interface EnergyEvent {
  id: number;
  room_id: number | null;
  building_id: number | null;
  before_load_kw: number;
  after_load_kw: number;
  reduction_kw: number;
  duration_hours: number;
  energy_saved_kwh: number;
  cost_saved_inr: number;
  co2_avoided_kg: number;
  notes: string | null;
  created_at: string;
}

const DURATION_OPTIONS = [
  { label: '30 min', value: 0.5 },
  { label: '1 hour', value: 1.0 },
  { label: '2 hours', value: 2.0 },
  { label: '4 hours', value: 4.0 },
  { label: '8 hours', value: 8.0 },
];

export default function EnergyManagement() {
  const [dashboard, setDashboard] = useState<EnergyDashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [roomUpdating, setRoomUpdating] = useState(false);
  const [roomSuccessMsg, setRoomSuccessMsg] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  const [duration, setDuration] = useState(1.0);
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<EnergySimulationResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const [events, setEvents] = useState<EnergyEvent[]>([]);
  const [hourlyData, setHourlyData] = useState<{ time: string; value: number }[]>([]);
  const [byBuildingData, setByBuildingData] = useState<{ building: string; load_kw: number }[]>([]);

  // Solar Telemetry State
  const [solarData, setSolarData] = useState<SolarDashboard | null>(null);
  const [solarLoading, setSolarLoading] = useState(true);

  // Collect flat list of all rooms
  const allRooms = buildings.flatMap((b) =>
    (b.rooms || []).map((r) => ({ ...r, buildingName: b.name }))
  );

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      const data = await fetchEnergyDashboard();
      setDashboard(data);
    } catch (e: unknown) {
      setDashError((e as Error).message);
    } finally {
      setDashLoading(false);
    }
  }, []);

  const loadSolar = useCallback(async () => {
    setSolarLoading(true);
    try {
      const data = await fetchSolarDashboard();
      setSolarData(data);
    } catch {
      // ignore
    } finally {
      setSolarLoading(false);
    }
  }, []);

  const loadBuildings = useCallback(async () => {
    setBuildingsLoading(true);
    try {
      const data = await fetchBuildings();
      setBuildings(data);
      // Auto select first room if none selected
      if (!selectedRoomId && data.length > 0 && data[0].rooms?.length > 0) {
        setSelectedRoomId(data[0].rooms[0].id);
      }
    } catch {
      // ignore
    } finally {
      setBuildingsLoading(false);
    }
  }, [selectedRoomId]);

  const loadEventsAndCharts = useCallback(async () => {
    try {
      const [evts, hourly, bldg] = await Promise.all([
        fetchEnergyEvents(20),
        fetchHourlyEnergy(24),
        fetchEnergyByBuilding(),
      ]);
      setEvents(evts);
      // Filter to standard campus operating window (08:00 - 16:00 IST)
      const filtered = filterToCampusHours(hourly).map((h) => ({
        time: formatHourLabel(h.time),
        value: h.value,
      }));
      setHourlyData(filtered);
      setByBuildingData(bldg);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadBuildings();
    loadEventsAndCharts();
    loadSolar();

    // Live runtime polling every 30s for real-time telemetry updates
    const interval = setInterval(() => {
      loadDashboard();
      loadEventsAndCharts();
      loadSolar();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard, loadBuildings, loadEventsAndCharts, loadSolar]);

  // Sync current room when selectedRoomId or buildings change
  useEffect(() => {
    if (!selectedRoomId) {
      setCurrentRoom(null);
      return;
    }
    const found = allRooms.find((r) => r.id === selectedRoomId) || null;
    setCurrentRoom(found);
  }, [selectedRoomId, buildings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Patch a single room state attribute through the backend
  const handleToggleRoomField = async (field: Partial<Room>) => {
    if (!currentRoom) return;
    setRoomUpdating(true);
    setRoomError(null);
    setRoomSuccessMsg(null);
    try {
      const updated = await updateRoom(currentRoom.id, field);
      // Update local state immediately
      setBuildings((prev) =>
        prev.map((b) => ({
          ...b,
          rooms: (b.rooms || []).map((r) => (r.id === updated.id ? updated : r)),
        }))
      );
      setCurrentRoom(updated);
      setRoomSuccessMsg(`Updated ${currentRoom.name} successfully.`);
      setTimeout(() => setRoomSuccessMsg(null), 3000);
      loadDashboard();
      loadEventsAndCharts();
    } catch (e: unknown) {
      setRoomError((e as Error).message);
    } finally {
      setRoomUpdating(false);
    }
  };

  // Run Energy-Saving Simulation
  const handleRunSimulation = async () => {
    if (!selectedRoomId) return;
    setSimRunning(true);
    setSimError(null);
    setSimResult(null);
    try {
      const result = await runEnergySimulation({
        room_id: selectedRoomId,
        duration_hours: duration,
      });
      setSimResult(result);
      // Refresh current room and dashboard metrics
      await Promise.all([loadBuildings(), loadDashboard(), loadEventsAndCharts()]);
    } catch (e: unknown) {
      setSimError((e as Error).message);
    } finally {
      setSimRunning(false);
    }
  };

  const isRoomWastingEnergy =
    currentRoom &&
    !currentRoom.occupied &&
    (currentRoom.lights_on || currentRoom.ac_on || currentRoom.projector_on);

  return (
    <div className="flex flex-col gap-6 p-6 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#2E6B45]/15 text-[#2E6B45] flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#292D29]">Energy Management</h1>
              <p className="text-xs text-[#6D716A]">
                Intelligent load monitoring, vacant room shut-off, and verified tariff savings
              </p>
            </div>
          </div>
        </div>

        <button
          className="btn-secondary text-xs self-start sm:self-auto"
          onClick={() => {
            loadDashboard();
            loadBuildings();
            loadEventsAndCharts();
          }}
        >
          <RefreshCw size={13} />
          Refresh Telemetry
        </button>
      </div>

      {/* KPI Cards in Warm Sustainability Palette */}
      {dashLoading && !dashboard ? (
        <div className="flex items-center justify-center p-8 text-sm text-[#6D716A]">
          <div className="spinner mr-2" /> Loading energy telemetry…
        </div>
      ) : dashError ? (
        <div className="p-3 bg-red-50 border border-red-200 text-[#C94A42] rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>Error loading energy metrics: {dashError}</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          <div className="kpi-card">
            <p className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">Total Consumed Today</p>
            <p className="text-2xl font-bold text-[#292D29] mt-1">
              {formatNumber(dashboard?.total_energy_kwh_today, 1)}
              <span className="text-xs font-normal text-[#6D716A] ml-1">kWh</span>
            </p>
          </div>

          <div className="kpi-card border-l-4 border-l-[#2E6B45]">
            <p className="text-[11px] font-semibold text-[#2E6B45] uppercase tracking-wider">Energy Saved Today</p>
            <p className="text-2xl font-bold text-[#2E6B45] mt-1">
              {formatNumber(dashboard?.energy_saved_kwh_today, 2)}
              <span className="text-xs font-normal text-[#2E6B45]/80 ml-1">kWh</span>
            </p>
          </div>

          <div className="kpi-card">
            <p className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">Current Power Load</p>
            <p className="text-2xl font-bold text-[#C19A6B] mt-1">
              {formatNumber(dashboard?.current_load_kw, 1)}
              <span className="text-xs font-normal text-[#6D716A] ml-1">kW</span>
            </p>
          </div>

          <div className="kpi-card">
            <p className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">Cost Savings</p>
            <p className="text-2xl font-bold text-[#2E6B45] mt-1">
              ₹{formatNumber(dashboard?.cost_saved_inr_today, 2)}
            </p>
          </div>

          <div className="kpi-card">
            <p className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">Avoided CO₂e</p>
            <p className="text-2xl font-bold text-[#2E6B45] mt-1">
              {formatNumber(dashboard?.co2_avoided_kg_today, 2)}
              <span className="text-xs font-normal text-[#6D716A] ml-1">kg</span>
            </p>
          </div>

          <div className="kpi-card">
            <p className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">Vacant Wasting</p>
            <p className="text-2xl font-bold text-[#D89A35] mt-1">
              {dashboard?.vacant_wasting_rooms ?? 0}
              <span className="text-xs font-normal text-[#6D716A] ml-1">rooms</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Solar Energy & Clean Power Savings ── */}
      <div className="card-surface p-5 border border-[#E8DDCB] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E8DDCB] gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#D89A35]/15 text-[#D89A35] rounded-xl border border-[#D89A35]/30">
              <Sun size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-[#292D29]">Rooftop Solar PV Array & Savings</h2>
                {solarData?.is_simulated ? (
                  <span className="text-[10px] font-bold text-[#D89A35] bg-[#D89A35]/15 px-2 py-0.5 rounded-full border border-[#D89A35]/30">
                    SIMULATED INVERTER
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[#2E6B45] bg-[#2E6B45]/15 px-2 py-0.5 rounded-full border border-[#2E6B45]/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2E6B45] animate-pulse" />
                    LIVE HARDWARE
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6D716A]">
                Daylight generation curve (06:00–18:30 IST) · Monitored solar offset against campus grid demand
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#6D716A] self-start sm:self-auto">
            <span className="font-semibold text-[#2E6B45] bg-[#2E6B45]/10 px-2.5 py-1 rounded-lg">
              Contribution: {solarData?.solar_contribution_pct ?? 0}%
            </span>
          </div>
        </div>

        {solarLoading && !solarData ? (
          <div className="p-6 text-center text-xs text-[#6D716A]">
            <div className="spinner mr-2" /> Connecting to solar inverter telemetry…
          </div>
        ) : solarData ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            {/* 1. Generated Today */}
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]/80 shadow-2xs">
              <p className="text-[10px] font-semibold text-[#6D716A] uppercase tracking-wider">Generated Today</p>
              <p className="text-lg font-extrabold text-[#D89A35] mt-1">
                {formatNumber(solarData.solar_generated_kwh, 1)}
                <span className="text-xs font-normal text-[#6D716A] ml-0.5">kWh</span>
              </p>
              <p className="text-[10px] text-[#8C847B] mt-0.5">PV Array Output</p>
            </div>

            {/* 2. Current Power Output */}
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]/80 shadow-2xs">
              <p className="text-[10px] font-semibold text-[#6D716A] uppercase tracking-wider">Current Power</p>
              <p className="text-lg font-extrabold text-[#C19A6B] mt-1">
                {formatNumber(solarData.current_power_kw, 1)}
                <span className="text-xs font-normal text-[#6D716A] ml-0.5">kW</span>
              </p>
              <p className="text-[10px] text-[#8C847B] mt-0.5">Instantaneous</p>
            </div>

            {/* 3. Campus Consumption */}
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]/80 shadow-2xs">
              <p className="text-[10px] font-semibold text-[#6D716A] uppercase tracking-wider">Campus Total</p>
              <p className="text-lg font-extrabold text-[#292D29] mt-1">
                {formatNumber(solarData.total_campus_kwh, 1)}
                <span className="text-xs font-normal text-[#6D716A] ml-0.5">kWh</span>
              </p>
              <p className="text-[10px] text-[#8C847B] mt-0.5">Campus Load</p>
            </div>

            {/* 4. Solar Consumed */}
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]/80 shadow-2xs">
              <p className="text-[10px] font-semibold text-[#6D716A] uppercase tracking-wider">Solar Consumed</p>
              <p className="text-lg font-extrabold text-[#2E6B45] mt-1">
                {formatNumber(solarData.solar_consumed_kwh, 1)}
                <span className="text-xs font-normal text-[#6D716A] ml-0.5">kWh</span>
              </p>
              <p className="text-[10px] text-[#2E6B45] mt-0.5">Direct Campus Use</p>
            </div>

            {/* 5. Solar Contribution % */}
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]/80 shadow-2xs border-l-2 border-l-[#2E6B45]">
              <p className="text-[10px] font-semibold text-[#2E6B45] uppercase tracking-wider">Solar Share</p>
              <p className="text-lg font-extrabold text-[#2E6B45] mt-1">
                {solarData.solar_contribution_pct.toFixed(1)}
                <span className="text-xs font-normal text-[#2E6B45] ml-0.5">%</span>
              </p>
              <p className="text-[10px] text-[#8C847B] mt-0.5">Of Campus Energy</p>
            </div>

            {/* 6. Grid Electricity Avoided */}
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]/80 shadow-2xs">
              <p className="text-[10px] font-semibold text-[#6D716A] uppercase tracking-wider">Grid Avoided</p>
              <p className="text-lg font-extrabold text-[#2E6B45] mt-1">
                {formatNumber(solarData.grid_avoided_kwh, 1)}
                <span className="text-xs font-normal text-[#6D716A] ml-0.5">kWh</span>
              </p>
              <p className="text-[10px] text-[#8C847B] mt-0.5">Thermal Offset</p>
            </div>

            {/* 7. Cost Saved */}
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]/80 shadow-2xs">
              <p className="text-[10px] font-semibold text-[#6D716A] uppercase tracking-wider">Cost Saved</p>
              <p className="text-lg font-extrabold text-[#2E6B45] mt-1">
                ₹{formatNumber(solarData.cost_saved_inr, 0)}
              </p>
              <p className="text-[10px] text-[#8C847B] mt-0.5">@ ₹8.50/kWh</p>
            </div>

            {/* 8. CO2 Avoided */}
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]/80 shadow-2xs">
              <p className="text-[10px] font-semibold text-[#6D716A] uppercase tracking-wider">CO₂e Avoided</p>
              <p className="text-lg font-extrabold text-[#2E6B45] mt-1">
                {formatNumber(solarData.co2_avoided_kg, 1)}
                <span className="text-xs font-normal text-[#6D716A] ml-0.5">kg</span>
              </p>
              <p className="text-[10px] text-[#8C847B] mt-0.5">@ 0.82 kg/kWh</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Main Energy Control & Simulation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Room Controls & Energy-Saving Simulation (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="card-surface p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDCB] mb-4">
              <div className="flex items-center gap-2">
                <BuildingIcon size={17} className="text-[#C19A6B]" />
                <h2 className="font-bold text-base text-[#292D29]">Interactive Room Telemetry Controls</h2>
              </div>
              <span className="text-xs text-[#6D716A] bg-[#FAF6F0] px-2.5 py-0.5 rounded-full border border-[#E8DDCB]">
                Live Hardware Bridge
              </span>
            </div>

            {/* Room Selector */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-[#6D716A] uppercase tracking-wider mb-1.5">
                Select Campus Room
              </label>
              <select
                className="nexus-input font-medium"
                value={selectedRoomId ?? ''}
                onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                disabled={buildingsLoading}
              >
                {allRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.buildingName}) — {r.occupied ? 'Occupied' : 'Vacant'} · {r.current_load_kw.toFixed(1)} kW
                  </option>
                ))}
              </select>
            </div>

            {/* Room Controls Panel */}
            {currentRoom ? (
              <div className="space-y-4">
                {isRoomWastingEnergy && (
                  <div className="p-3 bg-[#FAF3E8] border border-[#D89A35]/40 rounded-lg flex items-start gap-2.5 text-xs text-[#B27B20]">
                    <AlertTriangle size={16} className="text-[#D89A35] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Energy Inefficiency Detected:</span> This room is marked{' '}
                      <strong>Vacant</strong> but has active equipment consuming{' '}
                      <strong>{currentRoom.current_load_kw.toFixed(1)} kW</strong>.
                    </div>
                  </div>
                )}

                {roomSuccessMsg && (
                  <div className="p-2.5 bg-[#E0EFE6] border border-[#C2DEC9] rounded-lg text-xs text-[#2E6B45] flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    <span>{roomSuccessMsg}</span>
                  </div>
                )}

                {roomError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-[#C94A42] flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>{roomError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Occupancy toggle */}
                  <div className="p-3.5 rounded-lg border border-[#E8DDCB] bg-[#FAF8F5] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${currentRoom.occupied ? 'bg-[#2E6B45]/15 text-[#2E6B45]' : 'bg-gray-100 text-gray-500'}`}>
                        <Users size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#292D29]">Occupancy State</p>
                        <p className="text-[11px] text-[#6D716A]">
                          {currentRoom.occupied ? 'Occupied (Active)' : 'Vacant (Empty)'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={roomUpdating}
                      onClick={() => handleToggleRoomField({ occupied: !currentRoom.occupied })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        currentRoom.occupied
                          ? 'bg-[#2E6B45] text-white shadow-xs'
                          : 'bg-white border border-[#D6C7B2] text-[#6D716A]'
                      }`}
                    >
                      {currentRoom.occupied ? 'Occupied' : 'Vacant'}
                    </button>
                  </div>

                  {/* Lights toggle */}
                  <div className="p-3.5 rounded-lg border border-[#E8DDCB] bg-[#FAF8F5] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${currentRoom.lights_on ? 'bg-[#D89A35]/15 text-[#D89A35]' : 'bg-gray-100 text-gray-500'}`}>
                        <Lightbulb size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#292D29]">Lighting</p>
                        <p className="text-[11px] text-[#6D716A]">{currentRoom.lights_on ? 'Switched ON' : 'Switched OFF'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={roomUpdating}
                      onClick={() => handleToggleRoomField({ lights_on: !currentRoom.lights_on })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        currentRoom.lights_on
                          ? 'bg-[#D89A35] text-white shadow-xs'
                          : 'bg-white border border-[#D6C7B2] text-[#6D716A]'
                      }`}
                    >
                      {currentRoom.lights_on ? 'Lights ON' : 'Lights OFF'}
                    </button>
                  </div>

                  {/* AC toggle */}
                  <div className="p-3.5 rounded-lg border border-[#E8DDCB] bg-[#FAF8F5] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${currentRoom.ac_on ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        <Wind size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#292D29]">HVAC / Air Conditioning</p>
                        <p className="text-[11px] text-[#6D716A]">{currentRoom.ac_on ? 'Running (Active)' : 'Turned OFF'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={roomUpdating}
                      onClick={() => handleToggleRoomField({ ac_on: !currentRoom.ac_on })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        currentRoom.ac_on
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-[#D6C7B2] text-[#6D716A]'
                      }`}
                    >
                      {currentRoom.ac_on ? 'AC ON' : 'AC OFF'}
                    </button>
                  </div>

                  {/* Projector toggle */}
                  <div className="p-3.5 rounded-lg border border-[#E8DDCB] bg-[#FAF8F5] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${currentRoom.projector_on ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                        <Monitor size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#292D29]">Smart Board / Projector</p>
                        <p className="text-[11px] text-[#6D716A]">{currentRoom.projector_on ? 'Powered ON' : 'Standby / OFF'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={roomUpdating}
                      onClick={() => handleToggleRoomField({ projector_on: !currentRoom.projector_on })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        currentRoom.projector_on
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white border border-[#D6C7B2] text-[#6D716A]'
                      }`}
                    >
                      {currentRoom.projector_on ? 'Display ON' : 'Display OFF'}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-[#E8DDCB] flex items-center justify-between text-xs">
                  <span className="text-[#6D716A]">Current Room Measured Load:</span>
                  <span className="font-bold text-sm text-[#C19A6B]">{currentRoom.current_load_kw.toFixed(2)} kW</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#6D716A] py-4 text-center">Select a room to view its equipment controls.</p>
            )}
          </div>

          {/* Run Energy-Saving Simulation Section */}
          <div className="card-surface p-5 border-l-4 border-l-[#C19A6B]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDCB] mb-4">
              <div className="flex items-center gap-2">
                <Play size={17} className="text-[#2E6B45]" />
                <h2 className="font-bold text-base text-[#292D29]">Run Energy-Saving Simulation</h2>
              </div>
              <span className="text-[11px] font-semibold text-[#2E6B45] bg-[#E0EFE6] px-2.5 py-0.5 rounded-full">
                Mathematical Verification Engine
              </span>
            </div>

            <p className="text-xs text-[#6D716A] mb-4 leading-relaxed">
              Automatically identify non-essential loads running in vacant rooms, calculate precise power reduction,
              and quantify tariff savings (₹8.50/kWh) and avoided emissions (0.82 kg CO₂e/kWh) without double-counting.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-[#6D716A] uppercase tracking-wider mb-1">
                  Simulation Window
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDuration(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        duration === opt.value
                          ? 'bg-[#2E6B45] text-white shadow-xs'
                          : 'bg-[#FAF6F0] text-[#6D716A] border border-[#E8DDCB] hover:border-[#C19A6B]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="btn-primary py-2.5 px-5 text-sm font-semibold shrink-0"
                onClick={handleRunSimulation}
                disabled={simRunning || !selectedRoomId}
              >
                {simRunning ? (
                  <>
                    <div className="spinner mr-2" />
                    Simulating…
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Run Energy-Saving Simulation
                  </>
                )}
              </button>
            </div>

            {simError && (
              <div className="p-3 bg-red-50 border border-red-200 text-[#C94A42] rounded-lg text-xs flex items-center gap-2 mb-3">
                <AlertTriangle size={15} />
                <span>Simulation failed: {simError}</span>
              </div>
            )}

            {/* Simulation Result Presentation */}
            {simResult && (
              <div className="p-4 bg-[#FAF8F5] border border-[#C2DEC9] rounded-xl space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#2E6B45] flex items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    Simulation Completed for {simResult.room_name}
                  </span>
                  <span className="text-xs text-[#6D716A] bg-white px-2 py-0.5 rounded border border-[#E8DDCB]">
                    Duration: {simResult.duration_hours}h
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="p-2.5 bg-white rounded-lg border border-[#E8DDCB]">
                    <p className="text-[10px] text-[#6D716A] font-semibold uppercase">Power Reduction</p>
                    <p className="text-base font-bold text-[#C19A6B] mt-0.5">{simResult.reduction_kw.toFixed(2)} kW</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#E8DDCB]">
                    <p className="text-[10px] text-[#6D716A] font-semibold uppercase">Energy Saved</p>
                    <p className="text-base font-bold text-[#2E6B45] mt-0.5">{simResult.energy_saved_kwh.toFixed(3)} kWh</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#E8DDCB]">
                    <p className="text-[10px] text-[#6D716A] font-semibold uppercase">Cost Saved</p>
                    <p className="text-base font-bold text-[#2E6B45] mt-0.5">₹{simResult.cost_saved_inr.toFixed(2)}</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#E8DDCB]">
                    <p className="text-[10px] text-[#6D716A] font-semibold uppercase">CO₂e Avoided</p>
                    <p className="text-base font-bold text-[#2E6B45] mt-0.5">{simResult.co2_avoided_kg.toFixed(3)} kg</p>
                  </div>
                </div>

                <p className="text-xs text-[#6D716A] bg-white p-2.5 rounded-lg border border-[#E8DDCB]">
                  <strong>Execution Notes:</strong> {simResult.notes}
                </p>

                <div className="text-[11px] text-[#6D716A] space-y-0.5 pt-1">
                  <p>• Applied Tariff: ₹{simResult.tariff_used}/kWh · Applied Grid Factor: {simResult.emission_factor_used} kg CO₂e/kWh</p>
                  <p>• Formulas: Energy = kW × h · Cost = kWh × ₹ · CO₂e = kWh × Factor</p>
                </div>
              </div>
            )}

            <p className="text-[11px] text-[#6D716A] mt-3 italic">
              * Note: Controls simulate electrical loads and calculate verified savings according to Indian grid tariffs.
              Physical disconnects require authenticated hardware relays.
            </p>
          </div>
        </div>

        {/* Right Column: Energy Telemetry Charts & Events (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Hourly Energy Line Chart */}
          <div className="card-surface p-5">
            <h3 className="font-bold text-sm text-[#292D29] mb-1">Campus Operating Hours Consumption (8 AM – 4 PM)</h3>
            <p className="text-xs text-[#6D716A] mb-3">Asia/Kolkata · Load trend across monitored building sensors</p>

            <div className="h-48 w-full">
              {hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8DDCB" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6D716A' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6D716A' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E8DDCB', borderRadius: 8, fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#2E6B45" strokeWidth={2.5} dot={false} name="kWh" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#6D716A]">
                  Gathering hourly energy readings…
                </div>
              )}
            </div>
          </div>

          {/* Building Comparison Bar Chart */}
          <div className="card-surface p-5">
            <h3 className="font-bold text-sm text-[#292D29] mb-1">Load Distribution by Facility (kW)</h3>
            <p className="text-xs text-[#6D716A] mb-3">Real-time load split across campus structures</p>

            <div className="h-44 w-full">
              {byBuildingData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byBuildingData} layout="vertical" margin={{ top: 5, right: 15, left: 35, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8DDCB" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#6D716A' }} />
                    <YAxis dataKey="building" type="category" tick={{ fontSize: 9, fill: '#292D29' }} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E8DDCB', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="load_kw" fill="#C19A6B" radius={[0, 4, 4, 0]} name="kW Load" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#6D716A]">
                  Loading building breakdown…
                </div>
              )}
            </div>
          </div>

          {/* Recent Energy Saving Events Table */}
          <div className="card-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#292D29]">Recent Optimisation Events</h3>
              <span className="text-xs text-[#6D716A]">{events.length} logged</span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {events.length === 0 ? (
                <p className="text-xs text-[#6D716A] text-center py-4">No events yet. Run a simulation to log savings.</p>
              ) : (
                events.map((e) => (
                  <div key={e.id} className="p-3 bg-[#FAF8F5] border border-[#E8DDCB] rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2E6B45]">+{e.energy_saved_kwh.toFixed(3)} kWh Saved</span>
                      <span className="text-[#6D716A] flex items-center gap-1">
                        <Clock size={11} />
                        {formatShortDate(e.created_at)}
                      </span>
                    </div>
                    <p className="text-[#292D29] font-medium">
                      Reduction: {e.reduction_kw.toFixed(2)} kW for {e.duration_hours}h · Cost Saved: ₹{e.cost_saved_inr.toFixed(2)}
                    </p>
                    <p className="text-[#6D716A] truncate">{e.notes}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
