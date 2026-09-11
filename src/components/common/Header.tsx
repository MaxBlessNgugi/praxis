import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { SystemTab } from '../../types';

interface HeaderProps {
  activeTab: SystemTab;
  onOpenCommand: () => void;
  onOpenDeployModal: () => void;
  environment: string;
  setEnvironment: (env: string) => void;
  clusterHealth: 'healthy' | 'warning' | 'critical';
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenCommand,
  onOpenDeployModal,
  environment,
  setEnvironment,
  clusterHealth,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEnvDropdown, setShowEnvDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const notifications = [
    { id: 1, title: 'Autoscale Triggered', desc: 'Replicas scaled on ws-mesh due to 88% CPU load', time: '4m ago', unread: true },
    { id: 2, title: 'Certificate Renewed', desc: 'Wildcard SSL for *.nexus.cloud refreshed', time: '1h ago', unread: true },
    { id: 3, title: 'Backup Completed', desc: 'Nightly snapshot of PostgreSQL shard finished', time: '4h ago', unread: false },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <header 
      id="system-app-header"
      className="h-16 border-b border-slate-800 bg-[#0d1424]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30"
    >
      {/* Left: Environment Selector & Cluster Status */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            id="environment-dropdown-btn"
            onClick={() => setShowEnvDropdown(!showEnvDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="capitalize">{environment}</span>
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">us-east-1</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showEnvDropdown && (
            <div 
              id="environment-dropdown-menu"
              className="absolute left-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-1.5 z-40"
            >
              <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase px-2 py-1">
                Select Environment
              </div>
              {['production', 'staging', 'development'].map((env) => (
                <button
                  key={env}
                  onClick={() => {
                    setEnvironment(env);
                    setShowEnvDropdown(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${
                    environment === env ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="capitalize">{env}</span>
                  {environment === env && <span className="text-[10px] text-indigo-400 font-mono">ACTIVE</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/40 text-[11px] font-medium text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cluster Status: 99.98% Healthy</span>
        </div>
      </div>

      {/* Center: Quick Search Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <button
          id="global-search-trigger"
          onClick={onOpenCommand}
          className="w-full flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            <span>Search resources, services, audit logs...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800/90 rounded border border-slate-700/60">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          id="refresh-telemetry-btn"
          onClick={handleRefresh}
          title="Refresh cluster metrics"
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            id="notifications-bell-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#0d1424]"></span>
          </button>

          {showNotifications && (
            <div 
              id="notifications-popover"
              className="absolute right-0 mt-2 w-80 bg-[#11192e] border border-slate-800 rounded-xl shadow-2xl p-2 z-40"
            >
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800 mb-1">
                <span className="text-xs font-semibold text-slate-200">Alerts & Notifications</span>
                <span className="text-[10px] text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/40">
                  2 new
                </span>
              </div>
              <div className="divide-y divide-slate-800/50">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 hover:bg-slate-800/40 rounded-lg transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-200">{n.title}</span>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Button: Deploy Workload */}
        <button
          id="header-deploy-workload-btn"
          onClick={onOpenDeployModal}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-semibold text-white rounded-lg shadow-sm shadow-indigo-950 transition-all cursor-pointer"
        >
          <span>+ Deploy Service</span>
        </button>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
            alt="Elena Rostova"
            className="w-8 h-8 rounded-full ring-2 ring-indigo-500/30 object-cover"
          />
          <div className="hidden xl:block text-left">
            <span className="block text-xs font-semibold text-slate-200 leading-none">Elena Rostova</span>
            <span className="text-[10px] text-slate-400 font-mono">Cluster Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};
