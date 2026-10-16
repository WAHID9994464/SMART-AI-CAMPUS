import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Box,
  Eye,
  Zap,
  Droplets,
  Trash2,
  Brain,
  FileBarChart,
  Settings as SettingsIcon,
  Menu,
  X,
  Search,
  Sun,
  Calendar,
  Bell,
  User,
  ShieldCheck,
  CheckCircle2,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

import Dashboard from './pages/Dashboard';
import DigitalTwin from './pages/DigitalTwin';
import ComputerVision from './pages/ComputerVision';
import EnergyManagement from './pages/EnergyManagement';
import WaterManagement from './pages/WaterManagement';
import WasteManagement from './pages/WasteManagement';
import NexusIntelligence from './pages/NexusIntelligence';
import SustainabilityReports from './pages/SustainabilityReports';
import Settings from './pages/Settings';
import { fetchHealth, fetchNotifications, type HealthStatus, type NotificationItem } from './api';

type PageId =
  | 'dashboard'
  | 'digital-twin'
  | 'computer-vision'
  | 'energy'
  | 'water'
  | 'waste'
  | 'intelligence'
  | 'reports'
  | 'settings';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'digital-twin', label: '3D Digital Twin', icon: Box },
  { id: 'computer-vision', label: 'Computer Vision', icon: Eye },
  { id: 'energy', label: 'Energy Management', icon: Zap },
  { id: 'water', label: 'Water Management', icon: Droplets },
  { id: 'waste', label: 'Waste Management', icon: Trash2 },
  { id: 'intelligence', label: 'Smart AI Assistant', icon: Brain, badge: 'AI' },
  { id: 'reports', label: 'Sustainability Reports', icon: FileBarChart },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('digital-twin');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  // Notification center state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('smartaicampus_read_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    setNotifLoading(true);
    fetchNotifications()
      .then((items) => {
        setNotifications(items);
        setNotifError(null);
      })
      .catch((err) => {
        setNotifError(err.message || 'Could not load notifications');
      })
      .finally(() => setNotifLoading(false));
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setNotificationsOpen(false);
      }
    }
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [notificationsOpen]);

  const markAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    try {
      localStorage.setItem('smartaicampus_read_notifications', JSON.stringify([...next]));
    } catch {}
  };

  const markAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(readIds);
    notifications.forEach((n) => next.add(n.id));
    setReadIds(next);
    try {
      localStorage.setItem('smartaicampus_read_notifications', JSON.stringify([...next]));
    } catch {}
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);
    if (item.target_page) {
      setCurrentPage(item.target_page as PageId);
    }
    if (item.building_name && item.target_page === 'digital-twin') {
      setGlobalSearch(item.building_name);
    }
    setNotificationsOpen(false);
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const formatRelativeTime = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const str = now.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setCurrentTime(str);
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: 'offline', database: 'disconnected', gemini_configured: false, version: '1.0.0' }));
    
    const interval = setInterval(() => {
      fetchHealth()
        .then(setHealth)
        .catch(() => setHealth({ status: 'offline', database: 'disconnected', gemini_configured: false, version: '1.0.0' }));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'digital-twin':
        return <DigitalTwin initialSearch={globalSearch} />;
      case 'computer-vision':
        return <ComputerVision />;
      case 'energy':
        return <EnergyManagement />;
      case 'water':
        return <WaterManagement />;
      case 'waste':
        return <WasteManagement />;
      case 'intelligence':
        return <NexusIntelligence />;
      case 'reports':
        return <SustainabilityReports />;
      case 'settings':
        return <Settings />;
      default:
        return <DigitalTwin />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F5F0E7] text-[#292D29] overflow-hidden font-sans">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#332820]/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Persistent Sidebar in Black Earth */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-64 bg-[#332820] border-r border-[#45362C] flex flex-col transition-transform duration-200 ease-in-out shadow-xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="p-4 border-b border-[#45362C] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {/* Eco Leaf Icon */}
              <div className="w-7 h-7 rounded-lg bg-[#2E6B45] flex items-center justify-center shadow-xs">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                </svg>
              </div>
              <h1 className="font-extrabold text-base tracking-tight text-white">
                Smart AI Campus
              </h1>
            </div>
            <p className="text-[10px] text-[#C19A6B] font-medium mt-1 leading-tight">
              AI-Powered Sustainable Campus Management
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[#DFD9D3] hover:text-white p-1"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#2E6B45] text-white font-semibold shadow-xs'
                    : 'text-[#DFD9D3] hover:text-white hover:bg-[#3D3027]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={16}
                    className={isActive ? 'text-white' : 'text-[#C19A6B]'}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-[#C19A6B]/20 text-[#C19A6B]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Status card */}
        <div className="p-3 m-2.5 rounded-xl bg-[#241B15] border border-[#45362C] text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5 text-white text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#2E6B45] animate-pulse" />
              System Status
            </span>
            <span className="text-[10px] text-[#2E6B45] font-semibold bg-[#2E6B45]/15 px-1.5 py-0.5 rounded">
              All Systems Online
            </span>
          </div>

          <div className="space-y-1 text-[11px] text-[#A6978A] pt-1.5 border-t border-[#3B2D24]">
            <div className="flex items-center justify-between">
              <span>Database:</span>
              <span className="text-[#2E6B45] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E6B45]" /> Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>API Server:</span>
              <span className="text-[#2E6B45] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E6B45]" /> Running
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#807266]">
              <span>Last Sync:</span>
              <span>10:24 AM</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top navigation bar matching screenshot */}
        <header className="h-14 bg-white border-b border-[#E8DDCB] px-4 lg:px-6 flex items-center justify-between shrink-0 shadow-2xs z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[#332820] hover:text-[#2E6B45] p-1"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            {/* Global Search Bar */}
            <div className="relative w-64 md:w-96">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C847B]" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  if (currentPage !== 'digital-twin') setCurrentPage('digital-twin');
                }}
                placeholder="Search building, room or facility…"
                className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F5] border border-[#E8DDCB] rounded-lg text-xs text-[#292D29] placeholder-[#8C847B] focus:outline-none focus:border-[#2E6B45] transition-all"
              />
            </div>
          </div>

          {/* Right Header Badges: Weather, Date, Notifications, Profile */}
          <div className="flex items-center gap-4 text-xs text-[#6D716A]">
            {/* Weather */}
            <div className="hidden sm:flex items-center gap-1.5 font-medium">
              <Sun size={15} className="text-[#D89A35]" />
              <span className="font-bold text-[#292D29]">32°C</span>
              <span className="text-[11px] text-[#8C847B]">Clear Sky</span>
            </div>

            {/* Date & Time */}
            <div className="hidden md:flex items-center gap-1.5 border-l border-[#E8DDCB] pl-3 font-medium">
              <Calendar size={14} className="text-[#C19A6B]" />
              <span>{currentTime || 'Tue, 27 May 2025 10:24 AM'}</span>
            </div>

            {/* Notifications Center Popover */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`relative p-2 rounded-full transition-all flex items-center justify-center ${
                  notificationsOpen
                    ? 'bg-[#E8DDCB] text-[#2E6B45]'
                    : 'text-[#332820] hover:bg-[#FAF8F5]'
                }`}
                title="Active Campus Alerts"
                aria-label="Campus Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#C94A42] text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in-50">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-[#E8DDCB] rounded-2xl shadow-2xl z-50 overflow-hidden text-xs text-[#292D29] animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Dropdown Header */}
                  <div className="p-3.5 bg-[#FAF8F5] border-b border-[#E8DDCB] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#332820] text-sm">Notifications</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8DDCB] text-[#332820]">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                      </span>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] font-medium text-[#2E6B45] hover:text-[#255838] flex items-center gap-1 hover:underline transition-colors"
                        title="Mark all as read"
                      >
                        <CheckCheck size={14} />
                        <span>Mark all as read</span>
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E8DDCB]/50">
                    {notifLoading && notifications.length === 0 ? (
                      <div className="p-8 text-center text-[#6D716A] space-y-2">
                        <Loader2 size={20} className="animate-spin mx-auto text-[#2E6B45]" />
                        <p>Loading alerts telemetry…</p>
                      </div>
                    ) : notifError ? (
                      <div className="p-6 text-center text-xs text-[#C94A42] space-y-2">
                        <AlertCircle size={20} className="mx-auto" />
                        <p>{notifError}</p>
                        <button
                          onClick={loadNotifications}
                          className="px-3 py-1 bg-white border border-[#E8DDCB] text-[#332820] rounded-lg hover:border-[#2E6B45]"
                        >
                          Retry
                        </button>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#6D716A] space-y-2">
                        <CheckCircle2 size={28} className="mx-auto text-[#2E6B45]" />
                        <p className="font-bold text-[#332820] text-sm">All caught up!</p>
                        <p className="text-[#8C847B]">No active campus alerts at this time.</p>
                      </div>
                    ) : (
                      notifications.map((item) => {
                        const isRead = readIds.has(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`p-3.5 transition-colors cursor-pointer flex gap-3 hover:bg-[#F5F0E7]/60 group ${
                              isRead ? 'bg-white opacity-80' : 'bg-[#FAF8F5]'
                            }`}
                          >
                            {/* Unread dot or Severity indicator */}
                            <div className="shrink-0 mt-1">
                              {!isRead ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-[#2E6B45] block shadow-xs" />
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full bg-transparent block" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              {/* Header row: Title + Severity badge */}
                              <div className="flex items-start justify-between gap-2">
                                <p className={`font-semibold text-xs leading-snug ${isRead ? 'text-[#6D716A]' : 'text-[#332820]'}`}>
                                  {item.title}
                                </p>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 border ${
                                    item.severity === 'critical'
                                      ? 'bg-red-50 text-[#C94A42] border-red-200'
                                      : item.severity === 'warning'
                                      ? 'bg-amber-50 text-[#D89A35] border-amber-200'
                                      : 'bg-emerald-50 text-[#2E6B45] border-emerald-200'
                                  }`}
                                >
                                  {item.severity}
                                </span>
                              </div>

                              {/* Description */}
                              <p className="text-[11px] text-[#6D716A] line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>

                              {/* Footer row: Facility Tag + Time + Action */}
                              <div className="flex items-center justify-between text-[10px] text-[#8C847B] pt-1">
                                <div className="flex items-center gap-1.5">
                                  {item.building_name && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#E8DDCB]/60 text-[#332820] font-medium">
                                      {item.building_name}
                                    </span>
                                  )}
                                  <span>{formatRelativeTime(item.timestamp)}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {!isRead && (
                                    <button
                                      onClick={(e) => markAsRead(item.id, e)}
                                      className="text-[#2E6B45] hover:text-[#255838] font-medium flex items-center gap-0.5 hover:underline"
                                      title="Mark as read"
                                    >
                                      <Check size={12} />
                                      <span>Read</span>
                                    </button>
                                  )}
                                  <span className="text-[#C19A6B] group-hover:text-[#2E6B45] flex items-center gap-0.5">
                                    <ExternalLink size={10} />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-2.5 bg-[#FAF8F5] border-t border-[#E8DDCB] text-center text-[10px] text-[#8C847B]">
                    Click any alert to navigate to the corresponding campus module
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2 border-l border-[#E8DDCB] pl-3">
              <div className="w-7 h-7 rounded-full bg-[#E8DDCB] flex items-center justify-center text-[#332820]">
                <User size={14} />
              </div>
              <span className="font-semibold text-xs text-[#292D29] hidden sm:inline">Campus Admin</span>
            </div>
          </div>
        </header>

        {/* Page body: independently scrollable for all content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F5F0E7] relative min-h-0">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
