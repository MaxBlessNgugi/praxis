import { dialogProps } from '../dialog';
import React, { useState } from 'react'
;

type ResolutionStage = 'Proposed' | 'Voted & Approved' | 'Implementing' | 'Closed';

interface Resolution {
  id: string;
  idClass: string;
  title: string;
  sponsor: string;
  sponsorOfficer: string;
  councilDate: string;
  vote: { text: string; tone: 'credited' | 'muted' };
  stage: ResolutionStage;
  stageNote: string;
  stageNoteClass?: string;
  lead: string;
  leadNote: string;
  rowClass?: string;
  action: { label: string; className: string; toast: string };
  moreToast: string;
}

const STAGE_STYLES: Record<ResolutionStage, { chip: string; glyph?: string; ping?: boolean }> = {
  Proposed: { chip: 'text-[#59413a] bg-[#eee7e3]', glyph: 'schedule' },
  'Voted & Approved': { chip: 'text-[#006243] bg-[#85f8c4]/60', glyph: 'done_all' },
  Implementing: { chip: 'text-[#9b2f00] bg-[#ffdbd0]/50', ping: true },
  Closed: { chip: 'text-[#59413a] bg-[#eee7e3]', glyph: 'archive' },
};

const ALL_SPONSORS = 'All Sponsors & Boards';
const ALL_STAGES = 'All Stages';

const RESOLUTIONS: Resolution[] = [
  {
    id: 'RES-2025-042',
    idClass: 'text-[#9b2f00]',
    title: 'Sanctuary HVAC & Acoustic Tech Contract',
    sponsor: 'Trustee Board',
    sponsorOfficer: 'Arthur Wanjala',
    councilDate: 'Feb 06, 2025',
    vote: { text: '13 Yea • 0 Nay', tone: 'credited' },
    stage: 'Implementing',
    stageNote: '2 of 4 Milestones',
    lead: 'Elder Marcus Kamau',
    leadNote: 'Due Dec 31, 2025',
    action: {
      label: 'Track',
      className: 'bg-[#ffdbd0]/40 text-[#9b2f00] hover:bg-[#ffdbd0] text-xs font-bold',
      toast: 'Opening milestone tracker for HVAC Contract (Phase 2 underway)...',
    },
    moreToast: 'Options: Assign Trustee Deputy, Export Docket Extract.',
  },
  {
    id: 'RES-2025-043',
    idClass: 'text-[#9b2f00]',
    title: '2025 General Church Operating Budget',
    sponsor: 'Finance Committee',
    sponsorOfficer: 'Clara Wambui',
    councilDate: 'Feb 06, 2025',
    vote: { text: '12 Yea • 1 Abstain', tone: 'credited' },
    stage: 'Voted & Approved',
    stageNote: 'Awaiting Council',
    lead: 'Bishop Sammy',
    leadNote: 'Enactment Jan 01, 2025',
    rowClass: 'bg-[#faf2ee]/30',
    action: {
      label: 'Signatures',
      className: 'bg-[#eee7e3] text-[#1e1b19] hover:bg-[#e9e1dd] text-xs font-semibold',
      toast: 'Reviewing 12 Elder voting signatures and certification stamp.',
    },
    moreToast: 'Options: Forward to Church Council, Generate Ledger Projection.',
  },
  {
    id: 'RES-2025-045',
    idClass: 'text-[#904d00]',
    title: 'Youth Ministry Bus Fleet Replacement Grant',
    sponsor: 'Destiny Youth',
    sponsorOfficer: 'Bishop Sammy',
    councilDate: 'Feb 13, 2025',
    vote: { text: 'Pending Feb 27', tone: 'muted' },
    stage: 'Proposed',
    stageNote: '14-Day Elder Review',
    lead: 'Bishop Sammy',
    leadNote: 'Conclave Target Feb 27',
    action: {
      label: 'Review Draft',
      className: 'bg-[#ffdcc3]/50 text-[#904d00] hover:bg-[#ffdcc3] text-xs font-bold',
      toast: 'Opening draft text for Bus Fleet Replacement Grant...',
    },
    moreToast: 'Options: Add Elder Sponsor, Attach Mechanic Estimate.',
  },
  {
    id: 'RES-2025-039',
    idClass: 'text-[#8d7168]',
    title: 'Benevolence Fund Operating Cap to KSh 50,000',
    sponsor: 'Missions, Mercy & Church Planting',
    sponsorOfficer: 'Clara Wambui',
    councilDate: 'Jan 15, 2025',
    vote: { text: '14 Yea • 0 Nay', tone: 'credited' },
    stage: 'Closed',
    stageNote: 'Fully Audited',
    stageNoteClass: 'text-[#006243] font-bold',
    lead: 'Clara Wambui',
    leadNote: 'Completed Jan 30, 2025',
    rowClass: 'bg-[#faf2ee]/30',
    action: {
      label: 'Archive Dossier',
      className: 'bg-[#eee7e3] text-[#1e1b19] hover:bg-[#e9e1dd] text-xs font-semibold',
      toast: 'Opening Archived Dossier for Benevolence Fund cap adjustment...',
    },
    moreToast: 'Options: Print Official Excerpt, Verify Auditor Signature.',
  },
];

