import { useEffect, useState, useCallback } from 'react';
import {
  Trash2, AlertTriangle, Plus, RefreshCw, CheckCircle2,
} from 'lucide-react';
import {
  fetchWasteDashboard, fetchWasteIncidents, createWasteIncident, updateWasteIncident,
  fetchBuildings, WasteIncident, Building,
} from '../api';
import { formatNumber, formatShortDate, severityBadgeClass } from '../utils';

interface WasteDashboard {
  total_incidents: number;
  open_incidents: number;
  resolved_incidents: number;
  critical_incidents: number;
  high_incidents: number;
  avg_fill_level: number;
}

const CATEGORIES = ['general', 'recyclable', 'hazardous', 'organic', 'e-waste', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

function LoadingSpinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-[#6D716A]">
      <div className="spinner" />
      Loading…
    </div>
  );
}

function SectionError({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
      <AlertTriangle size={16} className="text-[#C94A42] shrink-0" />
      <span className="text-sm text-[#C94A42] flex-1">{msg}</span>
      <button className="btn-secondary text-xs px-2 py-1" onClick={onRetry}>Retry</button>
    </div>
  );
}

function FillBar({ level }: { level: number }) {
  const pct = Math.min(100, Math.max(0, level));
  const color = pct >= 90 ? '#C94A42' : pct >= 70 ? '#D89A35' : '#2E6B45';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-[#E8DDCB]">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold w-9 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case 'open': return <span className="badge badge-red">{status}</span>;
    case 'in_progress': return <span className="badge badge-yellow">In Progress</span>;
    case 'resolved': return <span className="badge badge-green">{status}</span>;
    case 'closed': return <span className="badge badge-gray">{status}</span>;
    default: return <span className="badge badge-gray">{status}</span>;
  }
}

interface CreateForm {
  category: string;
  severity: string;
  fill_level: number;
  location_desc: string;
  building_id: number | '';
  notes: string;
}

const DEFAULT_FORM: CreateForm = {
  category: 'general',
  severity: 'medium',
  fill_level: 50,
  location_desc: '',
  building_id: '',
  notes: '',
};

