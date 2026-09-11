import React, { useState, useEffect } from 'react';
import { Search, Server, Shield, Users, Activity, Settings, Plus, ExternalLink, X } from 'lucide-react';
import { SystemTab } from '../../types';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: SystemTab) => void;
  onOpenDeployModal: () => void;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenDeployModal,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'deploy',
      title: 'Deploy New Workload Service',
      category: 'Actions',
      icon: Plus,
      badge: 'Action',
      run: () => {
        onClose();
        onOpenDeployModal();
      },
    },
    {
      id: 'dash',
      title: 'Go to Cluster Telemetry Dashboard',
      category: 'Navigation',
      icon: Activity,
      badge: 'View',
      run: () => {
        onNavigate('dashboard');
        onClose();
      },
    },
    {
      id: 'services',
      title: 'Manage Running Microservices & Shards',
      category: 'Navigation',
      icon: Server,
      badge: 'View',
      run: () => {
        onNavigate('services');
        onClose();
      },
    },
    {
      id: 'team',
      title: 'Team Access & RBAC Role Management',
      category: 'Navigation',
      icon: Users,
      badge: 'View',
      run: () => {
        onNavigate('team');
        onClose();
      },
    },
    {
      id: 'security',
      title: 'API Keys, Audit Vault & Secrets',
      category: 'Navigation',
      icon: Shield,
      badge: 'Security',
      run: () => {
        onNavigate('security');
        onClose();
      },
    },
    {
      id: 'settings',
      title: 'System Preferences & Autoscale Policies',
      category: 'Navigation',
      icon: Settings,
      badge: 'Config',
      run: () => {
        onNavigate('settings');
        onClose();
      },
    },
  ];

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div 
      id="command-palette-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div 
        id="command-palette-dialog"
        className="w-full max-w-xl bg-[#0e1626] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            id="command-search-input"
            type="text"
            placeholder="Type a command, jump to view, or search workloads..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
            ESC
          </kbd>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No matching commands found for "{query}".
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  id={`command-item-${item.id}`}
                  onClick={item.run}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left text-sm text-slate-200 hover:bg-indigo-600/15 hover:text-indigo-200 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-indigo-600/30 flex items-center justify-center text-slate-300 group-hover:text-indigo-300 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium text-slate-200 group-hover:text-white">{item.title}</span>
                      <span className="block text-[11px] text-slate-400">{item.category}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                    {item.badge}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
          <span>Tip: Press <kbd className="font-mono text-[10px] bg-slate-800 px-1 py-0.5 rounded">↑</kbd> <kbd className="font-mono text-[10px] bg-slate-800 px-1 py-0.5 rounded">↓</kbd> to navigate</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Nexus v2.4 Live
          </span>
        </div>
      </div>
    </div>
  );
};