export const GovernanceView: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [meetingFilter, setMeetingFilter] = useState<'all' | 'stated' | 'executive' | 'emergency'>('all');
  const [searchMeeting, setSearchMeeting] = useState('');
  const [selectedDay, setSelectedDay] = useState<number>(27);

  // Legislative tracker filter
  const [searchResolution, setSearchResolution] = useState('');
  const [selectedSponsor, setSelectedSponsor] = useState(ALL_SPONSORS);
  const [selectedStage, setSelectedStage] = useState(ALL_STAGES);

  // Policy category filter
  const [policyCategory, setPolicyCategory] = useState<'all' | 'constitution' | 'hr' | 'cpp' | 'financial'>('all');
  const [searchPolicy, setSearchPolicy] = useState('');

  // Modals
  const [newResolutionModal, setNewResolutionModal] = useState(false);
  const [resolutionTitle, setResolutionTitle] = useState('');
  const [resolutionSponsor, setResolutionSponsor] = useState('Trustee Board');
  const [resolutionSummary, setResolutionSummary] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleCreateResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionTitle) return;
    showToast(`Draft bill "${resolutionTitle}" submitted to Elder Council docket.`);
    setNewResolutionModal(false);
    setResolutionTitle('');
    setResolutionSummary('');
  };

  const filteredResolutions = RESOLUTIONS.filter((resolution) => {
    const needle = searchResolution.trim().toLowerCase();
    const matchesSearch =
      needle === '' ||
      [resolution.id, resolution.title, resolution.sponsor, resolution.sponsorOfficer, resolution.lead].some(
        (field) => field.toLowerCase().includes(needle),
      );
    const matchesSponsor = selectedSponsor === ALL_SPONSORS || resolution.sponsor === selectedSponsor;
    const matchesStage = selectedStage === ALL_STAGES || resolution.stage === selectedStage;
    return matchesSearch && matchesSponsor && matchesStage;
  });

  return (
    <div className="flex flex-col w-full gap-8 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-[#1e1b19] text-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <span aria-hidden="true" className="material-symbols-outlined text-[#85f8c4] text-[20px]">check_circle</span>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* PAGE HEADER & CANONICAL METADATA */}
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[#59413a] font-headline text-xs tracking-wide uppercase font-bold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#9b2f00]">account_balance</span>
              <span>Church Council & Council Records</span>
              <span>•</span>
              <span>Book of Order Compliance</span>
              <span>•</span>
              <span className="text-[#9b2f00] font-bold">Service Year 2025</span>
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl text-[#1e1b19] font-bold tracking-tight">
              Church Council & Council Records
            </h1>
            <p className="text-sm text-[#59413a] max-w-3xl">
              Official council records, binding trustee resolutions, church governance, and the foundational bylaws repository.
            </p>
          </div>

          {/* Quick Actions Header */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button 
              type="button"
              onClick={() => showToast("Downloading official Church Council Docket (PDF, 3.8 MB)...")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#e1bfb5]/50 text-[#1e1b19] hover:bg-[#faf2ee] transition-colors shadow-sm text-xs font-headline font-bold cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#59413a]">picture_as_pdf</span>
              <span>Church Council Docket (PDF)</span>
            </button>
            <button 
              type="button"
              onClick={() => showToast("Opening Council Conclave calendar scheduler...")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#eee7e3] text-[#1e1b19] hover:bg-[#e9e1dd] transition-colors shadow-sm text-xs font-headline font-bold cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#904d00]">calendar_today</span>
              <span>Schedule Council Meeting</span>
            </button>
            <button 
              type="button"
              onClick={() => setNewResolutionModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white transition-colors shadow-[0_2px_8px_rgba(194,65,12,0.25)] text-xs font-headline font-bold cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ New Resolution</span>
            </button>
          </div>
        </div>

        {/* TOP KPI METRIC BAR */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-1">
          {/* KPI 1 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-headline uppercase tracking-wider text-[#59413a] font-bold">
                  Council & Board Members
                </span>
                <span className="text-xl font-headline text-[#1e1b19] font-bold">14 Elders & Trustees</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#ffdbd0] flex items-center justify-center text-[#9b2f00] shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">diversity_3</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-[#006243] font-bold bg-[#007d57]/10 px-2 py-0.5 rounded-md">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">check_circle</span>
                100% Quorum Attained
              </span>
              <span className="text-xs text-[#59413a]">Stated Sessions</span>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-headline uppercase tracking-wider text-[#59413a] font-bold">
                  Passed Resolutions (2025)
                </span>
                <span className="text-xl font-headline text-[#1e1b19] font-bold">32 Enacted</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#ffdcc3] flex items-center justify-center text-[#904d00] shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">task_alt</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#904d00] font-bold bg-[#ffdcc3]/50 px-2 py-0.5 rounded-md">
                4 Active Implementation
              </span>
              <span className="text-xs text-[#59413a]">28 closed</span>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-headline uppercase tracking-wider text-[#59413a] font-bold">
                  Next Stated Meeting
                </span>
                <span className="text-xl font-headline text-[#9b2f00] font-bold">Feb 27, 2025</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#ffdbd0] flex items-center justify-center text-[#9b2f00] shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">event_upcoming</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9b2f00] font-bold bg-[#ffdbd0]/60 px-2 py-0.5 rounded-md">
                In 18 Days
              </span>
              <span className="text-xs text-[#59413a]">Ordinary Council Conclave</span>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-headline uppercase tracking-wider text-[#59413a] font-bold">
                  Regulatory & Bylaw Health
                </span>
                <span className="text-xl font-headline text-[#006243] font-bold">100% Compliant</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#85f8c4]/40 flex items-center justify-center text-[#006243] shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">verified</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#006243] font-bold bg-[#007d57]/10 px-2 py-0.5 rounded-md">
                Church Council Audit Ratified
              </span>
              <span className="text-xs text-[#59413a]">Archived 2025</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: BOARD & SESSION MEETING LOGS */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h2 className="font-headline text-2xl text-[#1e1b19] font-bold">Board & Council Meeting Logs</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-headline font-bold bg-[#ffdbd0] text-[#9b2f00]">
                Stated & Called Meetings
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#59413a]">
              Official agendas, signed church minutes with pastoral seal, and roll-call attendance logs.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-[#f4ece8] p-1 rounded-lg border border-[#e1bfb5]/30">
            {(['all', 'stated', 'executive', 'emergency'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setMeetingFilter(filter)}
                className={`px-3 py-1.5 rounded-md text-xs font-headline font-bold capitalize transition-all cursor-pointer ${
                  meetingFilter === filter
                    ? 'bg-white text-[#1e1b19] shadow-sm'
                    : 'text-[#59413a] hover:text-[#1e1b19]'
                }`}
              >
                {filter === 'all' ? 'All Sessions' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Balanced Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Calendar & Upcoming Meeting Highlight (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Interactive Monthly Calendar Widget */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-headline font-bold text-[#1e1b19]">February 2025</span>
                  <span className="text-[11px] font-semibold text-[#59413a] bg-[#eee7e3] px-2 py-0.5 rounded">
                    Council Schedule
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    type="button"
                    aria-label="Previous Month"
                    onClick={() => showToast("Viewing January 2025 archive schedule.")}
                    className="w-8 h-8 rounded-lg hover:bg-[#f4ece8] flex items-center justify-center text-[#59413a] cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <button 
                    type="button"
                    aria-label="Next Month"
                    onClick={() => showToast("Viewing March 2025 scheduled stated assembly.")}
                    className="w-8 h-8 rounded-lg hover:bg-[#f4ece8] flex items-center justify-center text-[#59413a] cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-headline font-semibold text-[#59413a]">
                <div className="py-1">Su</div>
                <div className="py-1">Mo</div>
                <div className="py-1">Tu</div>
                <div className="py-1">We</div>
                <div className="py-1">Th</div>
                <div className="py-1">Fr</div>
                <div className="py-1">Sa</div>

                {/* Days */}
                <div className="py-2 text-[#59413a]/40">26</div>
                <div className="py-2 text-[#59413a]/40">27</div>
                <div className="py-2 text-[#59413a]/40">28</div>
                <div className="py-2 text-[#59413a]/40">29</div>
                <div className="py-2 text-[#59413a]/40">30</div>
                <div className="py-2 text-[#59413a]/40">31</div>
                <div className="py-2 text-[#1e1b19]">1</div>
                <div className="py-2 text-[#1e1b19]">2</div>
                <div className="py-2 text-[#1e1b19]">3</div>
                <div className="py-2 text-[#1e1b19]">4</div>
                <div className="py-2 text-[#1e1b19]">5</div>

                {/* Meeting Day 6 */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDay(6);
                    showToast("Feb 6: Q1 Stated Council Meeting #2025-02 (Ratified).");
                  }}
                  className={`py-2 relative font-bold flex flex-col items-center justify-center cursor-pointer rounded-lg transition-colors ${
                    selectedDay === 6 ? 'bg-[#ffdbd0]/80' : 'hover:bg-[#ffdbd0]/40'
                  }`}
                >
                  <span className="w-7 h-7 rounded-full bg-[#ffdbd0] text-[#9b2f00] flex items-center justify-center">6</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9b2f00] mt-0.5"></span>
                </button>

                <div className="py-2 text-[#1e1b19]">7</div>
                <div className="py-2 text-[#1e1b19]">8</div>
                <div className="py-2 text-[#1e1b19]">9</div>
                <div className="py-2 text-[#1e1b19]">10</div>
                <div className="py-2 text-[#1e1b19]">11</div>
                <div className="py-2 text-[#1e1b19]">12</div>
                <div className="py-2 text-[#1e1b19]">13</div>
                <div className="py-2 text-[#1e1b19]">14</div>
                <div className="py-2 text-[#1e1b19]">15</div>
                <div className="py-2 text-[#1e1b19]">16</div>
                <div className="py-2 text-[#1e1b19]">17</div>
                <div className="py-2 text-[#1e1b19]">18</div>
                <div className="py-2 text-[#1e1b19]">19</div>

                {/* Meeting Day 20 */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDay(20);
                    showToast("Feb 20: Finance Subcom Preparation (6:30 PM).");
                  }}
                  className={`py-2 relative font-bold flex flex-col items-center justify-center cursor-pointer rounded-lg transition-colors ${
                    selectedDay === 20 ? 'bg-[#ffdcc3]/80' : 'hover:bg-[#ffdcc3]/40'
                  }`}
                >
                  <span className="w-7 h-7 rounded-full bg-[#ffdcc3]/70 text-[#904d00] flex items-center justify-center">20</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#904d00] mt-0.5"></span>
                </button>

                <div className="py-2 text-[#1e1b19]">21</div>
                <div className="py-2 text-[#1e1b19]">22</div>
                <div className="py-2 text-[#1e1b19]">23</div>
                <div className="py-2 text-[#1e1b19]">24</div>
                <div className="py-2 text-[#1e1b19]">25</div>
                <div className="py-2 text-[#1e1b19]">26</div>

                {/* Upcoming Meeting 27 */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDay(27);
                    showToast("Feb 27: Ordinary Council Conclave (7:00 PM).");
                  }}
                  className={`py-2 relative font-bold flex flex-col items-center justify-center cursor-pointer rounded-lg transition-colors ${
                    selectedDay === 27 ? 'ring-2 ring-[#c2410c]' : 'hover:bg-[#c2410c]/20'
                  }`}
                >
                  <span className="w-7 h-7 rounded-full bg-[#c2410c] text-white shadow-sm flex items-center justify-center">27</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c] mt-0.5 animate-pulse"></span>
                </button>

                <div className="py-2 text-[#1e1b19]">28</div>
                <div className="py-2 text-[#59413a]/40">1</div>
              </div>

              {/* Calendar Legend */}
              <div className="flex flex-wrap items-center gap-4 pt-1 text-[#59413a] text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9b2f00]"></span>
                  <span>Feb 6: Stated Conclave</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#904d00]"></span>
                  <span>Feb 20: Finance Subcom</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c2410c] animate-pulse"></span>
                  <span>Feb 27: Stated Council</span>
                </div>
              </div>
            </div>

            {/* Next Upcoming Meeting Hero Card */}
            <div className="bg-[#eee7e3] rounded-xl p-5 shadow-sm border border-[#e1bfb5]/50 flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold font-headline bg-[#9b2f00] text-white">
                  Upcoming Stated Council
                </span>
                <div className="flex items-center gap-1 text-xs font-bold text-[#9b2f00]">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">schedule</span>
                  <span>In 18 Days</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="font-headline text-lg font-bold text-[#1e1b19]">
                  Q1 Stated Council Conclave #2025-03
                </h3>
                <p className="text-xs text-[#59413a]">
                  Comprehensive operational audit, 2025 general ministry budget finalization, and pastoral review.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-[#e1bfb5]/40">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[20px]">calendar_today</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold text-[#59413a]">Date & Time</span>
                    <span className="text-xs font-bold text-[#1e1b19] truncate">Feb 27 • 7:00 PM</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-[#e1bfb5]/40">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[20px]">meeting_room</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold text-[#59413a]">Location</span>
                    <span className="text-xs font-bold text-[#1e1b19] truncate">Elder Boardroom</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-[#e1bfb5]/40">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#904d00] text-[20px]">person</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold text-[#59413a]">Presiding</span>
                    <span className="text-xs font-bold text-[#1e1b19] truncate">Bishop Sammy</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-[#e1bfb5]/40">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#006243] text-[20px]">how_to_reg</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold text-[#59413a]">Quorum Required</span>
                    <span className="text-xs font-bold text-[#1e1b19] truncate">8 of 14 Elders</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2 overflow-hidden">
                    <div className="inline-block h-7 w-7 rounded-full bg-[#9b2f00] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">MV</div>
                    <div className="inline-block h-7 w-7 rounded-full bg-[#904d00] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">MJ</div>
                    <div className="inline-block h-7 w-7 rounded-full bg-[#006243] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">CO</div>
                    <div className="inline-block h-7 w-7 rounded-full bg-[#59413a] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">+9</div>
                  </div>
                  <span className="text-xs font-semibold text-[#59413a]">12 Confirmed</span>
                </div>
                <button 
                  type="button"
                  onClick={() => showToast("Opening Q1 Conclave Order of Business & Agenda Docket...")}
                  className="px-4 py-1.5 rounded-lg bg-[#c2410c] text-white hover:bg-[#9b2f00] text-xs font-headline font-bold transition-colors cursor-pointer"
                >
                  Council Docket →
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Meeting Docket Records & Archives (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Search & Filter bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-sm border border-[#e1bfb5]/40">
              <div className="relative flex-1 min-w-[220px]">
                <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-[#59413a] text-[18px]">search</span>
                <input aria-label="Search meetings, minutes, docket IDs, attendees" 
                  type="text" 
                  value={searchMeeting}
                  onChange={(e) => setSearchMeeting(e.target.value)}
                  placeholder="Search meetings, minutes, docket IDs, attendees..."
                  className="w-full h-9 pl-9 pr-3 bg-[#faf2ee] rounded-lg text-xs font-medium text-[#1e1b19] placeholder:text-[#8d7168] focus:outline-none focus:bg-white border border-[#e1bfb5]/40"
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => showToast("Displaying date, quorum, and committee filters.")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#faf2ee] text-[#59413a] hover:text-[#1e1b19] text-xs font-semibold border border-[#e1bfb5]/30 cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">tune</span>
                  <span>Filters</span>
                </button>
                <button 
                  type="button"
                  onClick={() => showToast("Exporting Council Meeting Roll (CSV)...")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#faf2ee] text-[#59413a] hover:text-[#1e1b19] text-xs font-semibold border border-[#e1bfb5]/30 cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">file_download</span>
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Meeting Docket Card 1 */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#007d57]/10 text-[#006243] flex items-center gap-1">
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">verified</span>
                      Sealed & Ratified
                    </span>
                    <span className="text-xs text-[#59413a]">Feb 06, 2025 • 7:30 PM EAT</span>
                  </div>
                  <h3 className="font-headline text-lg font-bold text-[#1e1b19] mt-1">
                    Q1 Stated Council Meeting #2025-02
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs bg-[#eee7e3] text-[#59413a] font-semibold">
                    Quorum: 13/14 Present
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs bg-[#ffdbd0]/50 text-[#9b2f00] font-bold">
                    Clerk: Elder Marcus Kamau
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#59413a]">
                Deliberation and formal approval of the Sanctuary HVAC and acoustic enhancement contract, initial reading of the 2025 church operating budget, and Mercy Ministry expansion report.
              </p>

              {/* Attached Documents Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button 
                  type="button"
                  onClick={() => showToast("Downloading Agenda_Feb06.pdf...")}
                  className="flex items-center justify-between p-2.5 bg-[#faf2ee] rounded-lg hover:bg-[#f4ece8] transition-colors text-left border border-[#e1bfb5]/30 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[#c2410c] text-[18px]">description</span>
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Agenda_Nov14.pdf</span>
                  </div>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#59413a]">download</span>
                </button>

                <button 
                  type="button"
                  onClick={() => showToast("Downloading Minutes_Signed_Feb06.pdf (Pastoral seal attached)...")}
                  className="flex items-center justify-between p-2.5 bg-[#faf2ee] rounded-lg hover:bg-[#f4ece8] transition-colors text-left border border-[#e1bfb5]/30 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[#006243] text-[18px]">verified</span>
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Minutes_Signed_Feb06.pdf</span>
                  </div>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#59413a]">download</span>
                </button>

                <button 
                  type="button"
                  onClick={() => showToast("Downloading Attendance_Roll.csv...")}
                  className="flex items-center justify-between p-2.5 bg-[#faf2ee] rounded-lg hover:bg-[#f4ece8] transition-colors text-left border border-[#e1bfb5]/30 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[#904d00] text-[18px]">table_view</span>
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Attendance_Roll.csv</span>
                  </div>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#59413a]">download</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#e1bfb5]/30">
                <div className="flex items-center gap-1.5 text-xs text-[#59413a]">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#006243]">check</span>
                  <span>Pastoral seal applied by Bishop Sammy</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => showToast("Opening certified signed minutes viewer...")}
                    className="text-xs font-headline font-bold text-[#c2410c] hover:underline cursor-pointer"
                  >
                    View Full Minutes
                  </button>
                  <button 
                    type="button"
                    onClick={() => showToast("Downloading complete February 6 session packet...")}
                    className="px-3 py-1.5 rounded-lg bg-[#eee7e3] text-[#1e1b19] hover:bg-[#e9e1dd] text-xs font-semibold cursor-pointer"
                  >
                    Download Packet
                  </button>
                </div>
              </div>
            </div>

            {/* Meeting Docket Card 2 */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#ffdcc3]/60 text-[#904d00] flex items-center gap-1">
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">account_balance</span>
                      Escrow Ratification
                    </span>
                    <span className="text-xs text-[#59413a]">Jan 16, 2025 • 6:00 PM EAT</span>
                  </div>
                  <h3 className="font-headline text-lg font-bold text-[#1e1b19] mt-1">
                    Trustee Board Extraordinary Council #2025-01
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs bg-[#eee7e3] text-[#59413a] font-semibold">
                    Quorum: 7/7 Trustees
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs bg-[#eee7e3] text-[#1e1b19] font-semibold">
                    Clerk: Arthur Wanjala (Trustee)
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#59413a]">
                Authorization of title transfer and escrow depository for the west campus youth annexation parcel. Compliance verified with municipal codes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => showToast("Downloading Sanctuary_Escrow_Resolution.pdf...")}
                  className="flex items-center justify-between p-2.5 bg-[#faf2ee] rounded-lg hover:bg-[#f4ece8] transition-colors text-left border border-[#e1bfb5]/30 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[#c2410c] text-[18px]">picture_as_pdf</span>
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Sanctuary_Escrow_Resolution.pdf</span>
                  </div>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#59413a]">download</span>
                </button>

                <button 
                  type="button"
                  onClick={() => showToast("Downloading Official_Minutes.pdf...")}
                  className="flex items-center justify-between p-2.5 bg-[#faf2ee] rounded-lg hover:bg-[#f4ece8] transition-colors text-left border border-[#e1bfb5]/30 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[#006243] text-[18px]">verified</span>
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Official_Minutes.pdf</span>
                  </div>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#59413a]">download</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#e1bfb5]/30">
                <div className="flex items-center gap-1.5 text-xs text-[#59413a]">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#006243]">lock</span>
                  <span>Legally certified by Trustee legal counsel</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => showToast("Viewing full Extraordinary Council minutes...")}
                    className="text-xs font-headline font-bold text-[#c2410c] hover:underline cursor-pointer"
                  >
                    View Full Minutes
                  </button>
                  <button 
                    type="button"
                    onClick={() => showToast("Downloading complete Trustee session packet...")}
                    className="px-3 py-1.5 rounded-lg bg-[#eee7e3] text-[#1e1b19] hover:bg-[#e9e1dd] text-xs font-semibold cursor-pointer"
                  >
                    Download Packet
                  </button>
                </div>
              </div>
            </div>

            {/* Meeting Docket Card 3 */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#eee7e3] text-[#59413a] flex items-center gap-1">
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">church</span>
                      Ordination Review
                    </span>
                    <span className="text-xs text-[#59413a]">Jan 10, 2025 • 8:00 PM EAT</span>
                  </div>
                  <h3 className="font-headline text-lg font-bold text-[#1e1b19] mt-1">
                    Joint Church Council Advisory #2025-01
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs bg-[#eee7e3] text-[#59413a] font-semibold">
                    Quorum: 14/14 Present
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs bg-[#007d57]/10 text-[#006243] font-bold">
                    Church Council Observer Assigned
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#59413a]">
                Examination and testimonial clearance for incoming Assistant Pastor candidate. Pastoral competency endorsement forwarded to the Church Council Commission.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => showToast("Downloading Ordination_Dossier_Minutes.pdf...")}
                  className="flex items-center justify-between p-2.5 bg-[#faf2ee] rounded-lg hover:bg-[#f4ece8] transition-colors text-left border border-[#e1bfb5]/30 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[#c2410c] text-[18px]">picture_as_pdf</span>
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Ordination_Dossier_Minutes.pdf</span>
                  </div>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#59413a]">download</span>
                </button>

                <button 
                  type="button"
                  onClick={() => showToast("Downloading Roll_Call.pdf...")}
                  className="flex items-center justify-between p-2.5 bg-[#faf2ee] rounded-lg hover:bg-[#f4ece8] transition-colors text-left border border-[#e1bfb5]/30 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[#904d00] text-[18px]">table_view</span>
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Roll_Call.pdf</span>
                  </div>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#59413a]">download</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#e1bfb5]/30">
                <div className="flex items-center gap-1.5 text-xs text-[#59413a]">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#006243]">check_circle</span>
                  <span>Ratified by Bishop Sammy · Visionary Leader</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => showToast("Viewing the Church Council examination dossier...")}
                    className="text-xs font-headline font-bold text-[#c2410c] hover:underline cursor-pointer"
                  >
                    View Full Minutes
                  </button>
                  <button 
                    type="button"
                    onClick={() => showToast("Downloading ordination record packet...")}
                    className="px-3 py-1.5 rounded-lg bg-[#eee7e3] text-[#1e1b19] hover:bg-[#e9e1dd] text-xs font-semibold cursor-pointer"
                  >
                    Download Packet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: RESOLUTIONS & LEGISLATIVE TRACKER */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-headline text-2xl text-[#1e1b19] font-bold">Resolutions & Legislative Tracker</h2>
            <p className="text-xs sm:text-sm text-[#59413a]">
              End-to-end legislative lifecycle from session proposal through elder vote to administrative implementation.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setNewResolutionModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9b2f00] text-white hover:bg-[#832600] transition-colors shadow-sm text-xs font-headline font-bold cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span>
            <span>Submit Legislative Bill</span>
          </button>
        </div>

        {/* Pipeline Summary Stage Indicator Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl shadow-sm border border-[#e1bfb5]/40">
          {/* Proposed Stage */}
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#faf2ee] border border-[#e1bfb5]/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-headline font-bold uppercase text-[#59413a]">Stage 1: Proposed</span>
              <span className="w-6 h-6 rounded-full bg-[#eee7e3] text-xs flex items-center justify-center font-bold text-[#1e1b19]">3</span>
            </div>
            <div className="w-full bg-[#e9e1dd] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#8d7168] w-1/4 h-full"></div>
            </div>
            <span className="text-xs text-[#59413a]">Under 14-day elder review</span>
          </div>

          {/* Voted & Approved Stage */}
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#007d57]/5 border border-[#007d57]/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-headline font-bold uppercase text-[#006243]">Stage 2: Voted</span>
              <span className="w-6 h-6 rounded-full bg-[#85f8c4] text-xs flex items-center justify-center font-bold text-[#006243]">8</span>
            </div>
            <div className="w-full bg-[#e9e1dd] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#006243] w-full h-full"></div>
            </div>
            <span className="text-xs text-[#006243]">Quorum passed & signed</span>
          </div>

          {/* Implementing Stage */}
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#ffdbd0]/30 border border-[#ffdbd0]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-headline font-bold uppercase text-[#9b2f00]">Stage 3: Implementing</span>
              <span className="w-6 h-6 rounded-full bg-[#ffdbd0] text-xs flex items-center justify-center font-bold text-[#9b2f00]">4</span>
            </div>
            <div className="w-full bg-[#e9e1dd] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#c2410c] w-2/3 h-full"></div>
            </div>
            <span className="text-xs text-[#9b2f00] font-medium">Milestones active</span>
          </div>

          {/* Closed & Archived Stage */}
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#faf2ee] border border-[#e1bfb5]/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-headline font-bold uppercase text-[#59413a]">Stage 4: Closed</span>
              <span className="w-6 h-6 rounded-full bg-[#eee7e3] text-xs flex items-center justify-center font-bold text-[#59413a]">21</span>
            </div>
            <div className="w-full bg-[#e9e1dd] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#e9e1dd] w-full h-full"></div>
            </div>
            <span className="text-xs text-[#59413a]">Archived in Church Council Book</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-sm border border-[#e1bfb5]/40">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[240px] flex-1">
              <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2 text-[#59413a] text-[18px]">search</span>
              <input aria-label="Search resolution ID, keyword, or summary" 
                type="text" 
                value={searchResolution}
                onChange={(e) => setSearchResolution(e.target.value)}
                placeholder="Search resolution ID, keyword, or summary..."
                className="w-full h-9 pl-9 pr-3 bg-[#faf2ee] rounded-lg text-xs font-medium text-[#1e1b19] placeholder:text-[#8d7168] focus:outline-none focus:bg-white border border-[#e1bfb5]/40"
              />
            </div>
            <select aria-label="Sponsoring board filter" 
              value={selectedSponsor}
              onChange={(e) => setSelectedSponsor(e.target.value)}
              className="h-9 px-3 rounded-lg bg-[#faf2ee] text-xs font-medium text-[#1e1b19] focus:outline-none border border-[#e1bfb5]/40 cursor-pointer"
            >
              <option>{ALL_SPONSORS}</option>
              <option>Trustee Board</option>
              <option>Finance Committee</option>
              <option>Destiny Youth</option>
              <option>Missions, Mercy & Church Planting</option>
            </select>
            <select aria-label="Resolution stage filter" 
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="h-9 px-3 rounded-lg bg-[#faf2ee] text-xs font-medium text-[#1e1b19] focus:outline-none border border-[#e1bfb5]/40 cursor-pointer"
            >
              <option>{ALL_STAGES}</option>
              <option>Proposed</option>
              <option>Voted & Approved</option>
              <option>Implementing</option>
              <option>Closed</option>
            </select>
          </div>
          <div className="text-xs text-[#59413a]">
            <span>Showing {filteredResolutions.length} of 36 resolutions</span>
          </div>
        </div>

        {/* Comprehensive Legislative Status Table */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e1bfb5]/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f4ece8] text-[#59413a] text-[11px] font-headline font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Resolution ID & Title</th>
                  <th className="py-3 px-4">Sponsor / Dept</th>
                  <th className="py-3 px-4">Council Date</th>
                  <th className="py-3 px-4">Quorum Vote</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Implementation Lead</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1bfb5]/30 text-xs text-[#1e1b19]">
                {filteredResolutions.map((resolution) => {
                  const stage = STAGE_STYLES[resolution.stage];
                  return (
                    <tr
                      key={resolution.id}
                      className={`hover:bg-[#faf2ee]/70 transition-colors ${resolution.rowClass ?? ''}`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className={`font-mono text-xs font-bold ${resolution.idClass}`}>{resolution.id}</span>
                          <span className="font-headline text-sm font-bold text-[#1e1b19] max-w-sm">
                            {resolution.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#1e1b19]">{resolution.sponsor}</span>
                          <span className="text-[#59413a] text-[11px]">{resolution.sponsorOfficer}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#59413a]">{resolution.councilDate}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                            resolution.vote.tone === 'credited'
                              ? 'text-[#006243] font-bold bg-[#007d57]/10'
                              : 'text-[#59413a] font-semibold bg-[#eee7e3]'
                          }`}
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                            {resolution.vote.tone === 'credited' ? 'how_to_vote' : 'pending'}
                          </span>
                          {resolution.vote.text}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full w-max ${stage.chip}`}>
                            {stage.ping ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#9b2f00] animate-ping"></span>
                            ) : (
                              <span aria-hidden="true" className="material-symbols-outlined text-[12px]">
                                {stage.glyph}
                              </span>
                            )}
                            {resolution.stage}
                          </span>
                          <span className={`text-[10px] ${resolution.stageNoteClass ?? 'text-[#59413a]'}`}>
                            {resolution.stageNote}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#1e1b19]">{resolution.lead}</span>
                          <span className="text-[#59413a] text-[11px]">{resolution.leadNote}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => showToast(resolution.action.toast)}
                            className={`px-2.5 py-1 rounded cursor-pointer ${resolution.action.className}`}
                          >
                            {resolution.action.label}
                          </button>
                          <button
                            type="button"
                            aria-label="More actions"
                            onClick={() => showToast(resolution.moreToast)}
                            className="p-1 rounded text-[#59413a] hover:text-[#1e1b19] cursor-pointer"
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">more_vert</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredResolutions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 px-4 text-center text-[#59413a]">
                      No resolutions match this search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 3: POLICY, CONSTITUTION & BYLAWS HUB */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-headline text-2xl text-[#1e1b19] font-bold">Policy, Constitution & Bylaws Hub</h2>
            <p className="text-xs sm:text-sm text-[#59413a]">
              Authoritative official repository of church governance documents, standard operating procedures, and safeguard protocols.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => showToast("Policy Revision upload portal ready for Clerk submission.")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#e1bfb5]/50 hover:bg-[#faf2ee] text-[#1e1b19] transition-colors shadow-sm text-xs font-headline font-bold cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#9b2f00]">upload_file</span>
            <span>+ Upload Policy Revision</span>
          </button>
        </div>

        {/* Search & Category Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-[#59413a] text-[18px]">search</span>
            <input aria-label="Search constitution, bylaws, safeguarding, employment" 
              type="text"
              value={searchPolicy}
              onChange={(e) => setSearchPolicy(e.target.value)}
              placeholder="Search constitution, bylaws, safeguarding, employment..."
              className="w-full h-10 pl-9 pr-3 bg-white rounded-lg text-xs font-medium text-[#1e1b19] placeholder:text-[#8d7168] shadow-sm border border-[#e1bfb5]/50 focus:outline-none focus:ring-1 focus:ring-[#c2410c]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setPolicyCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-headline font-bold transition-all shadow-sm cursor-pointer ${
                policyCategory === 'all'
                  ? 'bg-[#9b2f00] text-white'
                  : 'bg-white hover:bg-[#faf2ee] text-[#1e1b19] border border-[#e1bfb5]/40'
              }`}
            >
              All Documents (16)
            </button>
            <button
              type="button"
              onClick={() => setPolicyCategory('constitution')}
              className={`px-3 py-1.5 rounded-full text-xs font-headline font-bold transition-all shadow-sm cursor-pointer ${
                policyCategory === 'constitution'
                  ? 'bg-[#9b2f00] text-white'
                  : 'bg-white hover:bg-[#faf2ee] text-[#1e1b19] border border-[#e1bfb5]/40'
              }`}
            >
              Constitutional & Bylaws (4)
            </button>
            <button
              type="button"
              onClick={() => setPolicyCategory('hr')}
              className={`px-3 py-1.5 rounded-full text-xs font-headline font-bold transition-all shadow-sm cursor-pointer ${
                policyCategory === 'hr'
                  ? 'bg-[#9b2f00] text-white'
                  : 'bg-white hover:bg-[#faf2ee] text-[#1e1b19] border border-[#e1bfb5]/40'
              }`}
            >
              Staff & HR Policies (5)
            </button>
            <button
              type="button"
              onClick={() => setPolicyCategory('cpp')}
              className={`px-3 py-1.5 rounded-full text-xs font-headline font-bold transition-all shadow-sm cursor-pointer ${
                policyCategory === 'cpp'
                  ? 'bg-[#9b2f00] text-white'
                  : 'bg-white hover:bg-[#faf2ee] text-[#1e1b19] border border-[#e1bfb5]/40'
              }`}
            >
              Safeguarding & CPP (4)
            </button>
            <button
              type="button"
              onClick={() => setPolicyCategory('financial')}
              className={`px-3 py-1.5 rounded-full text-xs font-headline font-bold transition-all shadow-sm cursor-pointer ${
                policyCategory === 'financial'
                  ? 'bg-[#9b2f00] text-white'
                  : 'bg-white hover:bg-[#faf2ee] text-[#1e1b19] border border-[#e1bfb5]/40'
              }`}
            >
              Financial Ethics (3)
            </button>
          </div>
        </div>

        {/* Official Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Document 1: Constitution & Canons */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-lg bg-[#ffdbd0] flex items-center justify-center text-[#9b2f00] shrink-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">menu_book</span>
                  </span>
                  <div className="flex flex-col">
                    <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                      Constitution & Canons of Destiny Sanctuary
                    </h3>
                    <span className="text-[11px] text-[#59413a]">Book of Order Official Document</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#007d57]/15 text-[#006243] shrink-0">
                  v4.2 (Active)
                </span>
              </div>
              <p className="text-xs text-[#59413a]">
                Ratified by General Council Roll #2025. Church doctrine, elder election tenure, trustee limits, and confessional fidelity tenets.
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-[#f4ece8] text-[#59413a] text-xs font-medium">48 pages</span>
                <span className="px-2 py-0.5 rounded-md bg-[#ffdbd0]/40 text-[#9b2f00] text-xs font-bold">Governing Law</span>
                <span className="px-2 py-0.5 rounded-md bg-[#85f8c4]/60 text-[#006243] text-xs font-bold">Church Council Ratified</span>
                <span className="px-2 py-0.5 rounded-md bg-[#f4ece8] text-[#59413a] text-xs font-medium">Tenure Rules</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#e1bfb5]/30">
              <span className="text-xs text-[#59413a]">Next Review: Jul 2025</span>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => showToast("Opening revision history for Constitution v4.1...")}
                  className="text-xs text-[#9b2f00] hover:underline font-bold cursor-pointer"
                >
                  History (v4.1)
                </button>
                <button 
                  type="button"
                  onClick={() => showToast("Downloading Constitution_Canons_v4.2.pdf...")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#eee7e3] text-[#1e1b19] hover:bg-[#e9e1dd] text-xs font-bold cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">download</span>
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Document 2: CPP & Child Protection Policy */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-lg bg-[#ffdcc3] flex items-center justify-center text-[#904d00] shrink-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">shield</span>
                  </span>
                  <div className="flex flex-col">
                    <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                      Child Protection Protocol (CPP)
                    </h3>
                    <span className="text-[11px] text-[#59413a]">Youth & Nursery Safeguard Protocol</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#007d57]/15 text-[#006243] shrink-0">
                  v5.0 (Updated Jan 2025)
                </span>
              </div>
              <p className="text-xs text-[#59413a]">
                Mandatory compliance requirements for all pastors, staff, volunteers, Sunday school educators, and nursery custodians. Zero-tolerance safeguard.
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-[#f4ece8] text-[#59413a] text-xs font-medium">24 pages</span>
                <span className="px-2 py-0.5 rounded-md bg-[#ffdcc3]/50 text-[#904d00] text-xs font-bold">Mandatory Vetting</span>
                <span className="px-2 py-0.5 rounded-md bg-[#f4ece8] text-[#59413a] text-xs font-medium">Background Checks</span>
                <span className="px-2 py-0.5 rounded-md bg-[#85f8c4]/60 text-[#006243] text-xs font-bold">Annual Audit Passed</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#e1bfb5]/30">
              <span className="text-xs text-[#59413a]">Next Review: Oct 2025</span>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => showToast("Opening verified background check roster (100% vetted)...")}
                  className="text-xs text-[#9b2f00] hover:underline font-bold cursor-pointer"
                >
                  Audit Roster
                </button>
                <button 
                  type="button"
                  onClick={() => showToast("Downloading Child_Protection_Protocol_v5.0.pdf...")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#eee7e3] text-[#1e1b19] hover:bg-[#e9e1dd] text-xs font-bold cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">download</span>
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Document 3: Church Financial Dual-Custody SOP */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-lg bg-[#85f8c4]/40 flex items-center justify-center text-[#006243] shrink-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                  </span>
                  <div className="flex flex-col">
                    <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                      Financial Dual-Custody & Audit SOP
                    </h3>
                    <span className="text-[11px] text-[#59413a]">Treasury & Stewardship Internal Control</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#007d57]/15 text-[#006243] shrink-0">
                  v3.1 (Active)
                </span>
              </div>
              <p className="text-xs text-[#59413a]">
                Internal financial controls governing plate offering counts, two-key depository vaults, wire signing authorities, and benevolence disbursements.
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-[#f4ece8] text-[#59413a] text-xs font-medium">18 pages</span>
                <span className="px-2 py-0.5 rounded-md bg-[#85f8c4]/60 text-[#006243] text-xs font-bold">GAAP Compliant</span>
                <span className="px-2 py-0.5 rounded-md bg-[#f4ece8] text-[#59413a] text-xs font-medium">Dual-Signoff</span>
                <span className="px-2 py-0.5 rounded-md bg-[#ffdbd0]/40 text-[#9b2f00] text-xs font-bold">Trustee Mandate</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#e1bfb5]/30">
              <span className="text-xs text-[#59413a]">Released: Jun 02, 2023</span>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => showToast("Opening revision ledger for Treasury SOP...")}
                  className="text-xs text-[#9b2f00] hover:underline font-bold cursor-pointer"
                >
                  History
                </button>
                <button 
                  type="button"
                  onClick={() => showToast("Downloading Financial_Dual_Custody_SOP.pdf...")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#eee7e3] text-[#1e1b19] hover:bg-[#e9e1dd] text-xs font-bold cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">download</span>
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Document 4: Pastoral Staff Compensation & Sabbatical */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-lg bg-[#eee7e3] flex items-center justify-center text-[#9b2f00] shrink-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">badge</span>
                  </span>
                  <div className="flex flex-col">
                    <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                      Pastoral Staff Compensation Guidelines
                    </h3>
                    <span className="text-[11px] text-[#59413a]">Ministerial Care & Sabbatical Protocols</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#ffdcc3] text-[#904d00] shrink-0">
                  v2.4 (Under Review)
                </span>
              </div>
              <p className="text-xs text-[#59413a]">
                Church Council regional benchmarks for ordained clergy salary packages, parsonage allowances, comprehensive health benefits, and 7-year sabbatical terms.
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-[#f4ece8] text-[#59413a] text-xs font-medium">14 pages</span>
                <span className="px-2 py-0.5 rounded-md bg-[#f4ece8] text-[#59413a] text-xs font-medium">Clergy Care</span>
                <span className="px-2 py-0.5 rounded-md bg-[#f4ece8] text-[#59413a] text-xs font-medium">Church Council Benchmarks</span>
                <span className="px-2 py-0.5 rounded-md bg-[#ffdcc3]/50 text-[#904d00] text-xs font-bold">Renewal Jun 2025</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#e1bfb5]/30">
              <span className="text-xs text-[#904d00] font-bold">Renewal Due: Jun 2025</span>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => showToast("Viewing ministerial compensation history...")}
                  className="text-xs text-[#9b2f00] hover:underline font-bold cursor-pointer"
                >
                  History
                </button>
                <button 
                  type="button"
                  onClick={() => showToast("Downloading Pastoral_Compensation_v2.4.pdf...")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#eee7e3] text-[#1e1b19] hover:bg-[#e9e1dd] text-xs font-bold cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">download</span>
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Attestation & Church Council Official Certification Footer */}
        <div className="bg-[#f4ece8] rounded-xl p-5 shadow-sm border border-[#e1bfb5]/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#c2410c] flex items-center justify-center text-white shadow-sm shrink-0">
              <span aria-hidden="true" className="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold font-headline text-[#1e1b19]">
                Church Council Verification & Official Attestation
              </span>
              <span className="text-xs text-[#59413a]">
                All minutes and official resolutions are cryptographically hashed and lodged with the Regional Church Council Stated Clerk.
              </span>
              <span className="font-mono text-[11px] text-[#8d7168] font-medium mt-0.5">
                Sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 • Certified Feb 06, 2025
              </span>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => showToast("Generating complete 140-page Church Council Church Council Binder (PDF)...")}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white transition-colors shadow-sm text-xs font-headline font-bold shrink-0 cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">menu_book</span>
            <span>Download Complete Church Council Binder (PDF)</span>
          </button>
        </div>
      </section>

      {/* New Resolution Submission Modal */}
      {newResolutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33302d]/60 backdrop-blur-xs" {...dialogProps(() => setNewResolutionModal(false), "Submit New Legislative Bill")}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e1bfb5]/40 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#f4ece8]">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-[#c2410c] text-[22px]">add_circle</span>
                <h3 className="font-headline text-base font-bold text-[#1e1b19]">Submit New Legislative Bill</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewResolutionModal(false)}
                className="text-[#59413a] hover:text-[#1e1b19] p-1"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateResolution} className="py-4 space-y-4 text-xs font-headline">
              <div>
                <label htmlFor="resolution-bill-title" className="block text-xs font-bold text-[#59413a] mb-1">
                  Resolution Bill Title *
                </label>
                <input id="resolution-bill-title" aria-label="Resolution Bill Title"
                  type="text"
                  required
                  placeholder="e.g. Parsonage Roof Refurbishment & Solar Allocation"
                  value={resolutionTitle}
                  onChange={(e) => setResolutionTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#faf2ee] text-xs font-medium text-[#1e1b19] border border-[#e1bfb5]/50 focus:outline-none focus:ring-1 focus:ring-[#c2410c]"
                />
              </div>

              <div>
                <label htmlFor="resolution-sponsor" className="block text-xs font-bold text-[#59413a] mb-1">
                  Sponsoring Department / Board *
                </label>
                <select id="resolution-sponsor" aria-label="Sponsoring Department / Board"
                  value={resolutionSponsor}
                  onChange={(e) => setResolutionSponsor(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#faf2ee] text-xs font-medium text-[#1e1b19] border border-[#e1bfb5]/50 focus:outline-none cursor-pointer"
                >
                  <option>Trustee Board</option>
                  <option>Finance Committee</option>
                  <option>Destiny Youth</option>
                  <option>Missions, Mercy & Church Planting</option>
                </select>
              </div>

              <div>
                <label htmlFor="resolution-rationale" className="block text-xs font-bold text-[#59413a] mb-1">
                  Legislative Purpose & Official Rationale
                </label>
                <textarea id="resolution-rationale" aria-label="Legislative Purpose &amp; Official Rationale"
                  rows={3}
                  placeholder="Detail the justification, fiscal impact, and proposed enactment schedule for Council review..."
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#faf2ee] text-xs font-medium text-[#1e1b19] border border-[#e1bfb5]/50 focus:outline-none focus:ring-1 focus:ring-[#c2410c] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f4ece8]">
                <button
                  type="button"
                  onClick={() => setNewResolutionModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] text-xs font-bold text-[#59413a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Submit Bill to Docket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
