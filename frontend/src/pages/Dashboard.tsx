import React, { useEffect, useState, useCallback } from 'react';
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
  Zap,
  Droplets,
  Trash2,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  Activity,
  Layers,
  Leaf,
  Coins,
  Building as BuildingIcon,
} from 'lucide-react';
import {
  fetchKPIs,
  fetchFeed,
  fetchHourlyEnergy,
  fetchEnergyByBuilding,
  type DashboardKPIs,
  type FeedItem,
} from '../api';
import {
  formatNumber,
  formatShortDate,
  typeIcon,
  severityBadgeClass,
  filterToCampusHours,
  formatHourLabel,
  isWithinCampusHours,
  CAMPUS_HOURS,
} from '../utils';

interface HourlyPoint {
  time: string;
  value: number;
}
interface BuildingLoad {
  building: string;
  load_kw: number;
}

const REFRESH_INTERVAL_MS = 30_000;

const CAMPUS_BUILDINGS_SHOWCASE = [
  {
    name: 'School of Engineering',
    code: 'ACAD-A',
    category: 'Academic & Engineering',
    floors: 3,
    image: '/assets/campus/School Of Engineering (2).jpg',
  },
  {
    name: 'Campus Cafeteria',
    code: 'CAFE',
    category: 'Food & Dining',
    floors: 1,
    image: '/assets/campus/Cafeteria.jpg',
  },
  {
    name: 'School of Health Sciences',
    code: 'HEALTH',
    category: 'Academic & Medical',
    floors: 4,
    image: '/assets/campus/School Of Health Sciences.jpg',
  },
  {
    name: 'CDSIMER Hospital',
    code: 'CDSIMER',
    category: 'Healthcare & Hospital',
    floors: 5,
    image: '/assets/campus/CDSIMER Entrance.jpg',
  },
  {
    name: 'Hospital Emergency Block',
    code: 'HOSP-ER',
    category: 'Critical Care & Trauma',
    floors: 2,
    image: '/assets/campus/Hospital Emergency Block.jpg',
  },
];

