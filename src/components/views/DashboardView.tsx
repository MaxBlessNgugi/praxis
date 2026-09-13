import React, { useState } from 'react';
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Server, 
  Cpu, 
  Database, 
  ShieldAlert, 
  Clock, 
  Sparkles,
  Zap,
  TrendingUp,
  Layers
} from 'lucide-react';
import { Microservice, TelemetryPoint, AuditEvent } from '../../types';
import { TELEMETRY_HISTORY } from '../../data/mockData';

interface DashboardViewProps {
  services: Microservice[];
  auditLogs: AuditEvent[];
  onOpenDeployModal: () => void;
  onNavigateToServices: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  services,
  auditLogs,
  onOpenDeployModal,
  onNavigateToServices,
}) => {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('1h');
  const [activeMetric, setActiveMetric] = useState<'requests' | 'latency' | 'memory'>('requests');

  const telemetryData = TELEMETRY_HISTORY[timeRange] || TELEMETRY_HISTORY['1h'];

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const degradedCount = services.filter((s) => s.status === 'degraded').length;
  const deployingCount = services.filter((s) => s.status === 'deploying').length;

  const totalReplicas = services.reduce((acc, s) => acc + s.replicas, 0);

  // SVG Chart calculation
  const maxVal = Math.max(...telemetryData.map((d) => d[activeMetric])) * 1.15 || 100;
  const chartHeight = 160;
  const chartWidth = 600;

  const points = telemetryData.map((d, index) => {
    const x = (index / (telemetryData.length - 1)) * chartWidth;
    const val = d[activeMetric];
    const y = chartHeight - (val / maxVal) * chartHeight;
    return { x, y, val, time: d.time };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1]?.x || 0},${chartHeight} L 0,${chartHeight} Z`;

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & Quick Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-[#0e1628] border border-indigo-500/20 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              System Control Plane
            </span>
            <span className="text-xs text-slate-400">• Multi-Region Cluster Live</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            High-Availability Mesh Operations
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            {healthyCount} of {services.length} services operating within optimal SLA limits. Global edge latency is steady at 44ms.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="dash-explore-services-btn"
            onClick={onNavigateToServices}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Manage Services ({services.length})
          </button>
          <button
            id="dash-quick-deploy-btn"
            onClick={onOpenDeployModal}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950 transition-all cursor-pointer"
          >
            + Deploy Service
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Cluster Throughput</span>
            <span className="flex items-center text-emerald-400 text-[11px] font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">42.8k <span className="text-xs font-normal text-slate-400 font-mono">req/s</span></div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Peak today: 51.2k</span>
            <span className="text-indigo-400 font-mono">Edge CDN active</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Median p95 Latency</span>
            <span className="flex items-center text-emerald-400 text-[11px] font-semibold">
              <ArrowDownRight className="w-3.5 h-3.5" /> -6ms
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">44 <span className="text-xs font-normal text-slate-400 font-mono">ms</span></div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Target: &lt; 80ms</span>
            <span className="text-emerald-400 font-mono">Within SLA</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Workload Replicas</span>
            <span className="text-[11px] font-semibold text-indigo-300">
              {services.length} Microservices
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{totalReplicas} <span className="text-xs font-normal text-slate-400 font-mono">pods</span></div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Auto-scale: Enabled</span>
            <span className="text-slate-300 font-mono">{degradedCount > 0 ? `${degradedCount} Degraded` : 'All Stable'}</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Cloud Spend (MTD)</span>
            <span className="text-[11px] font-semibold text-slate-300 font-mono">
              92% budget
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">KSh 1,420 <span className="text-xs font-normal text-slate-400 font-mono">/ mo</span></div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Limit: KSh 1,600/mo</span>
            <span className="text-indigo-400 font-mono">-KSh 85 savings</span>
          </div>
        </div>
      </div>

      {/* Main Telemetry Performance Chart Panel */}
      <div className="p-5 rounded-2xl bg-[#0e1526] border border-slate-800 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Realtime Cluster Telemetry & Load
            </h3>
            <p className="text-xs text-slate-400">Continuous time-series metrics from distributed ingress and container daemon</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Selector */}
            <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveMetric('requests')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeMetric === 'requests' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Requests/s
              </button>
              <button
                onClick={() => setActiveMetric('latency')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeMetric === 'latency' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Latency (ms)
              </button>
              <button
                onClick={() => setActiveMetric('memory')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeMetric === 'memory' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                RAM (GB)
              </button>
            </div>

            {/* Time Filter */}
            <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
              {(['1h', '24h', '7d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2 py-1 rounded-md transition-colors font-mono cursor-pointer ${
                    timeRange === range ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SVG Area Chart */}
        <div className="py-4">
          <div className="relative w-full h-44 overflow-hidden">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={chartHeight * pct}
                  x2={chartWidth}
                  y2={chartHeight * pct}
                  stroke="#1E293B"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              ))}

              {/* Area Fill */}
              <path d={areaD} fill="url(#chartGradient)" />

              {/* Line Stroke */}
              <path d={pathD} fill="none" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Data Points */}
              {points.map((pt, i) => (
                <g key={i} className="group cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="#6366F1"
                    stroke="#0e1526"
                    strokeWidth="2"
                    className="transition-all group-hover:r-6 group-hover:fill-indigo-300"
                  />
                </g>
              ))}
            </svg>
          </div>

          {/* Time ticks label */}
          <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-2 px-1">
            {telemetryData.map((d, i) => (
              <span key={i}>{d.time}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Section: Services Status + Audit Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Active Workloads Snapshot */}
        <div className="p-5 rounded-2xl bg-[#0e1526] border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  Service Health Overview
                </h3>
                <span className="text-[11px] text-slate-400">{services.length} running workloads in mesh</span>
              </div>
              <button
                onClick={onNavigateToServices}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                View all →
              </button>
            </div>

            <div className="space-y-2.5">
              {services.slice(0, 4).map((svc) => (
                <div
                  key={svc.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                      {svc.category === 'Database' ? (
                        <Database className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Server className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">{svc.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{svc.region} • {svc.port}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="text-xs font-mono font-medium text-slate-300 block">{svc.replicas} pods</span>
                      <span className="text-[10px] text-slate-400">{svc.cpuUsage}% CPU</span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        svc.status === 'healthy'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40'
                          : svc.status === 'degraded'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800/40'
                          : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/40'
                      }`}
                    >
                      {svc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
            <span>Cluster SLA: <strong className="text-emerald-400">99.98%</strong></span>
            <span className="font-mono text-[11px]">Region: us-east-1a / 1b / 1c</span>
          </div>
        </div>

        {/* Right: Audit Log & Security Events */}
        <div className="p-5 rounded-2xl bg-[#0e1526] border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Live Audit & Deployment Feed
              </h3>
              <span className="text-[11px] text-slate-400">Tamper-proof system events stream</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
              STREAMING
            </span>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-xs p-2 rounded-lg hover:bg-slate-900/60 transition-colors">
                <img
                  src={log.actor.avatar}
                  alt={log.actor.name}
                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-slate-200 truncate">{log.actor.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-snug">{log.action}</p>
                  <span className="inline-block text-[10px] font-mono text-indigo-300 bg-slate-800/80 px-1.5 py-0.2 rounded mt-1">
                    {log.target}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
