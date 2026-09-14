import { useDialog } from '../../dialog';
import React, { useState } from 'react';
import {
  VolunteerRosterDuty,
  SwapRequest,
  WorshipService,
  ParishMember,
} from '../../../../types';
import {
  INITIAL_VOLUNTEER_ROSTER,
  INITIAL_SWAP_REQUESTS,
  INITIAL_SERVICES,
} from '../../../../data/churchMockData';
import { useDemoData } from '../../../../data/demoStore';

export const VolunteerRosterPanel: React.FC = () => {
  const [duties, setDuties] = useState<VolunteerRosterDuty[]>(INITIAL_VOLUNTEER_ROSTER);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>(INITIAL_SWAP_REQUESTS);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(INITIAL_SERVICES[0].id);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Assign Volunteer Modal
  const [isAssigningDuty, setIsAssigningDuty] = useState<boolean>(false);
  const assigningDutyDialog = useDialog(() => setIsAssigningDuty(false), "Assign Volunteer to Service");
  const [targetDept, setTargetDept] = useState<VolunteerRosterDuty['department']>('ushers');
  const [roleTitle, setRoleTitle] = useState<string>('');
  const { members } = useDemoData();
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id ?? '');
  const [callTime, setCallTime] = useState<string>('09:45 AM');
  const [dutyNotes, setDutyNotes] = useState<string>('');

  // Request Swap Modal
  const [swappingDuty, setSwappingDuty] = useState<VolunteerRosterDuty | null>(null);
  const swappingDutyDialog = useDialog(() => setSwappingDuty(null), "Request Duty Replacement");
  const [replacementName, setReplacementName] = useState<string>('');
  const [swapReason, setSwapReason] = useState<string>('');

  const currentService = INITIAL_SERVICES.find((s) => s.id === selectedServiceId) || INITIAL_SERVICES[0];

  const filteredDuties = duties.filter((duty) => {
    if (selectedDepartment !== 'all' && duty.department !== selectedDepartment) return false;
    return true;
  });

  const handleUpdateStatus = (dutyId: string, newStatus: VolunteerRosterDuty['status']) => {
    setDuties(duties.map((d) => (d.id === dutyId ? { ...d, status: newStatus } : d)));
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTitle.trim()) return;

    const chosenMember = members.find((m) => m.id === selectedMemberId) || members[0];
    if (!chosenMember) return;

    const newDuty: VolunteerRosterDuty = {
      id: `vol-${Date.now()}`,
      serviceId: currentService.id,
      serviceDate: `${currentService.date} (${currentService.time.split('–')[0].trim()})`,
      serviceTitle: currentService.title,
      department: targetDept,
      roleName: roleTitle,
      assignedMemberId: chosenMember.id,
      assignedMemberName: chosenMember.name,
      callTime,
      status: 'pending',
      phone: chosenMember.phone,
      email: chosenMember.email,
      notes: dutyNotes,
    };

    setDuties([...duties, newDuty]);
    setIsAssigningDuty(false);
    setRoleTitle('');
    setDutyNotes('');
  };

  const handleSubmitSwapRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swappingDuty || !replacementName.trim()) return;

    const newSwap: SwapRequest = {
      id: `swap-${Date.now()}`,
      dutyId: swappingDuty.id,
      serviceDate: swappingDuty.serviceDate,
      roleName: swappingDuty.roleName,
      requestingVolunteer: swappingDuty.assignedMemberName,
      replacementVolunteer: replacementName,
      reason: swapReason || 'Schedule conflict.',
      status: 'pending-approval',
      requestDate: new Date().toISOString().split('T')[0],
    };

    // update the duty status to replacement
    setDuties(
      duties.map((d) => (d.id === swappingDuty.id ? { ...d, status: 'replacement' } : d))
    );

    setSwapRequests([newSwap, ...swapRequests]);
    setSwappingDuty(null);
    setReplacementName('');
    setSwapReason('');
  };

  const handleApproveSwap = (swapId: string, dutyId: string, replacementName: string) => {
    setSwapRequests(
      swapRequests.map((s) => (s.id === swapId ? { ...s, status: 'approved' } : s))
    );
    setDuties(
      duties.map((d) =>
        d.id === dutyId
          ? {
              ...d,
              assignedMemberName: replacementName,
              status: 'confirmed',
              notes: `Substituted via swap workflow approved by ministry director.`,
            }
          : d
      )
    );
  };

  const confirmedCount = duties.filter((d) => d.status === 'confirmed').length;
  const pendingCount = duties.filter((d) => d.status === 'pending').length;
  const replacementCount = duties.filter((d) => d.status === 'replacement' || d.status === 'swapped').length;

  return (
    <div className="flex flex-col space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Total Roster Slots</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">{duties.length} Assigned</div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">event_available</span>
              Across 7 service teams
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">assignment_ind</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Confirmed & Ready</span>
            <div className="text-2xl font-black text-[#059669] mt-0.5">{confirmedCount} Volunteers</div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">verified</span>
              {Math.round((confirmedCount / (duties.length || 1)) * 100)}% coverage confirmed
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#059669]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">check_circle</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Awaiting RSVP</span>
            <div className="text-2xl font-black text-[#D97706] mt-0.5">{pendingCount} Pending</div>
            <span className="text-xs text-[#57534E] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">sms</span>
              SMS automated reminders active
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#D97706]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">schedule</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Swap / Replacements</span>
            <div className="text-2xl font-black text-[#C2410C] mt-0.5">{replacementCount} Requests</div>
            <span className="text-xs text-[#DC2626] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">swap_horiz</span>
              {swapRequests.filter((s) => s.status === 'pending-approval').length} awaiting approval
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#DC2626]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">swap_horiz</span>
          </div>
        </div>
      </div>

      {/* Main Roster Table & Swap Workflow Section */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        {/* Header & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E7E5E4] mb-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">badge</span>
              Service Duty Roster & Ministry Allocation
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Service: <span className="font-bold text-[#1C1917]">{currentService.title}</span> ({currentService.date})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Department filter"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-medium"
            >
              <option value="all">All Departments (7)</option>
              <option value="ushers">Ushers & Collectors</option>
              <option value="greeters">Greeters & Welcome</option>
              <option value="kids">Kids & Nursery</option>
              <option value="media-sound">Media & AV Broadcast</option>
              <option value="worship-band">Worship Choir & Band</option>
              <option value="hospitality">Hospitality & Refreshments</option>
              <option value="parking">Parking & Mobility</option>
            </select>

            <button
              type="button"
              onClick={() => setIsAssigningDuty(true)}
              className="px-3 py-1.5 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">person_add</span>
              Assign Volunteer
            </button>
          </div>
        </div>

        {/* Table of Roster Duties */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F8F1E9] text-[#57534E] font-bold text-[11px] uppercase tracking-wider border-b border-[#E7E5E4]">
                <th className="py-3 px-3 rounded-l-[8px]">Department & Role</th>
                <th className="py-3 px-3">Assigned Volunteer</th>
                <th className="py-3 px-3">Call Time</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-3 rounded-r-[8px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]/80">
              {filteredDuties.map((duty) => (
                <tr key={duty.id} className="hover:bg-[#FDF8F3] transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-[#1C1917]">{duty.roleName}</div>
                    <span className="inline-block mt-0.5 px-2 py-0.2 rounded-md bg-[#E7E5E4]/60 text-[#57534E] text-[10px] font-bold uppercase tracking-wider">
                      {duty.department}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-[#1C1917] flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#C2410C]/10 text-[#C2410C] font-bold text-[10px] flex items-center justify-center">
                        {duty.assignedMemberName.split(' ')[0][0]}
                      </div>
                      {duty.assignedMemberName}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[#1C1917]">{duty.callTime}</td>
                  <td className="py-3 px-3">
                    <div className="text-[#1C1917] font-medium">{duty.phone}</div>
                    <div className="text-[11px] text-[#A8A29E]">{duty.email}</div>
                  </td>
                  <td className="py-3 px-3">
                    <select aria-label="Duty status"
                      value={duty.status}
                      onChange={(e) => handleUpdateStatus(duty.id, e.target.value as any)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-[6px] border ${
                        duty.status === 'confirmed'
                          ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/30'
                          : duty.status === 'pending'
                          ? 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30'
                          : 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30'
                      }`}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="replacement">Substitute Needed</option>
                      <option value="swapped">Swapped</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 text-[#57534E] max-w-[200px] truncate">
                    {duty.notes || '—'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSwappingDuty(duty)}
                      className="px-2.5 py-1 rounded-[6px] bg-[#F8F1E9] hover:bg-[#C2410C] hover:text-white text-[#C2410C] text-[11px] font-bold border border-[#E7E5E4] transition-all cursor-pointer"
                      title="Request Swap or Substitute"
                    >
                      Swap
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Volunteer Swap Requests Queue */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4] mb-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">swap_horiz</span>
              Substitute & Roster Swap Queue
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Review volunteer replacement proposals submitted by team members.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#F8F1E9] text-xs font-bold text-[#57534E] border border-[#E7E5E4]">
            {swapRequests.length} Total Requests
          </span>
        </div>

        <div className="space-y-3">
          {swapRequests.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-[12px] bg-[#FDF8F3] border border-[#E7E5E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#1C1917]">{req.roleName}</span>
                  <span className="text-[11px] font-mono text-[#A8A29E]">({req.serviceDate})</span>
                  <span
                    className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      req.status === 'approved'
                        ? 'bg-[#059669]/10 text-[#059669]'
                        : req.status === 'pending-approval'
                        ? 'bg-[#D97706]/10 text-[#D97706]'
                        : 'bg-[#DC2626]/10 text-[#DC2626]'
                    }`}
                  >
                    {req.status.replace('-', ' ')}
                  </span>
                </div>
                <div className="text-xs text-[#57534E] flex items-center gap-2">
                  <span>Scheduled: <strong className="text-[#1C1917]">{req.requestingVolunteer}</strong></span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-[#C2410C]">arrow_forward</span>
                  <span>Substitute: <strong className="text-[#059669]">{req.replacementVolunteer}</strong></span>
                </div>
                <div className="text-[11px] text-[#A8A29E] italic">Reason: "{req.reason}"</div>
              </div>

              {req.status === 'pending-approval' && (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleApproveSwap(req.id, req.dutyId, req.replacementVolunteer)}
                    className="px-3 py-1.5 rounded-[8px] bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check</span>
                    Approve Swap
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSwapRequests(
                        swapRequests.map((s) => (s.id === req.id ? { ...s, status: 'rejected' } : s))
                      )
                    }
                    className="px-3 py-1.5 rounded-[8px] bg-[#F8F1E9] hover:bg-[#FEE2E2] hover:text-[#DC2626] text-[#57534E] text-xs font-bold border border-[#E7E5E4] transition-all cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: Assign Volunteer Duty */}
      {isAssigningDuty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...assigningDutyDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-md w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Assign Volunteer to Service</h3>
              <button
                type="button"
                onClick={() => setIsAssigningDuty(false)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="mt-4 space-y-4">
              <div>
                <label htmlFor="roster-department" className="block text-xs font-bold text-[#1C1917] mb-1">Ministry Department</label>
                <select id="roster-department" aria-label="Ministry Department"
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                >
                  <option value="ushers">Ushers & Collectors</option>
                  <option value="greeters">Greeters & Welcome</option>
                  <option value="kids">Kids & Nursery</option>
                  <option value="media-sound">Media & Sound AV</option>
                  <option value="worship-band">Worship Band & Choir</option>
                  <option value="hospitality">Hospitality & Coffee</option>
                  <option value="parking">Parking & Mobility Guide</option>
                </select>
              </div>

              <div>
                <label htmlFor="roster-role-title" className="block text-xs font-bold text-[#1C1917] mb-1">Role Title *</label>
                <input id="roster-role-title" aria-label="Role Title"
                  type="text"
                  required
                  placeholder="e.g. Aisle 2 Collection Steward"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div>
                <label htmlFor="roster-volunteer" className="block text-xs font-bold text-[#1C1917] mb-1">Select Volunteer (Member Roll)</label>
                <select id="roster-volunteer" aria-label="Select Volunteer (Member Roll)"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                >
                  {members.map((mbr) => (
                    <option key={mbr.id} value={mbr.id}>
                      {mbr.name} ({mbr.memberId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="roster-call-time" className="block text-xs font-bold text-[#1C1917] mb-1">Call Time</label>
                <input id="roster-call-time" aria-label="Call Time"
                  type="text"
                  placeholder="09:45 AM"
                  value={callTime}
                  onChange={(e) => setCallTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div>
                <label htmlFor="roster-duty-notes" className="block text-xs font-bold text-[#1C1917] mb-1">Duty Notes / Special Instructions</label>
                <textarea id="roster-duty-notes" aria-label="Duty Notes / Special Instructions"
                  rows={2}
                  placeholder="e.g. Please pick up badge at Welcome Kiosk by 09:30 AM"
                  value={dutyNotes}
                  onChange={(e) => setDutyNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsAssigningDuty(false)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Assign to Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Request Swap */}
      {swappingDuty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...swappingDutyDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-md w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Request Duty Replacement</h3>
              <button
                type="button"
                onClick={() => setSwappingDuty(null)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitSwapRequest} className="mt-4 space-y-4">
              <div className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4]">
                <div className="text-[10px] font-bold text-[#A8A29E] uppercase">Scheduled Role</div>
                <div className="font-headline text-sm font-bold text-[#1C1917] mt-0.5">
                  {swappingDuty.roleName}
                </div>
                <div className="text-xs text-[#57534E]">
                  Current Volunteer: <strong>{swappingDuty.assignedMemberName}</strong> · {swappingDuty.callTime}
                </div>
              </div>

              <div>
                <label htmlFor="swap-replacement" className="block text-xs font-bold text-[#1C1917] mb-1">Proposed Replacement Volunteer *</label>
                <input id="swap-replacement" aria-label="Proposed Replacement Volunteer"
                  type="text"
                  required
                  placeholder="e.g. Elena Mwangi"
                  value={replacementName}
                  onChange={(e) => setReplacementName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div>
                <label htmlFor="swap-reason" className="block text-xs font-bold text-[#1C1917] mb-1">Reason for Swap</label>
                <textarea id="swap-reason" aria-label="Reason for Swap"
                  rows={2}
                  placeholder="e.g. Family travel / rehearsal overlap"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setSwappingDuty(null)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Submit Swap Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
