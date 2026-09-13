import React, { useState } from 'react';
import { WorshipService, LiturgyItem, ServiceRoleAssignment, ServiceType } from '../../../../types';
import { INITIAL_SERVICES } from '../../../../data/churchMockData';
import { DEFAULT_LOCATION, LOCATIONS, SUNDAY_WINDOW, sundayLiturgy } from '../../../../data/churchDomain';
import { dialogProps } from '../../dialog';
import { interactiveCard } from '../../interactiveCard'
;

export const ServicePlannerPanel: React.FC = () => {
  const [services, setServices] = useState<WorshipService[]>(INITIAL_SERVICES);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(INITIAL_SERVICES[0].id);
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [isCreatingService, setIsCreatingService] = useState<boolean>(false);
  const [isAddingLiturgyItem, setIsAddingLiturgyItem] = useState<boolean>(false);
  const [previewBulletinModal, setPreviewBulletinModal] = useState<boolean>(false);

  // New Service Form State
  const [newServiceTitle, setNewServiceTitle] = useState('');
  const [newServiceType, setNewServiceType] = useState<ServiceType>('sunday-morning');
  const [newServiceDate, setNewServiceDate] = useState('2025-02-16');
  const [newServiceTime, setNewServiceTime] = useState<string>(SUNDAY_WINDOW);
  const [newServiceCampus, setNewServiceCampus] = useState<string>(DEFAULT_LOCATION);
  const [newServiceTheme, setNewServiceTheme] = useState('');
  const [newServiceScripture, setNewServiceScripture] = useState('');
  const [newServicePreacher, setNewServicePreacher] = useState('Bishop Sammy');
  const [newServiceWorshipLead, setNewServiceWorshipLead] = useState('Caleb Timothy Mwangi');

  // New Service Item Form State
  const [newLiturgyType, setNewLiturgyType] = useState<LiturgyItem['type']>('worship-praise');
  const [newLiturgyTitle, setNewLiturgyTitle] = useState('');
  const [newLiturgyDuration, setNewLiturgyDuration] = useState<number>(10);
  const [newLiturgyLeader, setNewLiturgyLeader] = useState('Caleb Timothy Mwangi');
  const [newLiturgyNotes, setNewLiturgyNotes] = useState('');
  const [newLiturgyScripture, setNewLiturgyScripture] = useState('');

  const currentService = services.find((s) => s.id === selectedServiceId) || services[0];

  const filteredServices = services.filter((s) => {
    if (filterType === 'all') return true;
    return s.status === filterType;
  });

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceTitle.trim()) return;

    const newService: WorshipService = {
      id: `srv-${Date.now()}`,
      title: newServiceTitle,
      serviceType: newServiceType,
      date: newServiceDate,
      time: newServiceTime,
      campus: newServiceCampus,
      theme: newServiceTheme || 'Grace Abounding in Christ',
      scriptureFocus: newServiceScripture || 'Ephesians 2:1-10',
      preacher: newServicePreacher,
      worshipLeader: newServiceWorshipLead,
      status: 'upcoming',
      expectedAttendance: 320,
      keyRoles: [
        { role: 'preacher', roleName: 'Minister of the Word', assignedMemberId: 'mbr-1', assignedMemberName: newServicePreacher, status: 'confirmed' },
        { role: 'worship-lead', roleName: 'Music Director', assignedMemberId: 'mbr-1', assignedMemberName: newServiceWorshipLead, status: 'confirmed' },
        { role: 'presiding-elder', roleName: 'Elder on Duty', assignedMemberId: 'mbr-2', assignedMemberName: 'Marcus Kamau', status: 'confirmed' },
        { role: 'scripture-reader', roleName: 'Scripture Reader', assignedMemberId: 'mbr-3', assignedMemberName: 'Clara Wambui', status: 'pending' },
        { role: 'sound-av', roleName: 'Sound Desk Tech', assignedMemberId: 'mbr-7', assignedMemberName: 'David Kimani', status: 'confirmed' },
        { role: 'head-usher', roleName: 'Chief Usher', assignedMemberId: 'mbr-5', assignedMemberName: 'Arthur Wanjala', status: 'confirmed' },
      ],
      liturgyOrder: sundayLiturgy(`lit-${Date.now()}-`, {
        2: { leader: newServiceWorshipLead },
        4: { leader: newServicePreacher, scriptureRef: newServiceScripture },
        5: { leader: newServicePreacher },
      }),
    };

    setServices([newService, ...services]);
    setSelectedServiceId(newService.id);
    setIsCreatingService(false);
    setNewServiceTitle('');
    setNewServiceTheme('');
    setNewServiceScripture('');
  };

  const handleAddLiturgyItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLiturgyTitle.trim()) return;

    const newItem: LiturgyItem = {
      id: `lit-${Date.now()}`,
      order: currentService.liturgyOrder.length + 1,
      type: newLiturgyType,
      title: newLiturgyTitle,
      durationMinutes: Number(newLiturgyDuration) || 5,
      leader: newLiturgyLeader,
      notes: newLiturgyNotes,
      scriptureRef: newLiturgyScripture,
    };

    const updatedLiturgy = [...currentService.liturgyOrder, newItem];
    const updatedServices = services.map((s) =>
      s.id === currentService.id ? { ...s, liturgyOrder: updatedLiturgy } : s
    );

    setServices(updatedServices);
    setIsAddingLiturgyItem(false);
    setNewLiturgyTitle('');
    setNewLiturgyNotes('');
    setNewLiturgyScripture('');
  };

  const handleMoveLiturgyItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === currentService.liturgyOrder.length - 1)
    ) {
      return;
    }

    const items = [...currentService.liturgyOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    // renumber orders
    const reordered = items.map((item, idx) => ({ ...item, order: idx + 1 }));

    const updatedServices = services.map((s) =>
      s.id === currentService.id ? { ...s, liturgyOrder: reordered } : s
    );
    setServices(updatedServices);
  };

  const handleDeleteLiturgyItem = (itemId: string) => {
    const filtered = currentService.liturgyOrder
      .filter((item) => item.id !== itemId)
      .map((item, idx) => ({ ...item, order: idx + 1 }));

    const updatedServices = services.map((s) =>
      s.id === currentService.id ? { ...s, liturgyOrder: filtered } : s
    );
    setServices(updatedServices);
  };

  const handleUpdateRoleAssignment = (
    roleIndex: number,
    assignedName: string,
    status: ServiceRoleAssignment['status']
  ) => {
    const updatedRoles = [...currentService.keyRoles];
    updatedRoles[roleIndex] = {
      ...updatedRoles[roleIndex],
      assignedMemberName: assignedName,
      status,
    };

    const updatedServices = services.map((s) =>
      s.id === currentService.id ? { ...s, keyRoles: updatedRoles } : s
    );
    setServices(updatedServices);
  };

  const totalServiceDuration = currentService.liturgyOrder.reduce(
    (acc, curr) => acc + curr.durationMinutes,
    0
  );

  return (
    <div className="flex flex-col space-y-6">
      {/* Action Header & Statistics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Active Services</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">{services.length} Planned</div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">event_available</span>
              Liturgies Synchronized
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">church</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Current Service Time</span>
            <div className="text-2xl font-black text-[#C2410C] mt-0.5">{totalServiceDuration} Mins</div>
            <span className="text-xs text-[#57534E] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">timer</span>
              {currentService.liturgyOrder.length} Elements Scheduled
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#D97706]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">schedule</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Key Duty Officers</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">
              {currentService.keyRoles.filter((r) => r.status === 'confirmed').length} / {currentService.keyRoles.length}
            </div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">verified</span>
              Confirmed for Duty
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#059669]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">badge</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Expected Capacity</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">{currentService.expectedAttendance || 320}</div>
            <span className="text-xs text-[#57534E] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">groups</span>
              Sanctuary Main Hall
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">meeting_room</span>
          </div>
        </div>
      </div>

      {/* Main Dual-Column Workspace: Service Selector & Service Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Service List & Filter */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#FFFFFF] rounded-[14px] p-4 border border-[#E7E5E4] shadow-warm-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline text-sm font-bold text-[#1C1917] flex items-center gap-1.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#C2410C]">event_note</span>
                Church Services Roll
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingService(true)}
                className="px-2.5 py-1.5 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add</span>
                New Service
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-[#F8F1E9] rounded-[10px] mb-3">
              {(['all', 'upcoming', 'completed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterType(filter)}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-[7px] transition-all capitalize cursor-pointer ${
                    filterType === filter
                      ? 'bg-[#C2410C] text-white shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Service Cards List */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredServices.map((srv) => {
                const isSelected = srv.id === currentService.id;
                return (
                  <div
                    key={srv.id}
                    {...interactiveCard(() => setSelectedServiceId(srv.id))}
                    className={`p-3.5 rounded-[12px] border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FDF8F3] border-[#C2410C] ring-2 ring-[#C2410C]/20 shadow-sm'
                        : 'bg-[#FFFFFF] border-[#E7E5E4] hover:bg-[#F8F1E9]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          srv.status === 'upcoming'
                            ? 'bg-[#059669]/10 text-[#059669]'
                            : 'bg-[#57534E]/10 text-[#57534E]'
                        }`}
                      >
                        {srv.serviceType.replace('-', ' ')}
                      </span>
                      <span className="text-[11px] font-semibold text-[#A8A29E] font-mono">{srv.date}</span>
                    </div>

                    <h4 className="font-headline text-xs font-bold text-[#1C1917] mt-1.5 leading-snug">
                      {srv.title}
                    </h4>

                    <div className="text-[11px] text-[#57534E] mt-1 italic line-clamp-1">
                      Theme: "{srv.theme}"
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#A8A29E] mt-2 pt-2 border-t border-[#E7E5E4]/80">
                      <span className="flex items-center gap-1 text-[#57534E]">
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">person</span>
                        {srv.preacher.split(' ').slice(-1)[0]}
                      </span>
                      <span className="flex items-center gap-1">
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">format_list_numbered</span>
                        {srv.liturgyOrder.length} Items
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (8 cols): Active Service Details, Service Builder & Key Roles */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Service Banner */}
          <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-[#C2410C]/10 text-[#C2410C] text-[11px] font-bold uppercase tracking-wider">
                    {currentService.campus}
                  </span>
                  <span className="text-xs font-semibold text-[#57534E] flex items-center gap-1">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">calendar_today</span>
                    {currentService.date} · {currentService.time}
                  </span>
                </div>
                <h2 className="font-headline text-lg sm:text-xl font-extrabold text-[#1C1917]">
                  {currentService.title}
                </h2>
                <p className="text-xs text-[#C2410C] font-semibold mt-0.5">
                  Theme: <span className="text-[#1C1917] font-normal">{currentService.theme}</span> · Focus: <span className="font-mono text-[#C2410C]">{currentService.scriptureFocus}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPreviewBulletinModal(true)}
                  className="px-3 py-2 rounded-[9px] bg-[#F8F1E9] hover:bg-[#F5EDE4] text-[#C2410C] text-xs font-bold border border-[#E7E5E4] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">menu_book</span>
                  Print Bulletin
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingLiturgyItem(true)}
                  className="px-3 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_circle</span>
                  Add Service Item
                </button>
              </div>
            </div>

            {/* Key Officers Roster for This Service */}
            <div className="mt-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E] mb-2.5 block">
                Presiding Ministers & Key Service Officers
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentService.keyRoles.map((role, idx) => (
                  <div
                    key={role.role}
                    className="p-2.5 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider truncate">
                        {role.roleName}
                      </div>
                      <div className="font-headline text-xs font-bold text-[#1C1917] truncate">
                        {role.assignedMemberName}
                      </div>
                    </div>
                    <select aria-label="Role assignment status"
                      value={role.status}
                      onChange={(e) =>
                        handleUpdateRoleAssignment(idx, role.assignedMemberName, e.target.value as any)
                      }
                      className={`text-[10px] font-bold px-1.5 py-1 rounded-[6px] border ${
                        role.status === 'confirmed'
                          ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/30'
                          : role.status === 'pending'
                          ? 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30'
                          : 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30'
                      }`}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="replacement">Substitute</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order of Service / Service Builder Table */}
          <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">receipt_long</span>
                  Order of Service
                </h3>
                <p className="text-xs text-[#57534E] mt-0.5">
                  Reorder service items, adjust target durations, and review presiding ministers.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#F8F1E9] text-[#57534E] border border-[#E7E5E4]">
                Total: {totalServiceDuration} min
              </span>
            </div>

            {/* Service Items List */}
            <div className="space-y-2">
              {currentService.liturgyOrder.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-[10px] bg-[#FDF8F3] hover:bg-[#F5EDE4]/60 border border-[#E7E5E4] transition-all group"
                >
                  {/* Order Number & Reorder Buttons */}
                  <div className="flex items-center gap-1 text-[#A8A29E]">
                    <div className="w-6 h-6 rounded-full bg-[#FFFFFF] border border-[#E7E5E4] font-bold text-xs flex items-center justify-center text-[#1C1917]">
                      {item.order}
                    </div>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveLiturgyItem(index, 'up')}
                        className={`p-0.5 hover:text-[#C2410C] ${index === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                        title="Move Up"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">arrow_drop_up</span>
                      </button>
                      <button
                        type="button"
                        disabled={index === currentService.liturgyOrder.length - 1}
                        onClick={() => handleMoveLiturgyItem(index, 'down')}
                        className={`p-0.5 hover:text-[#C2410C] ${
                          index === currentService.liturgyOrder.length - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        title="Move Down"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                      </button>
                    </div>
                  </div>

                  {/* Service Item Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-headline text-xs font-bold text-[#1C1917] truncate">
                        {item.title}
                      </span>
                      {item.scriptureRef && (
                        <span className="px-1.5 py-0.2 text-[10px] rounded bg-[#C2410C]/10 text-[#C2410C] font-mono">
                          {item.scriptureRef}
                        </span>
                      )}
                      {item.hymnOrSongTitle && (
                        <span className="px-1.5 py-0.2 text-[10px] rounded bg-[#059669]/10 text-[#059669] font-medium">
                          {item.hymnOrSongTitle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#57534E] mt-0.5">
                      <span className="flex items-center gap-1">
                        <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-[#A8A29E]">person</span>
                        {item.leader}
                      </span>
                      {item.notes && <span className="text-[#A8A29E] truncate">· {item.notes}</span>}
                    </div>
                  </div>

                  {/* Duration Pill */}
                  <div className="text-right shrink-0">
                    <span className="px-2 py-1 rounded-[6px] bg-[#FFFFFF] border border-[#E7E5E4] text-xs font-bold text-[#1C1917]">
                      {item.durationMinutes} min
                    </span>
                  </div>

                  {/* Delete Item Action */}
                  <button
                    type="button"
                    onClick={() => handleDeleteLiturgyItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[#DC2626] hover:bg-[#FEE2E2] transition-all cursor-pointer"
                    title="Remove Service Element"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Create New Service */}
      {isCreatingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...dialogProps(() => setIsCreatingService(false), "Schedule New Worship Service")}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-lg w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-[8px] bg-[#C2410C]/10 text-[#C2410C]">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">church</span>
                </span>
                <h3 className="font-headline text-base font-bold text-[#1C1917]">Schedule New Worship Service</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingService(false)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateService} className="mt-4 space-y-4">
              <div>
                <label htmlFor="service-title" className="block text-xs font-bold text-[#1C1917] mb-1">Service Title *</label>
                <input id="service-title" aria-label="Service Title"
                  type="text"
                  required
                  placeholder="e.g. Lord’s Day Morning Worship & Holy Communion"
                  value={newServiceTitle}
                  onChange={(e) => setNewServiceTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="service-type" className="block text-xs font-bold text-[#1C1917] mb-1">Service Type</label>
                  <select id="service-type" aria-label="Service Type"
                    value={newServiceType}
                    onChange={(e) => setNewServiceType(e.target.value as ServiceType)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  >
                    <option value="sunday-morning">Sunday Morning</option>
                    <option value="sunday-evening">Sunday Evening</option>
                    <option value="midweek-service">Wednesday Midweek Service</option>
                    <option value="communion-special">Communion Feast</option>
                    <option value="youth-service">Youth Service</option>
                    <option value="festival">Festival / Holy Week</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="service-date" className="block text-xs font-bold text-[#1C1917] mb-1">Date</label>
                  <input id="service-date" aria-label="Date"
                    type="date"
                    value={newServiceDate}
                    onChange={(e) => setNewServiceDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="service-time-window" className="block text-xs font-bold text-[#1C1917] mb-1">Time Window</label>
                  <input id="service-time-window" aria-label="Time Window"
                    type="text"
                    placeholder={SUNDAY_WINDOW}
                    value={newServiceTime}
                    onChange={(e) => setNewServiceTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
                <div>
                  <label htmlFor="service-campus" className="block text-xs font-bold text-[#1C1917] mb-1">Campus / Hall</label>
                  <select id="service-campus" aria-label="Campus / Hall"
                    value={newServiceCampus}
                    onChange={(e) => setNewServiceCampus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  >
                    {LOCATIONS.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="service-theme" className="block text-xs font-bold text-[#1C1917] mb-1">Homily / Sermon Theme</label>
                  <input id="service-theme" aria-label="Homily / Sermon Theme"
                    type="text"
                    placeholder="e.g. The Righteous Shall Live by Faith"
                    value={newServiceTheme}
                    onChange={(e) => setNewServiceTheme(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
                <div>
                  <label htmlFor="service-scripture" className="block text-xs font-bold text-[#1C1917] mb-1">Scripture Text</label>
                  <input id="service-scripture" aria-label="Scripture Text"
                    type="text"
                    placeholder="e.g. Romans 1:16-17; Psalm 103"
                    value={newServiceScripture}
                    onChange={(e) => setNewServiceScripture(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="service-preacher" className="block text-xs font-bold text-[#1C1917] mb-1">Preacher / Minister</label>
                  <select id="service-preacher" aria-label="Preacher / Minister"
                    value={newServicePreacher}
                    onChange={(e) => setNewServicePreacher(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  >
                    <option value="Bishop Sammy">Bishop Sammy</option>
                    <option value="Rev. Alice">Rev. Alice (Co-Visionary Leader)</option>
                    <option value="Guest Preacher">Guest Preacher</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="service-worship-leader" className="block text-xs font-bold text-[#1C1917] mb-1">Worship Leader</label>
                  <select id="service-worship-leader" aria-label="Worship Leader"
                    value={newServiceWorshipLead}
                    onChange={(e) => setNewServiceWorshipLead(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  >
                    <option value="Caleb Timothy Mwangi">Caleb Timothy Mwangi</option>
                    <option value="Sarah Kamau">Sarah Kamau</option>
                    <option value="Maya Kamau">Maya Kamau</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsCreatingService(false)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Create Service & Generate Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Service Item */}
      {isAddingLiturgyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...dialogProps(() => setIsAddingLiturgyItem(false), "Add Service Element")}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-md w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Add Service Element</h3>
              <button
                type="button"
                onClick={() => setIsAddingLiturgyItem(false)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddLiturgyItem} className="mt-4 space-y-4">
              <div>
                <label htmlFor="liturgy-type" className="block text-xs font-bold text-[#1C1917] mb-1">Service Element Type</label>
                <select id="liturgy-type" aria-label="Service Element Type"
                  value={newLiturgyType}
                  onChange={(e) => setNewLiturgyType(e.target.value as LiturgyItem['type'])}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                >
                  <option value="worship-praise">Hymn / Praise Song</option>
                  <option value="scripture-reading">Scripture Reading</option>
                  <option value="pastoral-prayer">Pastoral Prayer / Collect</option>
                  <option value="call-to-worship">Call to Worship & Creed</option>
                  <option value="sermon">Expository Sermon</option>
                  <option value="communion">Holy Communion / Baptism & Communion</option>
                  <option value="tithes-offering">Tithes & Offering</option>
                  <option value="announcements">Announcements & Church Life</option>
                  <option value="benediction">Closing Prayer & Dismissal</option>
                  <option value="fellowship">Groups & Fellowship</option>
                  <option value="prelude">Opening Prayer / Meditation</option>
                </select>
              </div>

              <div>
                <label htmlFor="liturgy-title" className="block text-xs font-bold text-[#1C1917] mb-1">Title / Hymn Name *</label>
                <input id="liturgy-title" aria-label="Title / Hymn Name"
                  type="text"
                  required
                  placeholder="e.g. Hymn of Dedication: 'Be Thou My Vision'"
                  value={newLiturgyTitle}
                  onChange={(e) => setNewLiturgyTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="liturgy-duration" className="block text-xs font-bold text-[#1C1917] mb-1">Duration (Minutes)</label>
                  <input id="liturgy-duration" aria-label="Duration (Minutes)"
                    type="number"
                    min={1}
                    max={60}
                    value={newLiturgyDuration}
                    onChange={(e) => setNewLiturgyDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
                <div>
                  <label htmlFor="liturgy-leader" className="block text-xs font-bold text-[#1C1917] mb-1">Presiding Leader</label>
                  <input id="liturgy-leader" aria-label="Presiding Leader"
                    type="text"
                    value={newLiturgyLeader}
                    onChange={(e) => setNewLiturgyLeader(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="liturgy-scripture" className="block text-xs font-bold text-[#1C1917] mb-1">Scripture Reference (Optional)</label>
                <input id="liturgy-scripture" aria-label="Scripture Reference (Optional)"
                  type="text"
                  placeholder="e.g. 1 Peter 2:9-10"
                  value={newLiturgyScripture}
                  onChange={(e) => setNewLiturgyScripture(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div>
                <label htmlFor="liturgy-notes" className="block text-xs font-bold text-[#1C1917] mb-1">Notes / Instructions</label>
                <textarea id="liturgy-notes" aria-label="Notes / Instructions"
                  rows={2}
                  placeholder="e.g. Congregation stands; band transitions to acoustic chords"
                  value={newLiturgyNotes}
                  onChange={(e) => setNewLiturgyNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsAddingLiturgyItem(false)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Insert Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Printable Service Bulletin Preview */}
      {previewBulletinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...dialogProps(() => setPreviewBulletinModal(false), "Order of Divine Service")}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-2xl w-full p-8 shadow-2xl border border-[#E7E5E4] max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in duration-150 font-serif">
            <div className="flex items-center justify-between pb-4 border-b-2 border-[#1C1917]">
              <div>
                <span className="text-xs uppercase tracking-widest font-sans font-bold text-[#C2410C]">
                  Destiny Sanctuary Int'L Nyahururu
                </span>
                <h2 className="text-2xl font-bold text-[#1C1917] mt-0.5">Order of Divine Service</h2>
                <div className="text-xs font-sans text-[#57534E] mt-1">
                  {currentService.date} · {currentService.campus}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewBulletinModal(false)}
                className="font-sans text-[#57534E] hover:text-[#1C1917] p-1.5 rounded-md border border-[#E7E5E4]"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-6 space-y-4">
              <div className="text-center py-2 bg-[#F8F1E9] rounded-lg border border-[#E7E5E4] font-sans">
                <div className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                  Theme: "{currentService.theme}"
                </div>
                <div className="text-[11px] text-[#C2410C] font-semibold font-mono mt-0.5">
                  Scripture Lesson: {currentService.scriptureFocus}
                </div>
              </div>

              <div className="space-y-3 font-sans">
                {currentService.liturgyOrder.map((item) => (
                  <div key={item.id} className="flex items-baseline justify-between border-b border-[#E7E5E4]/60 pb-2">
                    <div>
                      <div className="font-bold text-sm text-[#1C1917]">{item.title}</div>
                      <div className="text-xs text-[#57534E] italic">
                        Leader: {item.leader} {item.scriptureRef && `(${item.scriptureRef})`}
                      </div>
                    </div>
                    <div className="text-xs text-[#A8A29E] font-mono">{item.durationMinutes} min</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E7E5E4] flex items-center justify-between font-sans">
              <div className="text-xs text-[#57534E]">
                Preacher: <span className="font-bold text-[#1C1917]">{currentService.preacher}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">print</span>
                  Print to PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