function ChartTooltip({
  active,
  payload,
  label,
  unit = 'kW',
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E8DDCB] p-2.5 rounded-lg shadow-md text-xs">
      <p className="text-[#6D716A] mb-0.5">{label}</p>
      <p className="font-bold text-[#292D29]">
        {formatNumber(payload[0].value, 2)} {unit}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [kpisError, setKpisError] = useState<string | null>(null);

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [hourlyLoading, setHourlyLoading] = useState(true);

  const [byBuilding, setByBuilding] = useState<BuildingLoad[]>([]);
  const [buildingLoading, setBuildingLoading] = useState(true);

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [kpiData, feedData, hourlyData, bldgData] = await Promise.all([
        fetchKPIs(),
        fetchFeed(20),
        fetchHourlyEnergy(24),
        fetchEnergyByBuilding(),
      ]);
      setKpis(kpiData);
      setFeed(feedData);
      const filtered = filterToCampusHours(hourlyData).map((p) => ({
        time: formatHourLabel(p.time),
        value: p.value,
      }));
      setHourly(filtered);
      setByBuilding(bldgData);
      setLastRefresh(new Date());
    } catch (e: unknown) {
      setKpisError((e as Error).message);
    } finally {
      setKpisLoading(false);
      setFeedLoading(false);
      setHourlyLoading(false);
      setBuildingLoading(false);
    }
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
    const timer = setInterval(() => {
      loadAll();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadAll]);

  return (
    <div className="flex flex-col gap-6 p-6 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#292D29]">Operations Command Overview</h1>
          <p className="text-xs text-[#6D716A]">
            Real-time digital twin telemetry, energy load tracking, and campus facility alarms
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-[11px] text-[#6D716A]">
            Updated {lastRefresh.toLocaleTimeString('en-IN')}
          </span>
          <button
            type="button"
            className="btn-secondary text-xs py-1.5 px-3"
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Cards in Warm Sustainability Theme */}
      {kpisLoading && !kpis ? (
        <div className="flex items-center justify-center p-8 text-sm text-[#6D716A]">
          <div className="spinner mr-2" /> Loading campus metrics…
        </div>
      ) : kpisError ? (
        <div className="p-3 bg-red-50 border border-red-200 text-[#C94A42] rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>Error loading KPI summary: {kpisError}</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">Energy Consumed</span>
              <div className="p-1.5 rounded-md bg-[#FAF6F0] text-[#C19A6B]">
                <Zap size={15} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#292D29]">
              {formatNumber(kpis?.total_energy_kwh_today, 1)}
              <span className="text-xs font-normal text-[#6D716A] ml-1">kWh</span>
            </p>
            <p className="text-[11px] text-[#6D716A] mt-1">Load: {formatNumber(kpis?.current_load_kw, 1)} kW</p>
          </div>

          <div className="kpi-card border-l-4 border-l-[#2E6B45]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#2E6B45] uppercase tracking-wider">Estimated Cost Saved</span>
              <div className="p-1.5 rounded-md bg-[#E0EFE6] text-[#2E6B45]">
                <Coins size={15} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#2E6B45]">
              ₹{formatNumber(kpis?.cost_saved_inr_today ?? 20000, 0)}
            </p>
            <p className="text-[11px] text-[#2E6B45] font-semibold mt-1">Saved today (Simulated baseline)</p>
          </div>

          <div className="kpi-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">Estimated Water</span>
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
                <Droplets size={15} />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {formatNumber(kpis?.estimated_water_litres_today, 0)}
              <span className="text-xs font-normal text-[#6D716A] ml-1">Litres</span>
            </p>
            <p className="text-[11px] text-[#6D716A] mt-1">Daily estimate</p>
          </div>

          <div className="kpi-card border-l-4 border-l-[#C94A42]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#C94A42] uppercase tracking-wider">Active Alerts</span>
              <div className="p-1.5 rounded-md bg-red-50 text-[#C94A42]">
                <AlertTriangle size={15} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#C94A42]">
              {kpis?.active_alerts ?? 0}
            </p>
            <p className="text-[11px] text-[#C94A42] mt-1">
              {(kpis?.active_alerts ?? 0) > 0 ? 'Requires attention' : 'All lines clear'}
            </p>
          </div>

          <div className="kpi-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">Waste Incidents</span>
              <div className="p-1.5 rounded-md bg-yellow-50 text-[#D89A35]">
                <Trash2 size={15} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#292D29]">
              {kpis?.waste_incidents ?? 0}
            </p>
            <p className="text-[11px] text-[#6D716A] mt-1">Collection queue</p>
          </div>

          <div className="kpi-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6D716A] uppercase tracking-wider">CO₂e Avoided</span>
              <div className="p-1.5 rounded-md bg-[#E0EFE6] text-[#2E6B45]">
                <Leaf size={15} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#2E6B45]">
              {formatNumber(kpis?.co2_avoided_kg_today, 2)}
              <span className="text-xs font-normal text-[#6D716A] ml-1">kg</span>
            </p>
            <p className="text-[11px] text-[#6D716A] mt-1">Grid offset</p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Energy Consumption (7 cols) */}
        <div className="lg:col-span-7 card-surface p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={17} className="text-[#2E6B45]" />
              <h2 className="font-bold text-sm text-[#292D29]">Campus Operating Hours Energy (8 AM – 4 PM)</h2>
            </div>
            <span className="text-xs text-[#6D716A]">Asia/Kolkata · kWh/hr</span>
          </div>

          <div className="h-56 w-full">
            {hourly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourly} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DDCB" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#6D716A', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fill: '#6D716A', fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip unit="kWh" />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2E6B45"
                    strokeWidth={2.5}
                    dot={false}
                    name="Consumption"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#6D716A]">
                No telemetry points available. Run simulations to log activity.
              </div>
            )}
          </div>
        </div>

        {/* Energy Load by Building (5 cols) */}
        <div className="lg:col-span-5 card-surface p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={17} className="text-[#C19A6B]" />
              <h2 className="font-bold text-sm text-[#292D29]">Current Load by Building (kW)</h2>
            </div>
            <span className="text-xs text-[#6D716A]">Real-time power load</span>
          </div>

          <div className="h-56 w-full">
            {byBuilding.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBuilding} layout="vertical" margin={{ top: 5, right: 15, bottom: 5, left: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DDCB" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6D716A', fontSize: 10 }} />
                  <YAxis dataKey="building" type="category" tick={{ fill: '#292D29', fontSize: 9 }} width={80} />
                  <Tooltip content={<ChartTooltip unit="kW" />} />
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
      </div>

      {/* Buildings Overview (5 Buildings) */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8DDCB]">
          <div className="flex items-center gap-2">
            <BuildingIcon size={18} className="text-[#2E6B45]" />
            <div>
              <h2 className="font-bold text-sm text-[#292D29]">Campus Buildings Overview (5 Core Facilities)</h2>
              <p className="text-xs text-[#6D716A]">
                Synchronized 3D Digital Twin representations with telemetry nodes and demo previews
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#2E6B45] bg-[#E0EFE6] px-2.5 py-0.5 rounded-full">
            5 Buildings Monitored
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {CAMPUS_BUILDINGS_SHOWCASE.map((b) => (
            <div
              key={b.code}
              className="bg-[#FAF8F5] border border-[#E8DDCB] rounded-xl overflow-hidden hover:border-[#C19A6B] hover:shadow-xs transition-all flex flex-col"
            >
              <div className="relative h-28 w-full bg-[#E8DDCB] overflow-hidden">
                <img
                  src={b.image}
                  alt={b.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="absolute top-2 right-2 text-[10px] font-semibold bg-[#2E6B45] text-white px-2 py-0.5 rounded shadow-xs">
                  Demo
                </span>
                <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-xs">
                  {b.code}
                </span>
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-xs text-[#292D29] line-clamp-1">{b.name}</h3>
                  <p className="text-[11px] text-[#6D716A]">{b.category}</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-[#E8DDCB]/60 flex items-center justify-between text-[11px] text-[#6D716A]">
                  <span>{b.floors} {b.floors === 1 ? 'Floor' : 'Floors'}</span>
                  <span className="text-[#2E6B45] font-semibold">Active Node</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operations Feed & Recent Activity */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8DDCB]">
          <div>
            <h2 className="font-bold text-sm text-[#292D29]">Real-Time Campus Operations Feed</h2>
            <p className="text-xs text-[#6D716A]">
              Chronological log of energy-saving events, water anomaly triggers, waste detection, and work tickets
            </p>
          </div>
          <span className="text-xs font-semibold text-[#2E6B45] bg-[#E0EFE6] px-2.5 py-0.5 rounded-full">
            Live Stream
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2">
          {feed.length === 0 ? (
            <p className="text-xs text-[#6D716A] text-center py-6">
              No recent operations events logged. Trigger a simulation or inspect an incident to generate feed items.
            </p>
          ) : (
            feed.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-[#FAF8F5] border border-[#E8DDCB] rounded-lg hover:border-[#C19A6B] transition-colors flex items-start gap-3 text-xs"
              >
                <div className="p-2 rounded-lg bg-white border border-[#E8DDCB] text-base shrink-0 mt-0.5">
                  {typeIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-bold text-[#292D29]">{item.title}</span>
                    {item.severity && <span className={severityBadgeClass(item.severity)}>{item.severity}</span>}
                    {item.building_name && (
                      <span className="text-[11px] text-[#6D716A] font-medium bg-white px-2 py-0.2 rounded border border-[#E8DDCB]">
                        {item.building_name}
                      </span>
                    )}
                  </div>
                  <p className="text-[#6D716A] truncate">{item.description}</p>
                </div>
                <span className="text-[11px] text-[#6D716A] shrink-0 font-medium">
                  {formatShortDate(item.created_at)}
                </span>
              </div>
            ))
          )}
        </div>

        <p className="text-[11px] text-[#6D716A] mt-4 pt-3 border-t border-[#E8DDCB] italic">
          * Telemetry data is synchronized across the 3D Digital Twin, Energy Simulator, Water Anomaly Engine, and Sustainability Reports.
        </p>
      </div>
    </div>
  );
}
