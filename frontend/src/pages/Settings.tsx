import { useEffect, useState, useCallback } from 'react';
import {
  Settings as SettingsIcon, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, Save, Edit2, X, Shield,
} from 'lucide-react';
import {
  fetchHealth, fetchSettings, updateSetting,
  HealthStatus, AppSetting,
} from '../api';
import { formatNumber } from '../utils';

// Keys that contain sensitive data and must never be displayed or edited
const SECRET_KEYS = new Set([
  'GEMINI_API_KEY', 'SECRET_KEY', 'DATABASE_URL', 'JWT_SECRET',
  'API_SECRET', 'PRIVATE_KEY', 'PASSWORD', 'TOKEN',
]);

function isSecretKey(key: string): boolean {
  return [...SECRET_KEYS].some((s) => key.toUpperCase().includes(s));
}

// Settings that require a service restart to take effect
const RESTART_REQUIRED_KEYS = new Set([
  'DATABASE_URL', 'REDIS_URL', 'PORT', 'HOST',
]);

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

function StatusIndicator({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 size={16} className="text-[#2E6B45]" />
      ) : (
        <XCircle size={16} className="text-[#C94A42]" />
      )}
      <span className="text-sm font-medium" style={{ color: ok ? '#2E6B45' : '#C94A42' }}>{label}</span>
    </div>
  );
}

interface SettingRowProps {
  setting: AppSetting;
  onSave: (key: string, value: string) => Promise<void>;
}

