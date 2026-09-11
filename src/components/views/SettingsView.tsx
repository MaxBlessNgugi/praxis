import React, { useState } from 'react';
import { Settings, Sliders, Bell, Database, Globe, Save, Check } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [clusterName, setClusterName] = useState('nexus-prod-mesh-01');
  const [logRetentionDays, setLogRetentionDays] = useState(90);
  const [autoScaleCpuThreshold, setAutoScaleCpuThreshold] = useState(75);
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.slack.com/services/T00/B00/XXXX');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          Cluster Configuration & Preferences
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Tune daemon scaling thresholds, audit log retention, and global incident webhook endpoints
        </p>
      </div>

      {saved && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>Cluster configuration successfully synced to all availability zones!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Cluster Basics */}
        <div className="p-5 rounded-2xl bg-[#0e1628] border border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            Infrastructure Identity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cluster Hostname Identifier
              </label>
              <input
                type="text"
                value={clusterName}
                onChange={(e) => setClusterName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Region Mesh
              </label>
              <select className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none">
                <option>Multi-Region (us-east-1 + eu-west-1)</option>
                <option>US Only (us-east-1 + us-west-2)</option>
                <option>EU Only (eu-west-1 + eu-central-1)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Daemon Autoscale */}
        <div className="p-5 rounded-2xl bg-[#0e1628] border border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Autoscaling Policies
          </h3>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
              <span>CPU Scaling Trigger Threshold</span>
              <span className="font-mono text-indigo-400">{autoScaleCpuThreshold}% CPU</span>
            </div>
            <input
              type="range"
              min="40"
              max="95"
              value={autoScaleCpuThreshold}
              onChange={(e) => setAutoScaleCpuThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              When workload sustained CPU surpasses {autoScaleCpuThreshold}% for over 2 minutes, additional container pods are spawned automatically.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
              <span>Audit Log Retention Period</span>
              <span className="font-mono text-indigo-400">{logRetentionDays} days</span>
            </div>
            <select
              value={logRetentionDays}
              onChange={(e) => setLogRetentionDays(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value={30}>30 Days (Standard Tier)</option>
              <option value={90}>90 Days (Enterprise Compliance)</option>
              <option value={365}>365 Days (SOC2 / HIPAA Long-term)</option>
            </select>
          </div>
        </div>

        {/* Webhooks */}
        <div className="p-5 rounded-2xl bg-[#0e1628] border border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            Alerts & Slack Integrations
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Incident Notification Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-semibold text-white rounded-xl shadow-md shadow-indigo-950 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Cluster Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
