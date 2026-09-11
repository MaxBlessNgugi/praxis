import React, { useState } from 'react';
import { 
  Server, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  Cpu, 
  HardDrive, 
  MoreVertical, 
  CheckCircle2, 
  AlertTriangle, 
  PauseCircle, 
  PlayCircle, 
  Trash2,
  ExternalLink,
  Zap,
  Globe
} from 'lucide-react';
import { Microservice } from '../../types';

interface ServicesViewProps {
  services: Microservice[];
  onOpenDeployModal: () => void;
  onUpdateService: (updated: Microservice) => void;
  onDeleteService: (id: string) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  onOpenDeployModal,
  onUpdateService,
  onDeleteService,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const categories = ['All', 'Gateway', 'Backend', 'Worker', 'Database'];

  const filtered = services.filter((s) => {
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.region.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleScale = (service: Microservice, delta: number) => {
    const newCount = Math.max(1, Math.min(12, service.replicas + delta));
    onUpdateService({
      ...service,
      replicas: newCount,
    });
  };

  const handleRestart = (service: Microservice) => {
    onUpdateService({
      ...service,
      status: 'deploying',
    });
    setTimeout(() => {
      onUpdateService({
        ...service,
        status: 'healthy',
        lastDeployed: 'Just now',
      });
    }, 1200);
  };

  const handleToggleStatus = (service: Microservice) => {
    const nextStatus = service.status === 'healthy' ? 'stopped' : 'healthy';
    onUpdateService({
      ...service,
      status: nextStatus,
    });
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            Distributed Microservices & Workloads
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage container pods, scaling policies, and ingress port routing across cloud regions
          </p>
        </div>

        <button
          id="services-deploy-btn"
          onClick={onOpenDeployModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-semibold text-white rounded-lg shadow-md shadow-indigo-950 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Deploy New Workload</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="service-search-input"
            type="text"
            placeholder="Search service name, slug, or cloud region..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
            <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-300 font-medium">No microservices found</p>
            <p className="text-xs text-slate-500 mt-1">Try refining your search term or deploy a new service</p>
          </div>
        ) : (
          filtered.map((service) => (
            <div
              key={service.id}
              id={`service-card-${service.id}`}
              className="p-5 rounded-2xl bg-[#0e1628] border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between shadow-md relative group"
            >
              <div>
                {/* Header: Title & Status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {service.name}
                      </h3>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {service.version}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                      /{service.slug} • Port {service.port}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${
                      service.status === 'healthy'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40'
                        : service.status === 'degraded'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800/40'
                        : service.status === 'deploying'
                        ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/40 animate-pulse'
                        : 'bg-rose-950/80 text-rose-300 border-rose-800/40'
                    }`}
                  >
                    {service.status}
                  </span>
                </div>

                {/* Region & Environment badge */}
                <div className="flex items-center gap-2 mb-4 text-xs text-slate-400">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="truncate">{service.region}</span>
                </div>

                {/* Metrics bars */}
                <div className="space-y-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60 mb-4">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-indigo-400" /> CPU Usage
                      </span>
                      <span className="font-mono text-slate-200">{service.cpuUsage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          service.cpuUsage > 80
                            ? 'bg-rose-500'
                            : service.cpuUsage > 60
                            ? 'bg-amber-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, service.cpuUsage)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-cyan-400" /> Memory Allocation
                      </span>
                      <span className="font-mono text-slate-200">{service.memUsage} MB</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${Math.min(100, (service.memUsage / 4096) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom: Replicas Counter & Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                {/* Scale controls */}
                <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono mr-1">Pods:</span>
                  <button
                    onClick={() => handleScale(service, -1)}
                    disabled={service.replicas <= 1}
                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 text-xs font-bold cursor-pointer"
                    title="Scale down"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs font-semibold text-white px-1">{service.replicas}</span>
                  <button
                    onClick={() => handleScale(service, 1)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                    title="Scale up"
                  >
                    +
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleRestart(service)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Restart pod containers"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(service)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                    title={service.status === 'stopped' ? 'Resume service' : 'Pause service'}
                  >
                    {service.status === 'stopped' ? (
                      <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <PauseCircle className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => onDeleteService(service.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Terminate workload"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
