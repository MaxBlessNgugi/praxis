import React, { useState } from 'react';
import {
  AttendanceRecord,
  FirstTimeVisitorLink,
  WorshipService,
  ParishMember,
} from '../../../../types';
import {
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_VISITOR_LINKS,
  INITIAL_SERVICES,
  INITIAL_CHURCH_MEMBERS,
} from '../../../../data/churchMockData';
import { CHURCH, DEFAULT_LOCATION, LOCATIONS } from '../../../../data/churchDomain';

/** The ministries a first-time visitor can ask about; the form defaults to the first. */
const INTERESTED_MINISTRIES = [
  'Young Couples & Choir',
  'Kids & Nursery Ministry',
  'Mercy & Outreach Services',
  'Theology / First Timer Catechism',
  'AV & Technical Team',
];

export const AttendancePanel: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE_RECORDS);
  const [visitors, setVisitors] = useState<FirstTimeVisitorLink[]>(INITIAL_VISITOR_LINKS);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(INITIAL_SERVICES[0].id);

  // Quick Attendance Entry Form
  const [sanctuaryCount, setSanctuaryCount] = useState<number>(280);
  const [onlineStreams, setOnlineStreams] = useState<number>(65);
  const [kidsNursery, setKidsNursery] = useState<number>(42);
  const [firstTimeCount, setFirstTimeCount] = useState<number>(12);
  const [notes, setNotes] = useState<string>('');
  const [campusSelect, setCampusSelect] = useState<string>(DEFAULT_LOCATION);
  const [loggedAlert, setLoggedAlert] = useState<boolean>(false);

  // Visitor Intake Form / Link to Member modal
  const [isAddingVisitor, setIsAddingVisitor] = useState<boolean>(false);
  const [visitorName, setVisitorName] = useState<string>('');
  const [visitorPhone, setVisitorPhone] = useState<string>('');
  const [visitorEmail, setVisitorEmail] = useState<string>('');
  const [visitorMinistry, setVisitorMinistry] = useState<string>(INTERESTED_MINISTRIES[0]);
  const [visitorPastor, setVisitorPastor] = useState<string>(CHURCH.visionaryLeader);

  // Link to Existing Member Modal
  const [linkingVisitor, setLinkingVisitor] = useState<FirstTimeVisitorLink | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(INITIAL_CHURCH_MEMBERS[0].id);

  const selectedService = INITIAL_SERVICES.find((s) => s.id === selectedServiceId) || INITIAL_SERVICES[0];

  // Quick logging of attendance
  const handleLogAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(sanctuaryCount) + Number(onlineStreams) + Number(kidsNursery);

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      serviceId: selectedService.id,
      serviceTitle: selectedService.title,
      date: selectedService.date,
      campus: campusSelect,
      sanctuaryHeadcount: Number(sanctuaryCount),
      onlineStreams: Number(onlineStreams),
      kidsNurseryCount: Number(kidsNursery),
      firstTimeVisitors: Number(firstTimeCount),
      totalAttendance: total,
      notes: notes || 'Headcount recorded by diaconal stewards.',
      loggedBy: 'Chief Usher & Census Steward',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAttendanceRecords([newRecord, ...attendanceRecords]);
    setLoggedAlert(true);
    setTimeout(() => setLoggedAlert(false), 4000);
    setNotes('');
  };

  const handleCreateVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return;

    const newVis: FirstTimeVisitorLink = {
      id: `vis-${Date.now()}`,
      visitorName,
      serviceDate: selectedService.date,
      phone: visitorPhone || '+254 750 000 000',
      email: visitorEmail || 'visitor@example.org',
      interestedMinistry: visitorMinistry,
      assignedFollowUpPastor: visitorPastor,
      status: 'new-intake',
      householdLinked: false,
    };

    setVisitors([newVis, ...visitors]);
    setIsAddingVisitor(false);
    setVisitorName('');
    setVisitorPhone('');
    setVisitorEmail('');
  };

  const handleUpdateVisitorStatus = (id: string, status: FirstTimeVisitorLink['status']) => {
    setVisitors(visitors.map((v) => (v.id === id ? { ...v, status } : v)));
  };

  const handleLinkToMember = () => {
    if (!linkingVisitor) return;
    setVisitors(
      visitors.map((v) =>
        v.id === linkingVisitor.id
          ? { ...v, householdLinked: true, status: 'regular-attender' }
          : v
      )
    );
    setLinkingVisitor(null);
  };

  // Historical trend data for recharts
  const trendData = [...attendanceRecords]
    .reverse()
    .map((record) => ({
      date: record.date.replace(', 2026', ''),
      Sanctuary: record.sanctuaryHeadcount,
      Online: record.onlineStreams,
      Kids: record.kidsNurseryCount,
      Visitors: record.firstTimeVisitors,
      Total: record.totalAttendance,
    }));

  const latestRecord = attendanceRecords[0];

  return (
    <div className="flex flex-col space-y-6">
      {/* Attendance KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Latest Sanctuary Census</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">{latestRecord.totalAttendance} Total</div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">trending_up</span>
              +7.4% vs. monthly average
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">groups</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">First-Time Guests</span>
            <div className="text-2xl font-black text-[#C2410C] mt-0.5">{latestRecord.firstTimeVisitors} Recorded</div>
            <span className="text-xs text-[#57534E] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">person_pin_circle</span>
              {visitors.filter((v) => v.status === 'new-intake').length} awaiting intake contact
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#D97706]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">person_add</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Online / Broadcast Streams</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">{latestRecord.onlineStreams} Concurr.</div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">sensors</span>
              100% Stream Uptime
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#2563EB]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">podcasts</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Children & Nursery</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">{latestRecord.kidsNurseryCount} Enrolled</div>
            <span className="text-xs text-[#57534E] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">child_care</span>
              Full volunteer coverage
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#059669]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">family_restroom</span>
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Quick Entry Form & Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Quick Entry Form for Selected Service */}
        <div className="lg:col-span-5 bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4] mb-4">
            <div>
              <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">how_to_reg</span>
                Record Service Headcount
              </h3>
              <p className="text-xs text-[#57534E] mt-0.5">
                Input live census data taken by diaconal marshals.
              </p>
            </div>
          </div>

          {loggedAlert && (
            <div className="mb-4 p-3 rounded-[10px] bg-[#059669]/10 border border-[#059669]/30 text-[#059669] text-xs font-bold flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">check_circle</span>
              Headcount record successfully sealed in the church register!
            </div>
          )}

          <form onSubmit={handleLogAttendance} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Target Service</label>
              <select aria-label="Target Service"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-medium"
              >
                {INITIAL_SERVICES.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.title} ({srv.date})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Sanctuary Headcount *</label>
                <input aria-label="Sanctuary Headcount"
                  type="number"
                  min={0}
                  required
                  value={sanctuaryCount}
                  onChange={(e) => setSanctuaryCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Online Streams</label>
                <input aria-label="Online Streams"
                  type="number"
                  min={0}
                  value={onlineStreams}
                  onChange={(e) => setOnlineStreams(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Kids & Nursery</label>
                <input aria-label="Kids &amp; Nursery"
                  type="number"
                  min={0}
                  value={kidsNursery}
                  onChange={(e) => setKidsNursery(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">First-Time Visitors</label>
                <input aria-label="First-Time Visitors"
                  type="number"
                  min={0}
                  value={firstTimeCount}
                  onChange={(e) => setFirstTimeCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono font-bold text-[#C2410C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Campus Location</label>
              <select aria-label="Campus Location"
                value={campusSelect}
                onChange={(e) => setCampusSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              >
                {LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Field Observations / Notes</label>
              <textarea aria-label="Field Observations / Notes"
                rows={2}
                placeholder="e.g. Overflow seating used at the main entrance; extra seats dispatched."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">save</span>
                Commit Headcount to Official Register
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (7 cols): Attendance History Trend Chart & Breakdown */}
        <div className="lg:col-span-7 bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4] mb-4">
              <div>
                <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">analytics</span>
                  Historical Attendance Trends
                </h3>
                <p className="text-xs text-[#57534E] mt-0.5">
                  Sanctuary in-person attendance, online viewers, and visitor counts.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded bg-[#F8F1E9] text-[#57534E] border border-[#E7E5E4]">
                Past 5 Lord's Days
              </span>
            </div>

            {/* Custom Interactive SVG Area Chart */}
            <div className="h-64 w-full pt-2 flex flex-col justify-between">
              <div className="flex items-center justify-end gap-4 text-xs mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#C2410C]" />
                  <span className="text-[#1C1917] font-semibold text-[11px]">Total Attendance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#059669]" />
                  <span className="text-[#1C1917] font-semibold text-[11px]">Sanctuary In-Person</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#2563EB]" />
                  <span className="text-[#1C1917] font-semibold text-[11px]">Online Streamers</span>
                </div>
              </div>

              <div className="relative w-full h-48">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C2410C" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#C2410C" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="sanctuaryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line x1="0" y1="20" x2="500" y2="20" stroke="#F5EDE4" strokeDasharray="3 3" />
                  <line x1="0" y1="60" x2="500" y2="60" stroke="#F5EDE4" strokeDasharray="3 3" />
                  <line x1="0" y1="100" x2="500" y2="100" stroke="#F5EDE4" strokeDasharray="3 3" />
                  <line x1="0" y1="140" x2="500" y2="140" stroke="#E7E5E4" />

                  {/* Total Attendance Area & Line */}
                  <polygon
                    points="30,140 30,35 135,42 245,28 355,38 465,30 465,140"
                    fill="url(#totalGrad)"
                  />
                  <polyline
                    points="30,35 135,42 245,28 355,38 465,30"
                    fill="none"
                    stroke="#C2410C"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Sanctuary In-Person Area & Line */}
                  <polygon
                    points="30,140 30,65 135,70 245,58 355,68 465,60 465,140"
                    fill="url(#sanctuaryGrad)"
                  />
                  <polyline
                    points="30,65 135,70 245,58 355,68 465,60"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Online Streams Line */}
                  <polyline
                    points="30,118 135,115 245,110 355,112 465,114"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                  />

                  {/* Circles & Labels on Points */}
                  {[
                    { x: 30, date: 'Aug 16', total: 345, sanc: 250 },
                    { x: 135, date: 'Aug 23', total: 338, sanc: 242 },
                    { x: 245, date: 'Aug 30', total: 362, sanc: 268 },
                    { x: 355, date: 'Sep 06', total: 350, sanc: 255 },
                    { x: 465, date: 'Sep 13', total: 387, sanc: 280 },
                  ].map((pt, i) => (
                    <g key={i}>
                      <circle cx={pt.x} cy={i === 2 ? 28 : i === 4 ? 30 : 38} r="4.5" fill="#C2410C" stroke="#FFFFFF" strokeWidth="2" />
                      <circle cx={pt.x} cy={i === 2 ? 58 : i === 4 ? 60 : 68} r="4" fill="#059669" stroke="#FFFFFF" strokeWidth="2" />
                      <text x={pt.x} y="155" textAnchor="middle" fontSize="10" fill="#78716C" fontWeight="bold">
                        {pt.date}
                      </text>
                      <text x={pt.x} y={i === 2 ? 20 : i === 4 ? 22 : 30} textAnchor="middle" fontSize="9" fill="#1C1917" fontWeight="bold">
                        {pt.total}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid under chart */}
          <div className="grid grid-cols-3 gap-3 pt-4 mt-2 border-t border-[#E7E5E4]">
            <div className="p-2.5 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] text-center">
              <div className="text-[10px] font-bold text-[#A8A29E] uppercase">5-Week Avg Total</div>
              <div className="font-headline text-base font-extrabold text-[#1C1917] mt-0.5">374 / Wk</div>
            </div>
            <div className="p-2.5 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] text-center">
              <div className="text-[10px] font-bold text-[#A8A29E] uppercase">Avg In-Person</div>
              <div className="font-headline text-base font-extrabold text-[#059669] mt-0.5">270 (72%)</div>
            </div>
            <div className="p-2.5 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] text-center">
              <div className="text-[10px] font-bold text-[#A8A29E] uppercase">Avg New Visitors</div>
              <div className="font-headline text-base font-extrabold text-[#C2410C] mt-0.5">9.6 Guests</div>
            </div>
          </div>
        </div>
      </div>

      {/* First-Time Visitors Intake & Link to Members Roll */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4] mb-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">person_pin_circle</span>
              First-Time Visitors & First Timer Integration
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Track new visitor cards, pastoral follow-up assignments, and link new guests to Church Member directories.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingVisitor(true)}
            className="px-3 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_circle</span>
            Intake New Visitor
          </button>
        </div>

        {/* Visitors Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F8F1E9] text-[#57534E] font-bold text-[11px] uppercase tracking-wider border-b border-[#E7E5E4]">
                <th className="py-3 px-3 rounded-l-[8px]">Visitor Name</th>
                <th className="py-3 px-3">First Visited</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Ministry Interest</th>
                <th className="py-3 px-3">Assigned Shepherd</th>
                <th className="py-3 px-3">Integration Status</th>
                <th className="py-3 px-3 rounded-r-[8px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]/80">
              {visitors.map((visitor) => (
                <tr key={visitor.id} className="hover:bg-[#FDF8F3] transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-[#1C1917] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#C2410C]/10 text-[#C2410C] font-bold text-[11px] flex items-center justify-center shrink-0">
                        {visitor.visitorName.split(' ')[0][0]}
                      </div>
                      <div>
                        <div>{visitor.visitorName}</div>
                        {visitor.householdLinked && (
                          <span className="text-[10px] text-[#059669] font-bold flex items-center gap-0.5">
                            <span aria-hidden="true" className="material-symbols-outlined text-[12px]">link</span>
                            Linked to Members Register
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[#57534E]">{visitor.serviceDate}</td>
                  <td className="py-3 px-3">
                    <div className="text-[#1C1917]">{visitor.phone}</div>
                    <div className="text-[11px] text-[#A8A29E]">{visitor.email}</div>
                  </td>
                  <td className="py-3 px-3 font-medium text-[#1C1917]">{visitor.interestedMinistry}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#F8F1E9] text-[#57534E] font-medium text-[11px]">
                      {visitor.assignedFollowUpPastor}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <select aria-label="Visitor follow-up status"
                      value={visitor.status}
                      onChange={(e) =>
                        handleUpdateVisitorStatus(visitor.id, e.target.value as any)
                      }
                      className={`text-[11px] font-bold px-2 py-1 rounded-[6px] border ${
                        visitor.status === 'new-intake'
                          ? 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30'
                          : visitor.status === 'contacted'
                          ? 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30'
                          : visitor.status === 'first-timer-enrolled'
                          ? 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30'
                          : 'bg-[#059669]/10 text-[#059669] border-[#059669]/30'
                      }`}
                    >
                      <option value="new-intake">New Intake</option>
                      <option value="contacted">Pastor Contacted</option>
                      <option value="first-timer-enrolled">First Timer Cohort</option>
                      <option value="regular-attender">Regular Attender</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {!visitor.householdLinked ? (
                      <button
                        type="button"
                        onClick={() => setLinkingVisitor(visitor)}
                        className="px-2.5 py-1 rounded-[6px] bg-[#F8F1E9] hover:bg-[#C2410C] hover:text-white text-[#C2410C] text-[11px] font-bold border border-[#E7E5E4] transition-all cursor-pointer"
                      >
                        Link to Member
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#059669] font-bold">Enrolled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Intake New Visitor */}
      {isAddingVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-md w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Register New Guest / Visitor</h3>
              <button
                type="button"
                onClick={() => setIsAddingVisitor(false)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateVisitor} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Full Name *</label>
                <input aria-label="Full Name"
                  type="text"
                  required
                  placeholder="e.g. Jonathan & Lisa Miller"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Phone Number</label>
                  <input aria-label="Phone Number"
                    type="tel"
                    placeholder="+254 750 000 000"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Email Address</label>
                  <input aria-label="Email Address"
                    type="email"
                    placeholder="guest@domain.com"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Ministry Interest</label>
                <select aria-label="Ministry Interest"
                  value={visitorMinistry}
                  onChange={(e) => setVisitorMinistry(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                >
                  {INTERESTED_MINISTRIES.map((ministry) => (
                    <option key={ministry} value={ministry}>
                      {ministry}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Assigned Follow-Up Shepherd</label>
                <select aria-label="Assigned Follow-Up Shepherd"
                  value={visitorPastor}
                  onChange={(e) => setVisitorPastor(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                >
                  <option value="Bishop Sammy">Bishop Sammy</option>
                  <option value="Bishop Sammy">Bishop Sammy (Visionary Leader)</option>
                  <option value="Clara Oswald">Clara Oswald (Deaconess of Welcome)</option>
                  <option value="Marcus Jenkins">Marcus Jenkins (Elder)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsAddingVisitor(false)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Save Visitor Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Link Visitor to Member / Household */}
      {linkingVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-md w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">
                Link Guest to Members Register
              </h3>
              <button
                type="button"
                onClick={() => setLinkingVisitor(null)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4]">
                <div className="text-xs text-[#A8A29E] font-bold uppercase">Guest Record</div>
                <div className="font-headline text-sm font-bold text-[#1C1917] mt-0.5">
                  {linkingVisitor.visitorName}
                </div>
                <div className="text-xs text-[#57534E]">{linkingVisitor.email} · {linkingVisitor.phone}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Select Church Member / Household to Associate</label>
                <select aria-label="Select Church Member / Household to Associate"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                >
                  {INITIAL_CHURCH_MEMBERS.map((mbr) => (
                    <option key={mbr.id} value={mbr.id}>
                      {mbr.name} ({mbr.memberId}) — {mbr.householdRole}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setLinkingVisitor(null)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLinkToMember}
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Confirm Link & Enroll
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