function SettingRow({ setting, onSave }: SettingRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(setting.value ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isSecret = isSecretKey(setting.key);
  const needsRestart = RESTART_REQUIRED_KEYS.has(setting.key);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(setting.key, draftValue);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setDraftValue(setting.value ?? '');
    setError(null);
  };

  if (isSecret) {
    return (
      <tr>
        <td className="font-mono text-xs font-semibold text-[#332820]">{setting.key}</td>
        <td>
          <span className="badge badge-gray flex items-center gap-1 w-fit">
            <Shield size={11} /> Hidden for security
          </span>
        </td>
        <td className="text-xs text-[#6D716A]">{setting.value_type}</td>
        <td className="text-xs text-[#6D716A] max-w-[200px] truncate">
          {setting.description ?? '—'}
        </td>
        <td>
          <span className="text-xs text-[#6D716A]">Not editable</span>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>
        <span className="font-mono text-xs font-semibold text-[#332820]">{setting.key}</span>
        {needsRestart && (
          <span className="ml-2 badge badge-yellow text-[10px]">restart required</span>
        )}
      </td>
      <td>
        {editing ? (
          <div className="flex items-center gap-2">
            {setting.value_type === 'bool' ? (
              <select
                className="nexus-input py-1 w-32 text-xs"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                type={setting.value_type === 'int' || setting.value_type === 'float' ? 'number' : 'text'}
                className="nexus-input py-1 text-xs"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
            )}
          </div>
        ) : (
          <span className="text-sm font-medium text-[#332820]">
            {setting.value ?? <span className="text-[#6D716A]">—</span>}
          </span>
        )}
        {error && (
          <p className="text-xs text-[#C94A42] mt-1">{error}</p>
        )}
      </td>
      <td>
        <span className="badge badge-gray">{setting.value_type}</span>
      </td>
      <td className="text-xs text-[#6D716A] max-w-[200px]">
        {setting.description ?? '—'}
      </td>
      <td>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <button
              className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <div className="spinner" /> : <Save size={12} />}
              Save
            </button>
            <button
              className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
              onClick={handleCancel}
              disabled={saving}
            >
              <X size={12} /> Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5"
              onClick={() => { setEditing(true); setSaved(false); }}
            >
              <Edit2 size={12} /> Edit
            </button>
            {saved && (
              <CheckCircle2 size={15} className="text-[#2E6B45]" />
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function Settings() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [filter, setFilter] = useState('');

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (e: unknown) {
      setHealthError((e as Error).message);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch (e: unknown) {
      setSettingsError((e as Error).message);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    loadSettings();
  }, [loadHealth, loadSettings]);

  const handleSave = async (key: string, value: string) => {
    const updated = await updateSetting(key, value);
    setSettings((prev) =>
      prev.map((s) => (s.key === updated.key ? updated : s))
    );
  };

  const filteredSettings = settings.filter(
    (s) =>
      s.key.toLowerCase().includes(filter.toLowerCase()) ||
      (s.description ?? '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#332820] flex items-center gap-2">
            <SettingsIcon size={24} className="text-[#C19A6B]" />
            Settings & System Status
          </h1>
          <p className="text-sm text-[#6D716A] mt-0.5">
            Backend services, analytical parameters, and system configuration
          </p>
        </div>
        <button
          className="btn-secondary flex items-center gap-2 py-1.5 px-3 text-xs"
          onClick={() => { loadHealth(); loadSettings(); }}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend Health */}
        <div className="card-surface p-5 flex flex-col gap-4 shadow-sm">
          <h2 className="text-sm font-bold text-[#332820]">Backend Core & Database</h2>
          {healthLoading && !health ? (
            <LoadingSpinner />
          ) : healthError ? (
            <SectionError msg={healthError} onRetry={loadHealth} />
          ) : health ? (
            <div className="flex flex-col gap-3">
              <StatusIndicator
                ok={health.status === 'ok' || health.status === 'healthy'}
                label={`FastAPI Server: ${health.status}`}
              />
              <StatusIndicator
                ok={health.database === 'ok' || health.database === 'connected'}
                label={`SQLite Database: ${health.database}`}
              />
              <div className="pt-2 flex flex-col gap-1 border-t border-[#E8DDCB]">
                <p className="text-xs text-[#6D716A]">
                  NexusEco Engine Version: <span className="font-mono text-[#332820] font-semibold">{health.version}</span>
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Gemini AI Status */}
        <div className="card-surface p-5 flex flex-col gap-4 shadow-sm">
          <h2 className="text-sm font-bold text-[#332820]">Google Gemini AI Intelligence</h2>
          {healthLoading && !health ? (
            <LoadingSpinner />
          ) : healthError ? (
            <SectionError msg={healthError} onRetry={loadHealth} />
          ) : health ? (
            <div className="flex flex-col gap-3">
              <StatusIndicator
                ok={health.gemini_configured}
                label={health.gemini_configured ? 'Gemini 1.5 API key active & connected' : 'Gemini API not configured'}
              />
              {!health.gemini_configured && (
                <div className="flex items-start gap-2 p-3 rounded-lg text-xs bg-amber-50 border border-amber-200 text-[#332820]">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#D89A35]" />
                  <span>
                    To enable generative AI suggestions and reports, configure <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">GEMINI_API_KEY</code> in the backend environment.
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Settings Table */}
      <div className="card-surface p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#332820]">Application Parameters</h2>
            <p className="text-xs text-[#6D716A]">Adjust operating thresholds, baseline rates, and simulation values</p>
          </div>
          <input
            type="text"
            className="nexus-input py-1.5 text-xs"
            style={{ maxWidth: 260 }}
            placeholder="Search parameters…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-2 p-3 rounded-lg text-xs bg-[#F5F0E7] border border-[#E8DDCB] text-[#332820]">
          <Shield size={15} className="shrink-0 mt-0.5 text-[#C19A6B]" />
          <p>
            Cryptographic keys and database connection strings are masked. Operational parameters update live in SQLite.
          </p>
        </div>

        {settingsLoading && !settings.length ? (
          <LoadingSpinner />
        ) : settingsError ? (
          <SectionError msg={settingsError} onRetry={loadSettings} />
        ) : filteredSettings.length === 0 ? (
          <p className="text-sm text-[#6D716A]">
            {filter ? `No settings match "${filter}"` : 'No settings found.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#E8DDCB]">
            <table className="nexus-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSettings.map((s) => (
                  <SettingRow key={s.key} setting={s} onSave={handleSave} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats */}
        {!settingsLoading && settings.length > 0 && (
          <p className="text-xs text-[#6D716A]">
            Showing {filteredSettings.length} of {settings.length} parameters
            &nbsp;·&nbsp; {settings.filter((s) => isSecretKey(s.key)).length} sensitive keys masked
          </p>
        )}
      </div>

      {/* Footer note */}
      <div className="text-xs text-[#6D716A]">
        NexusEco Campus Sustainability Platform · Parameter changes take effect immediately across all calculations.
      </div>
    </div>
  );
}