export default function WasteManagement() {
  const [dashboard, setDashboard] = useState<WasteDashboard | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);

  const [incidents, setIncidents] = useState<WasteIncident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);

  const [buildings, setBuildings] = useState<Building[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateForm>(DEFAULT_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      const data = await fetchWasteDashboard();
      setDashboard(data);
    } catch (e: unknown) {
      setDashError((e as Error).message);
    } finally {
      setDashLoading(false);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    setIncidentsLoading(true);
    setIncidentsError(null);
    try {
      const data = await fetchWasteIncidents();
      setIncidents(data);
    } catch (e: unknown) {
      setIncidentsError((e as Error).message);
    } finally {
      setIncidentsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadIncidents();
    fetchBuildings().then(setBuildings).catch(() => {});
  }, [loadDashboard, loadIncidents]);

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const payload: Parameters<typeof createWasteIncident>[0] = {
        category: form.category,
        severity: form.severity,
        fill_level: form.fill_level,
        location_desc: form.location_desc || undefined,
        building_id: form.building_id !== '' ? Number(form.building_id) : undefined,
        notes: form.notes || undefined,
      };
      await createWasteIncident(payload);
      setFormSuccess('Incident logged successfully.');
      setForm(DEFAULT_FORM);
      setShowForm(false);
      loadDashboard();
      loadIncidents();
    } catch (err: unknown) {
      setFormError((err as Error).message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const changeStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await updateWasteIncident(id, { status });
      setIncidents((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status } : i))
      );
      loadDashboard();
    } catch (err: unknown) {
      alert(`Failed to update incident: ${(err as Error).message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const metricCards = dashboard
    ? [
        { label: 'Total Incidents', value: formatNumber(dashboard.total_incidents, 0), color: '#332820' },
        { label: 'Open Incidents', value: formatNumber(dashboard.open_incidents, 0), color: '#C94A42' },
        { label: 'Resolved', value: formatNumber(dashboard.resolved_incidents, 0), color: '#2E6B45' },
        { label: 'Critical Severity', value: formatNumber(dashboard.critical_incidents, 0), color: '#C94A42' },
        { label: 'High Severity', value: formatNumber(dashboard.high_incidents, 0), color: '#D89A35' },
        { label: 'Avg Fill Level', value: `${formatNumber(dashboard.avg_fill_level, 0)}%`, color: '#C19A6B' },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6 p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#332820] flex items-center gap-2">
            <Trash2 size={24} className="text-[#C19A6B]" />
            Waste Management
          </h1>
          <p className="text-sm text-[#6D716A] mt-0.5">
            Track, report, and resolve campus waste incidents and bin fill telemetry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary flex items-center gap-2 py-1.5 px-3 text-xs"
            onClick={() => { loadDashboard(); loadIncidents(); }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <button
            className="btn-primary flex items-center gap-2 py-1.5 px-3 text-xs"
            onClick={() => { setShowForm(!showForm); setFormError(null); setFormSuccess(null); }}
          >
            <Plus size={13} />
            New Incident
          </button>
        </div>
      </div>

      {/* Dashboard Metrics */}
      {dashLoading && !dashboard ? (
        <LoadingSpinner />
      ) : dashError ? (
        <SectionError msg={dashError} onRetry={loadDashboard} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {metricCards.map((c) => (
            <div key={c.label} className="kpi-card">
              <p className="text-xs uppercase tracking-widest font-semibold text-[#6D716A]">
                {c.label}
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: c.color }}>
                {c.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create Incident Form */}
      {showForm && (
        <div className="card-surface p-5 flex flex-col gap-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#332820] flex items-center gap-2">
            <Plus size={15} className="text-[#2E6B45]" />
            Create Waste Incident
          </h2>
          <form onSubmit={submitForm} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="text-xs mb-1 block font-medium text-[#6D716A]">Category</label>
              <select
                className="nexus-input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="text-xs mb-1 block font-medium text-[#6D716A]">Severity</label>
              <select
                className="nexus-input"
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Building */}
            <div>
              <label className="text-xs mb-1 block font-medium text-[#6D716A]">Building (optional)</label>
              <select
                className="nexus-input"
                value={form.building_id}
                onChange={(e) => setForm((f) => ({ ...f, building_id: e.target.value ? Number(e.target.value) : '' }))}
              >
                <option value="">— None —</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Fill Level */}
            <div>
              <label className="text-xs mb-1 block font-medium text-[#6D716A]">
                Fill Level: <span className="text-[#332820] font-semibold">{form.fill_level}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={form.fill_level}
                onChange={(e) => setForm((f) => ({ ...f, fill_level: Number(e.target.value) }))}
                className="w-full accent-[#2E6B45]"
              />
              <div className="mt-1">
                <FillBar level={form.fill_level} />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs mb-1 block font-medium text-[#6D716A]">Location Description</label>
              <input
                type="text"
                className="nexus-input"
                placeholder="e.g. Block A Ground Floor"
                value={form.location_desc}
                onChange={(e) => setForm((f) => ({ ...f, location_desc: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs mb-1 block font-medium text-[#6D716A]">Notes (optional)</label>
              <input
                type="text"
                className="nexus-input"
                placeholder="Additional notes…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {/* Submit */}
            <div className="md:col-span-2 xl:col-span-3 flex items-center gap-3">
              <button
                type="submit"
                className="btn-primary flex items-center gap-2"
                disabled={formSubmitting}
              >
                {formSubmitting ? (
                  <><div className="spinner" /> Creating…</>
                ) : (
                  <><Plus size={14} /> Create Incident</>
                )}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setShowForm(false); setFormError(null); }}
              >
                Cancel
              </button>
            </div>
          </form>

          {formError && (
            <div className="flex items-center gap-2 text-xs text-[#C94A42]">
              <AlertTriangle size={13} /> {formError}
            </div>
          )}
        </div>
      )}

      {formSuccess && (
        <div className="flex items-center gap-2 text-sm text-[#2E6B45] p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 size={16} /> {formSuccess}
        </div>
      )}

      {/* Incidents Table */}
      <div className="card-surface p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#332820] flex items-center gap-2">
            <Trash2 size={16} className="text-[#C19A6B]" />
            Waste Incidents
          </h2>
          {incidentsLoading && <LoadingSpinner />}
        </div>
        {incidentsError ? (
          <SectionError msg={incidentsError} onRetry={loadIncidents} />
        ) : incidents.length === 0 && !incidentsLoading ? (
          <p className="text-sm text-[#6D716A]">No waste incidents recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#E8DDCB]">
            <table className="nexus-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Fill Level</th>
                  <th>Location</th>
                  <th>Notes</th>
                  <th>Reported</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.id}>
                    <td className="text-[#6D716A] font-mono">#{inc.id}</td>
                    <td className="text-[#332820] font-medium capitalize">{inc.category}</td>
                    <td><span className={severityBadgeClass(inc.severity)}>{inc.severity}</span></td>
                    <td>{statusBadge(inc.status)}</td>
                    <td style={{ minWidth: 120 }}><FillBar level={inc.fill_level} /></td>
                    <td className="text-[#6D716A] max-w-[140px] truncate">
                      {inc.location_desc ?? '—'}
                    </td>
                    <td className="text-[#6D716A] max-w-[140px] truncate">
                      {inc.notes ?? '—'}
                    </td>
                    <td className="whitespace-nowrap text-[#6D716A] text-xs">
                      {formatShortDate(inc.created_at)}
                    </td>
                    <td>
                      {inc.status !== 'closed' && inc.status !== 'resolved' && (
                        <div className="flex gap-1 flex-wrap">
                          {inc.status === 'open' && (
                            <button
                              className="btn-secondary text-xs py-0.5 px-2"
                              disabled={updatingId === inc.id}
                              onClick={() => changeStatus(inc.id, 'in_progress')}
                            >
                              In Progress
                            </button>
                          )}
                          <button
                            className="btn-primary text-xs py-0.5 px-2"
                            disabled={updatingId === inc.id}
                            onClick={() => changeStatus(inc.id, 'resolved')}
                          >
                            Resolve
                          </button>
                        </div>
                      )}
                      {(inc.status === 'resolved' || inc.status === 'closed') && (
                        <span className="text-xs font-medium text-[#2E6B45]">Completed</span>
                      )}
                      {updatingId === inc.id && (
                        <div className="spinner ml-2 inline-block" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
