import React from 'react';
import { 
  Activity, 
  Server, 
  Users, 
  Shield, 
  Settings, 
  Boxes, 
  Cpu, 
  ChevronLeft, 
  ChevronRight,
  Database,
  CloudLightning,
  Sparkles
} from 'lucide-react';
import { SystemTab } from '../../types';

interface SidebarProps {
  activeTab: SystemTab;
  onSelectTab: (tab: SystemTab) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  servicesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  setCollapsed,
  servicesCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as SystemTab,
      label: 'Telemetry Overview',
      icon: Activity,
      badge: 'Live',
      badgeColor: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40',
    },
    {
      id: 'services' as SystemTab,
      label: 'Microservices',
      icon: Server,
      badge: `${servicesCount}`,
      badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/40',
    },
    {
      id: 'team' as SystemTab,
      label: 'Team & RBAC',
      icon: Users,
      badge: '5',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    },
    {
      id: 'security' as SystemTab,
      label: 'Secrets & Keys',
      icon: Shield,
      badge: '3',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    },
    {
      id: 'settings' as SystemTab,
      label: 'Cluster Config',
      icon: Settings,
    },
  ];

  return (
    <aside
      id="system-sidebar"
      className={`border-r border-slate-800 bg-[#0a0f1d] flex flex-col justify-between transition-all duration-300 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top: Logo & System Identity */}
      <div>
        <div className="h-16 flex items-center px-4 border-b border-slate-800 justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-950 shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="font-bold text-sm text-slate-100 tracking-tight flex items-center gap-1.5">
                  Nexus Cloud
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                    PRO
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 block truncate">Distributed Mesh OS</span>
              </div>
            )}
          </div>

          <button
            id="sidebar-toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          {!collapsed && (
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
              System Control
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer relative group ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 shadow-sm border border-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                } ${collapsed ? 'justify-center' : 'justify-between'}`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && item.badge && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Resource Metric & Pro status */}
      {!collapsed ? (
        <div className="p-4 m-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Cluster CPU
            </span>
            <span className="font-mono text-slate-200 font-semibold">41.8%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full" style={{ width: '41.8%' }}></div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>6 Node Shards</span>
            <span className="text-emerald-400 font-medium">Stable</span>
          </div>
        </div>
      ) : (
        <div className="p-3 text-center">
          <div className="w-2 h-2 rounded-full bg-emerald-400 mx-auto" title="Cluster Healthy"></div>
        </div>
      )}
    </aside>
  );
};
