import React, { useEffect, useState, useCallback } from 'react';
import {
  Droplets,
  AlertTriangle,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  Building as BuildingIcon,
  Search,
  Activity,
  Wrench,
  TrendingDown,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  fetchWaterDashboard,
  fetchBuildings,
  fetchWaterAlerts,
  simulateLeak,
  updateWaterAlert,
  fetchHourlyWater,
  type Building,
  type WaterAlert,
  type WaterDashboardData,
} from '../api';
import { formatNumber, formatShortDate, severityBadgeClass, filterToCampusHours, formatHourLabel, CAMPUS_HOURS } from '../utils';

export default function WaterManagement() {
  const [dashboard, setDashboard] = useState<WaterDashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number>(1);

  const [alerts, setAlerts] = useState<WaterAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [hourlyData, setHourlyData] = useState<{ time: string; value: number }[]>([]);

  // Leak simulation state
  const [flowLpm, setFlowLpm] = useState<number>(6.5);
  const [thresholdLpm, setThresholdLpm] = useState<number>(2.0);
  const [severity, setSeverity] = useState<string>('high');
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [simSuccessMsg, setSimSuccessMsg] = useState<string | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      const data = await fetchWaterDashboard();
      setDashboard(data);
    } catch (e: unknown) {
      setDashError((e as Error).message);
    } finally {
      setDashLoading(false);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const data = await fetchWaterAlerts();
      setAlerts(data);
    } catch {
      // ignore
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  const loadHourlyAndBuildings = useCallback(async () => {
    try {
      const [bldgs, hourly] = await Promise.all([
        fetchBuildings(),
        fetchHourlyWater(24),
      ]);
      setBuildings(bldgs);
      if (bldgs.length > 0) {
        setSelectedBuildingId((prev) => (bldgs.some((b) => b.id === prev) ? prev : bldgs[0].id));
      }
      setHourlyData(
        filterToCampusHours(hourly).map((h) => ({
          time: formatHourLabel(h.time),
          value: h.value,
        }))
      );
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadAlerts();
    loadHourlyAndBuildings();
    const interval = setInterval(() => {
      loadDashboard();
      loadAlerts();
      loadHourlyAndBuildings();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard, loadAlerts, loadHourlyAndBuildings]);

  // Trigger simulated leak
  const handleTriggerLeak = async () => {
    if (!selectedBuildingId) return;
    setSimRunning(true);
    setSimError(null);
    setSimSuccessMsg(null);
    try {
      const alert = await simulateLeak({
        building_id: selectedBuildingId,
        flow_lpm: flowLpm,
        threshold_lpm: thresholdLpm,
        severity,
      });
      const bldg = buildings.find((b) => b.id === selectedBuildingId);
      setSimSuccessMsg(`Alert #${alert.id} logged for ${bldg?.name || 'Building'}. Building status escalated to ${severity === 'critical' ? 'CRITICAL' : 'WARNING'}.`);
      await Promise.all([loadDashboard(), loadAlerts(), loadHourlyAndBuildings()]);
    } catch (e: unknown) {
      setSimError((e as Error).message);
    } finally {
      setSimRunning(false);
    }
  };

  // Change alert status (investigating, confirmed, resolved)
  const handleUpdateAlertStatus = async (alertId: number, newStatus: string) => {
    try {
      await updateWaterAlert(alertId, newStatus);
      await Promise.all([loadDashboard(), loadAlerts(), loadHourlyAndBuildings()]);
    } catch (e: unknown) {
      alert(`Could not update alert: ${(e as Error).message}`);
    }
  };

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);
  const activeAlerts = alerts.filter((a) => a.status !== 'resolved');

  return (
    <div className="flex flex-col gap-6 p-6 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Droplets size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#292D29]">Water Management</h1>
              <p className="text-xs text-[#6D716A]">
                Real-time acoustic flow telemetry, pipe anomaly rules, and rapid leak mitigation
              </p>
            </div>
          </div>
        </div>

        <button
          className="btn-secondary text-xs self-start sm:self-auto"
          onClick={() => {
            loadDashboard();
            loadAlerts();
            loadHourlyAndBuildings();
          }}
        >
          <RefreshCw size={13} />
          Refresh Flow Data
        </button>
      </div>

      {/* KPI Summary Cards in Warm Sustainability Palette */}
      {dashLoading && !dashboard ? (
        <div className="flex items-center justify-center p-8 text-sm text-[#6D716A]">
          <div className="spinner mr-2" /> Loading water metrics…
        </div>
      ) : dashError ? (
        <div className="p-3 bg-red-50 border border-red-200 text-[#C94A42] rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>Error loading water telemetry: {dashError}</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          <div className="kpi-card">
            <p className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">Current Flow Rate</p>
            <p className="text-2xl font-bold text-[#292D29] mt-1">
              {formatNumber(dashboard?.current_flow_lpm, 2)}
              <span className="text-xs font-normal text-[#6D716A] ml-1">L/min</span>
            </p>
          </div>

          <div className="kpi-card">
            <p className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">Estimated Daily Usage</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {formatNumber(dashboard?.daily_usage_litres, 0)}
              <span className="text-xs font-normal text-[#6D716A] ml-1">Litres</span>
            </p>
          </div>

          <div className="kpi-card border-l-4 border-l-[#D89A35]">
            <p className="text-[11px] font-semibold text-[#D89A35] uppercase tracking-wider">Suspected Leaks</p>
            <p className="text-2xl font-bold text-[#D89A35] mt-1">
              {dashboard?.suspected_leaks ?? 0}
            </p>
          </div>

          <div className="kpi-card border-l-4 border-l-[#C94A42]">
            <p className="text-[11px] font-semibold text-[#C94A42] uppercase tracking-wider">Confirmed Leaks</p>
            <p className="text-2xl font-bold text-[#C94A42] mt-1">
              {dashboard?.confirmed_leaks ?? 0}
            </p>
          </div>

          <div className="kpi-card">
            <p className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">Estimated Water Loss</p>
            <p className="text-2xl font-bold text-[#C94A42] mt-1">
              {formatNumber(dashboard?.estimated_water_loss_litres, 1)}
              <span className="text-xs font-normal text-[#6D716A] ml-1">L</span>
            </p>
          </div>

          <div className="kpi-card">
            <p className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">Open Plumbing Tickets</p>
            <p className="text-2xl font-bold text-[#C19A6B] mt-1">
              {dashboard?.open_tickets ?? 0}
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Simulation & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Leak Simulator Controls (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="card-surface p-5 border-l-4 border-l-[#2E6B45]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDCB] mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={17} className="text-[#C19A6B]" />
                <h2 className="font-bold text-base text-[#292D29]">Interactive Leak Simulator</h2>
              </div>
              <span className="text-[11px] font-semibold text-[#2E6B45] bg-[#E0EFE6] px-2.5 py-0.5 rounded-full">
                Digital Twin Sync
              </span>
            </div>

            <p className="text-xs text-[#6D716A] mb-4 leading-relaxed">
              Trigger a controlled pipe flow anomaly on any campus facility to test automated threshold alarms,
              escalate the 3D twin model status to Warning or Critical, and dispatch an automated facility work ticket.
            </p>

            {simSuccessMsg && (
              <div className="p-3 bg-[#E0EFE6] border border-[#C2DEC9] text-[#2E6B45] rounded-lg text-xs flex items-center gap-2 mb-4">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{simSuccessMsg}</span>
              </div>
            )}

            {simError && (
              <div className="p-3 bg-red-50 border border-red-200 text-[#C94A42] rounded-lg text-xs flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="shrink-0" />
                <span>Error: {simError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Building selector */}
              <div>
                <label className="block text-xs font-semibold text-[#6D716A] uppercase tracking-wider mb-1.5">
                  Target Facility
                </label>
                <select
                  className="nexus-input font-medium"
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(Number(e.target.value))}
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) — Status: {b.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Flow Rate slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#6D716A] uppercase tracking-wider">
                    Simulated Flow Rate
                  </label>
                  <span className="font-bold text-sm text-blue-700">{flowLpm.toFixed(1)} L/min</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="15.0"
                  step="0.5"
                  value={flowLpm}
                  onChange={(e) => setFlowLpm(parseFloat(e.target.value))}
                  className="w-full accent-[#2E6B45] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#6D716A] mt-1">
                  <span>Baseline: 1.0 L/min</span>
                  <span>Threshold: {thresholdLpm.toFixed(1)} L/min</span>
                  <span>Severe Burst: 15.0 L/min</span>
                </div>
              </div>

              {/* Threshold & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6D716A] uppercase tracking-wider mb-1.5">
                    Trigger Threshold (L/min)
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="10.0"
                    step="0.5"
                    className="nexus-input"
                    value={thresholdLpm}
                    onChange={(e) => setThresholdLpm(parseFloat(e.target.value) || 2.0)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6D716A] uppercase tracking-wider mb-1.5">
                    Incident Severity
                  </label>
                  <select
                    className="nexus-input"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    <option value="medium">Medium (Warning)</option>
                    <option value="high">High (Urgent Attention)</option>
                    <option value="critical">Critical (3D Model Alarm)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  className="btn-danger flex-1 py-2 text-xs font-semibold"
                  onClick={handleTriggerLeak}
                  disabled={simRunning}
                >
                  <AlertTriangle size={14} />
                  {simRunning ? 'Injecting Anomaly…' : 'Trigger Suspected Leak'}
                </button>

                <button
                  type="button"
                  className="btn-secondary py-2 text-xs font-medium"
                  onClick={() => {
                    setFlowLpm(1.8);
                    setThresholdLpm(2.0);
                    setSeverity('medium');
                  }}
                >
                  Reset to Normal Baseline (1.8 L/min)
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#6D716A] mt-4 italic">
              * Simulated flows are calculated via ultrasonic transit-time sensor emulators.
              Resolved incidents permanently update historical reports without data loss.
            </p>
          </div>

          {/* Monitored Campus Facilities */}
          <div className="card-surface p-5">
            <h3 className="font-bold text-sm text-[#292D29] mb-3">Monitored Water Inlets & Risers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {buildings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBuildingId(b.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedBuildingId === b.id
                      ? 'border-[#2E6B45] bg-[#E0EFE6]/30 shadow-xs'
                      : 'border-[#E8DDCB] bg-[#FAF8F5] hover:border-[#C19A6B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#292D29]">{b.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.status === 'normal'
                          ? 'bg-[#E0EFE6] text-[#2E6B45]'
                          : b.status === 'critical'
                          ? 'bg-red-100 text-[#C94A42]'
                          : 'bg-yellow-100 text-[#D89A35]'
                      }`}
                    >
                      {b.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6D716A] mt-1">Inlet Meter: {b.code}-W-01</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Water Incidents & 24h Trend (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Hourly Water Trend Chart */}
          <div className="card-surface p-5">
            <h3 className="font-bold text-sm text-[#292D29] mb-1">Campus Operating Hours Inflow (8 AM – 4 PM)</h3>
            <p className="text-xs text-[#6D716A] mb-3">Litres per hour measured at main supply manifold during operating hours</p>

            <div className="h-44 w-full">
              {hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8DDCB" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6D716A' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6D716A' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E8DDCB', borderRadius: 8, fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.5} dot={false} name="Litres/hr" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#6D716A]">
                  Gathering flow meter readings…
                </div>
              )}
            </div>
          </div>

          {/* Active Alerts Table */}
          <div className="card-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#D89A35]" />
                <h3 className="font-bold text-sm text-[#292D29]">Active Pipe Alerts & Leaks</h3>
              </div>
              <span className="text-xs text-[#6D716A]">{activeAlerts.length} unresolved</span>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {alertsLoading ? (
                <p className="text-xs text-[#6D716A] text-center py-4">Checking plumbing telemetry…</p>
              ) : activeAlerts.length === 0 ? (
                <div className="p-4 bg-[#E0EFE6]/30 border border-[#C2DEC9] rounded-lg text-center text-xs text-[#2E6B45]">
                  <CheckCircle2 size={18} className="mx-auto mb-1" />
                  All facility water lines operating within safe flow thresholds. No active leaks detected.
                </div>
              ) : (
                activeAlerts.map((a) => {
                  const bldg = buildings.find((b) => b.id === a.building_id);
                  return (
                    <div key={a.id} className="p-3.5 bg-white border border-[#E8DDCB] rounded-xl shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={severityBadgeClass(a.severity)}>{a.severity}</span>
                          <span className="font-bold text-xs text-[#292D29]">{bldg?.name || `Building #${a.building_id}`}</span>
                        </div>
                        <span className="text-[11px] text-[#6D716A]">{formatShortDate(a.created_at)}</span>
                      </div>

                      <p className="text-xs text-[#292D29] font-medium leading-relaxed">
                        {a.detection_reason || `Flow rate anomaly detected.`}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-[#6D716A] bg-[#FAF8F5] p-2 rounded border border-[#E8DDCB]">
                        <span>Reading: <strong className="text-blue-700">{a.flow_lpm?.toFixed(1) ?? '--'} L/min</strong></span>
                        <span>Threshold: <strong>{a.threshold_lpm?.toFixed(1) ?? '--'} L/min</strong></span>
                        <span>Status: <strong className="uppercase text-[#C19A6B]">{a.status}</strong></span>
                      </div>

                      {a.recommended_action && (
                        <p className="text-[11px] text-[#6D716A]">
                          <strong>Action:</strong> {a.recommended_action}
                        </p>
                      )}

                      {/* Management Action Buttons */}
                      <div className="pt-1 flex gap-2">
                        {a.status === 'open' && (
                          <button
                            type="button"
                            className="btn-secondary py-1 px-2.5 text-xs font-semibold"
                            onClick={() => handleUpdateAlertStatus(a.id, 'investigating')}
                          >
                            Mark Investigating
                          </button>
                        )}
                        {a.status === 'investigating' && (
                          <button
                            type="button"
                            className="btn-secondary py-1 px-2.5 text-xs font-semibold text-[#D89A35] border-[#D89A35]"
                            onClick={() => handleUpdateAlertStatus(a.id, 'confirmed')}
                          >
                            Confirm Leak
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-primary py-1 px-3 text-xs font-semibold ml-auto"
                          onClick={() => handleUpdateAlertStatus(a.id, 'resolved')}
                        >
                          <CheckCircle2 size={13} />
                          Resolve Incident
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
