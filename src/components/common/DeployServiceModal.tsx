import React, { useState } from 'react';
import { X, Server, Layers, Cpu, Database, Check, AlertCircle } from 'lucide-react';
import { Microservice } from '../../types';

interface DeployServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (service: Microservice) => void;
}

export const DeployServiceModal: React.FC<DeployServiceModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Backend' | 'Frontend' | 'Database' | 'Worker' | 'Gateway'>('Backend');
  const [port, setPort] = useState('3000');
  const [region, setRegion] = useState('us-east-1 (N. Virginia)');
  const [replicas, setReplicas] = useState(2);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a service workload name');
      return;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newService: Microservice = {
      id: `svc-${Date.now()}`,
      name: name.trim(),
      slug,
      category,
      status: 'deploying',
      cpuUsage: Math.floor(Math.random() * 20) + 5,
      memUsage: 256,
      replicas,
      port: parseInt(port, 10) || 8080,
      region,
      lastDeployed: 'Just now',
      version: 'v1.0.0',
      uptime: '100%',
      environment: 'production',
    };

    onDeploy(newService);
    setName('');
    setError('');
    onClose();
  };

  return (
    <div 
      id="deploy-service-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        id="deploy-service-modal-card"
        className="w-full max-w-lg bg-[#0e1628] border border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Deploy New Workload Service</h3>
            <p className="text-xs text-slate-400">Provision a high-availability container in the mesh cluster</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Service Workload Name
            </label>
            <input
              id="service-name-input"
              type="text"
              placeholder="e.g. notifications-worker or auth-router"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-100 text-xs focus:outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category
              </label>
              <select
                id="service-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="Backend">Backend Service</option>
                <option value="Gateway">API Gateway</option>
                <option value="Worker">Background Worker</option>
                <option value="Database">Database Shard</option>
                <option value="Frontend">Frontend Edge</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Container Port
              </label>
              <input
                id="service-port-input"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Target Cloud Region
            </label>
            <select
              id="service-region-select"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
            >
              <option value="us-east-1 (N. Virginia)">us-east-1 (N. Virginia)</option>
              <option value="us-west-2 (Oregon)">us-west-2 (Oregon)</option>
              <option value="eu-west-1 (Ireland)">eu-west-1 (Ireland)</option>
              <option value="ap-southeast-1 (Singapore)">ap-southeast-1 (Singapore)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <span>Desired Instance Replicas</span>
              <span className="font-mono text-indigo-400">{replicas} pods</span>
            </div>
            <input
              id="service-replicas-slider"
              type="range"
              min="1"
              max="8"
              value={replicas}
              onChange={(e) => setReplicas(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>1 (Minimal)</span>
              <span>4 (High-Availability)</span>
              <span>8 (Extreme Scale)</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-deploy-service-btn"
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-semibold text-white rounded-lg shadow-md shadow-indigo-950 transition-all cursor-pointer"
            >
              Deploy Workload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
