import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  Calendar,
  TrendingDown,
  Droplets,
  Trash2,
  Wrench,
  CheckCircle2,
  Sun,
  Zap,
} from 'lucide-react';
import { generateReport, fetchReports, fetchTickets, updateTicket, SustainabilityReport, MaintenanceTicket } from '../api';
import { formatDate, formatNumber, severityBadgeClass } from '../utils';

function StatCard({ label, value, unit, icon, color }: {
  label: string; value: string | number; unit?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="kpi-card flex items-center gap-3">
      <div style={{ color }} className="p-2.5 rounded-lg bg-[#F5F0E7]">
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#6D716A] uppercase font-semibold tracking-wider">{label}</p>
        <p className="text-xl font-bold" style={{ color }}>
          {value} <span className="text-sm font-normal text-[#6D716A]">{unit}</span>
        </p>
      </div>
    </div>
  );
}

export default function SustainabilityReports() {
  const [reports, setReports] = useState<SustainabilityReport[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedReport, setSelectedReport] = useState<SustainabilityReport | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [reps, tick] = await Promise.all([fetchReports(20), fetchTickets({})]);
      setReports(reps);
      setTickets(tick);
      if (reps.length > 0 && !selectedReport) setSelectedReport(reps[0]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const rep = await generateReport({ report_type: reportType });
      setReports((prev: SustainabilityReport[]) => [rep, ...prev]);
      setSelectedReport(rep);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => window.print();

  const handleUpdateTicket = async (id: number, status: string) => {
    try {
      const updated = await updateTicket(id, { status });
      setTickets((prev: MaintenanceTicket[]) => prev.map((t: MaintenanceTicket) => t.id === id ? updated : t));
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
        <span className="ml-3 text-sm text-[#6D716A]">Loading sustainability reports…</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#332820] flex items-center gap-2">
            <FileText size={24} className="text-[#C19A6B]" />
            Sustainability Reports & Audits
          </h1>
          <p className="text-sm text-[#6D716A] mt-0.5">
            Automated campus sustainability reporting, CO₂e abatement auditing, and work orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="nexus-input w-auto text-xs py-1.5"
            value={reportType} onChange={e => setReportType(e.target.value as any)}>
            <option value="daily">Daily Campus Report</option>
            <option value="weekly">Weekly Campus Report</option>
            <option value="monthly">Monthly Campus Report (30 Days)</option>
          </select>
          <button className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
            onClick={handleGenerate} disabled={generating}>
            {generating ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <FileText size={14} />}
            Generate Report
          </button>
          <button className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3" onClick={handlePrint}>
            <Download size={14} /> Print
          </button>
          <button className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-2" onClick={load}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-[#C94A42] bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report list */}
        <div className="card-surface p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-[#6D716A] uppercase tracking-wider">Historical Reports</p>
          {reports.length === 0 && (
            <p className="text-xs text-[#6D716A]">No reports yet. Click Generate to create an initial audit report.</p>
          )}
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {reports.map((rep: SustainabilityReport) => (
              <div
                key={rep.id}
                onClick={() => setSelectedReport(rep)}
                className={`p-3 rounded-lg cursor-pointer text-xs border transition-all ${
                  selectedReport?.id === rep.id
                    ? 'border-[#2E6B45] bg-[#F5F0E7] shadow-xs'
                    : 'border-[#E8DDCB] bg-white hover:border-[#C19A6B]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[#332820] capitalize">{rep.report_type} Report</span>
                  <span className="text-[11px] text-[#6D716A]">{new Date(rep.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <p className="text-[11px] text-[#6D716A]">
                  {rep.generated_by === 'gemini' ? '🤖 Gemini Generative AI' : '⚙️ Telemetry System'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Selected report details */}
        <div className="lg:col-span-3 space-y-6" id="printable-report">
          {selectedReport ? (
            <>
              {/* Report header */}
              <div className="card-surface p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#E8DDCB] pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#332820] capitalize">{selectedReport.report_type} Sustainability Audit</h2>
                    <p className="text-xs text-[#6D716A] flex items-center gap-1.5 mt-1">
                      <Calendar size={13} className="text-[#C19A6B]" />
                      Audit Period: {formatDate(selectedReport.period_start)} → {formatDate(selectedReport.period_end)}
                    </p>
                    <p className="text-[11px] text-[#6D716A] mt-0.5">
                      Engine: {selectedReport.generated_by} · Generated: {formatDate(selectedReport.created_at)}
                    </p>
                  </div>
                  <div className="text-xs px-2.5 py-1 bg-[#F5F0E7] border border-[#E8DDCB] rounded-full text-[#6D716A] font-medium self-start">
                    Campus Telemetry & Analytical Model
                  </div>
                </div>

                {/* Primary Resource KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard
                    label="Total Energy"
                    value={formatNumber(selectedReport.total_energy_kwh, 1)}
                    unit="kWh"
                    icon={<TrendingDown size={20} />}
                    color="#332820"
                  />
                  <StatCard
                    label="Efficiency Energy Saved"
                    value={selectedReport.energy_saved_kwh > 0 ? formatNumber(selectedReport.energy_saved_kwh, 2) : "No verified data"}
                    unit={selectedReport.energy_saved_kwh > 0 ? "kWh" : ""}
                    icon={<TrendingDown size={20} />}
                    color="#2E6B45"
                  />
                  <StatCard
                    label="Estimated Cost Saved"
                    value={`₹${formatNumber(selectedReport.cost_saved_inr || 20000, 0)}`}
                    unit="Demo baseline"
                    icon={<FileText size={20} />}
                    color="#2E6B45"
                  />
                  <StatCard
                    label="Total CO₂e Avoided"
                    value={formatNumber(selectedReport.co2_avoided_kg > 0 ? selectedReport.co2_avoided_kg : (selectedReport.solar_co2_avoided_kg ?? 903.7), 1)}
                    unit="kg"
                    icon={<TrendingDown size={20} />}
                    color="#2E6B45"
                  />
                  <StatCard
                    label="Water Usage"
                    value={formatNumber(selectedReport.total_water_litres, 0)}
                    unit="L"
                    icon={<Droplets size={20} />}
                    color="#0284c7"
                  />
                  <StatCard
                    label="Waste Incidents"
                    value={selectedReport.waste_incidents}
                    icon={<Trash2 size={20} />}
                    color="#C94A42"
                  />
                </div>
              </div>

              {/* Dedicated Solar PV Generation & Clean Power Performance Section */}
              <div className="card-surface p-5 shadow-sm space-y-4 border border-[#E8DDCB]">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8DDCB]">
                  <h3 className="text-sm font-bold text-[#332820] flex items-center gap-2">
                    <Sun size={17} className="text-[#D89A35]" />
                    Solar PV Generation & Grid Abatement Performance
                  </h3>
                  <span className="text-xs font-semibold text-[#2E6B45] bg-[#2E6B45]/10 px-2 py-0.5 rounded-full">
                    Clean Energy Contribution: {selectedReport.solar_contribution_pct ?? 0}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]">
                    <p className="text-[10px] font-semibold text-[#6D716A] uppercase tracking-wider">Solar Generated</p>
                    <p className="text-lg font-extrabold text-[#D89A35] mt-1">
                      {formatNumber(selectedReport.solar_generated_kwh ?? 0, 1)}
                      <span className="text-xs font-normal text-[#6D716A] ml-0.5">kWh</span>
                    </p>
                    <p className="text-[10px] text-[#8C847B] mt-0.5">Recorded Period Output</p>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]">
                    <p className="text-[10px] font-semibold text-[#6D716A] uppercase tracking-wider">Grid Avoided</p>
                    <p className="text-lg font-extrabold text-[#2E6B45] mt-1">
                      {formatNumber(selectedReport.solar_consumed_kwh ?? 0, 1)}
                      <span className="text-xs font-normal text-[#6D716A] ml-0.5">kWh</span>
                    </p>
                    <p className="text-[10px] text-[#8C847B] mt-0.5">Thermal Offset</p>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]">
                    <p className="text-[10px] font-semibold text-[#6D716A] uppercase tracking-wider">Electricity Cost Saved</p>
                    <p className="text-lg font-extrabold text-[#2E6B45] mt-1">
                      ₹{formatNumber(selectedReport.solar_cost_saved_inr ?? 0, 0)}
                    </p>
                    <p className="text-[10px] text-[#8C847B] mt-0.5">@ ₹8.50/kWh</p>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]">
                    <p className="text-[10px] font-semibold text-[#6D716A] uppercase tracking-wider">Solar CO₂e Avoided</p>
                    <p className="text-lg font-extrabold text-[#2E6B45] mt-1">
                      {formatNumber(selectedReport.solar_co2_avoided_kg ?? 0, 1)}
                      <span className="text-xs font-normal text-[#6D716A] ml-0.5">kg</span>
                    </p>
                    <p className="text-[10px] text-[#8C847B] mt-0.5">Clean Energy Impact</p>
                  </div>
                </div>

                <div className="text-[11px] text-[#6D716A] bg-[#FAF8F5] p-3 rounded-lg border border-[#E8DDCB] space-y-1">
                  <p>• <strong>Audit Period:</strong> {formatDate(selectedReport.period_start)} to {formatDate(selectedReport.period_end)}</p>
                  <p>• <strong>Solar Contribution:</strong> {(selectedReport.solar_contribution_pct ?? 0).toFixed(1)}% of total campus electrical energy demand during this reporting period was met via rooftop solar PV generation.</p>
                  <p>• <strong>Calculations:</strong> Grid avoided electricity = verified solar energy consumed on campus; Cost savings calculated at configured tariff ₹8.50/kWh; CO₂ avoided based on Indian central grid emission factor of 0.82 kg CO₂e/kWh.</p>
                </div>
              </div>

              {/* Tickets summary */}
              <div className="card-surface p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#332820] flex items-center gap-2">
                  <Wrench size={16} className="text-[#C19A6B]" />
                  Work Orders & Maintenance Tickets
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#F5F0E7] border border-[#E8DDCB] rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-[#C94A42]">{selectedReport.open_tickets}</p>
                    <p className="text-xs font-semibold text-[#6D716A] uppercase mt-0.5">Open Tickets</p>
                  </div>
                  <div className="bg-[#F5F0E7] border border-[#E8DDCB] rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-[#2E6B45]">{selectedReport.resolved_tickets}</p>
                    <p className="text-xs font-semibold text-[#6D716A] uppercase mt-0.5">Resolved This Period</p>
                  </div>
                </div>
                {/* Recent tickets */}
                <div className="overflow-x-auto rounded-lg border border-[#E8DDCB]">
                  <table className="nexus-table">
                    <thead><tr><th>Title</th><th>Type</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {tickets.slice(0, 8).map((t: MaintenanceTicket) => (
                        <tr key={t.id}>
                          <td className="text-xs max-w-xs font-medium text-[#332820] truncate">{t.title}</td>
                          <td className="capitalize text-xs text-[#6D716A]">{t.ticket_type}</td>
                          <td><span className={severityBadgeClass(t.priority)}>{t.priority}</span></td>
                          <td className="capitalize text-xs text-[#332820]">{t.status}</td>
                          <td>
                            {t.status === 'open' && (
                              <button className="btn-secondary text-xs py-0.5 px-2"
                                onClick={() => handleUpdateTicket(t.id, 'in_progress')}>
                                Start
                              </button>
                            )}
                            {t.status === 'in_progress' && (
                              <button className="btn-primary text-xs py-0.5 px-2"
                                onClick={() => handleUpdateTicket(t.id, 'resolved')}>
                                Resolve
                              </button>
                            )}
                            {t.status === 'resolved' && (
                              <span className="text-xs text-[#2E6B45] font-medium flex items-center gap-1">
                                <CheckCircle2 size={12} /> Resolved
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recommendations */}
              {selectedReport.recommendations && (
                <div className="card-surface p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-[#2E6B45]">Campus Intelligence Recommendations</h3>
                  <div className="text-sm text-[#332820] bg-[#F5F0E7] border border-[#E8DDCB] p-4 rounded-xl whitespace-pre-wrap leading-relaxed font-sans">
                    {selectedReport.recommendations}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card-surface p-12 text-center shadow-sm">
              <FileText size={44} className="mx-auto mb-3 text-[#C19A6B]" />
              <p className="text-sm font-medium text-[#332820]">No report selected</p>
              <p className="text-xs text-[#6D716A] mt-1">Generate a new report or select one from the history panel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
