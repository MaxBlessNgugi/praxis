import React, { useState } from 'react';
import { SystemTab, Microservice, AuditEvent, TeamMember, ApiKey } from '../../types';
import { INITIAL_SERVICES, INITIAL_AUDIT_LOGS, INITIAL_MEMBERS, INITIAL_API_KEYS } from '../../data/mockData';
import { Header } from '../common/Header';
import { Sidebar } from '../common/Sidebar';
import { CommandMenu } from '../common/CommandMenu';
import { DeployServiceModal } from '../common/DeployServiceModal';
import { DashboardView } from '../views/DashboardView';
import { ServicesView } from '../views/ServicesView';
import { TeamView } from '../views/TeamView';
import { SecurityView } from '../views/SecurityView';
import { SettingsView } from '../views/SettingsView';

interface SystemAppProps {
  initialTab?: SystemTab;
  isFramed?: boolean;
}

export const SystemApp: React.FC<SystemAppProps> = ({
  initialTab = 'dashboard',
  isFramed = false,
}) => {
  const [activeTab, setActiveTab] = useState<SystemTab>(initialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [environment, setEnvironment] = useState('production');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);

  // Core state
  const [services, setServices] = useState<Microservice[]>(INITIAL_SERVICES);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(INITIAL_AUDIT_LOGS);
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(INITIAL_API_KEYS);

  // Handlers
  const handleDeployService = (newService: Microservice) => {
    setServices([newService, ...services]);
    const newLog: AuditEvent = {
      id: `evt-${Date.now()}`,
      timestamp: 'Just now',
      actor: {
        name: 'Elena Rostova',
        email: 'elena.r@nexus.cloud',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      },
      action: `Deployed new workload container ${newService.name}`,
      target: `${newService.slug} (${environment})`,
      severity: 'info',
    };
    setAuditLogs([newLog, ...auditLogs]);
  };

  const handleUpdateService = (updated: Microservice) => {
    setServices(services.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteService = (id: string) => {
    const target = services.find((s) => s.id === id);
    setServices(services.filter((s) => s.id !== id));
    if (target) {
      const newLog: AuditEvent = {
        id: `evt-${Date.now()}`,
        timestamp: 'Just now',
        actor: {
          name: 'Elena Rostova',
          email: 'elena.r@nexus.cloud',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        },
        action: `Terminated workload ${target.name}`,
        target: target.slug,
        severity: 'warning',
      };
      setAuditLogs([newLog, ...auditLogs]);
    }
  };

  const handleAddMember = (member: TeamMember) => {
    setMembers([...members, member]);
  };

  const handleUpdateRole = (id: string, newRole: TeamMember['role']) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, role: newRole } : m)));
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleAddApiKey = (key: ApiKey) => {
    setApiKeys([key, ...apiKeys]);
  };

  const handleRevokeApiKey = (id: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
  };

  return (
    <div className={`flex w-full h-full bg-[#090d16] text-slate-100 overflow-hidden ${isFramed ? 'text-xs' : ''}`}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        servicesCount={services.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          activeTab={activeTab}
          onOpenCommand={() => setIsCommandOpen(true)}
          onOpenDeployModal={() => setIsDeployModalOpen(true)}
          environment={environment}
          setEnvironment={setEnvironment}
          clusterHealth="healthy"
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              services={services}
              auditLogs={auditLogs}
              onOpenDeployModal={() => setIsDeployModalOpen(true)}
              onNavigateToServices={() => setActiveTab('services')}
            />
          )}

          {activeTab === 'services' && (
            <ServicesView
              services={services}
              onOpenDeployModal={() => setIsDeployModalOpen(true)}
              onUpdateService={handleUpdateService}
              onDeleteService={handleDeleteService}
            />
          )}

          {activeTab === 'team' && (
            <TeamView
              members={members}
              onAddMember={handleAddMember}
              onUpdateRole={handleUpdateRole}
              onRemoveMember={handleRemoveMember}
            />
          )}

          {activeTab === 'security' && (
            <SecurityView
              apiKeys={apiKeys}
              onAddApiKey={handleAddApiKey}
              onRevokeApiKey={handleRevokeApiKey}
            />
          )}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Command Palette Modal */}
      <CommandMenu
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onNavigate={setActiveTab}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
      />

      {/* Deploy Workload Modal */}
      <DeployServiceModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onDeploy={handleDeployService}
      />
    </div>
  );
};
