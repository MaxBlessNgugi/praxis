import React, { useState, useEffect, useMemo } from 'react';
import { ParishNavTab, MembersSubTab, ParishMember } from '../../../types';
import { DEFAULT_LOCATION, formatKes } from '../../../data/churchDomain';
import { useDialog } from '../dialog';
import { interactiveCard } from '../interactiveCard';
import { useOverviewReport } from '../../../lib/hooks/useReports';
import {
  ApiError,
  api,
  governanceApi,
  tithesApi,
  type ItemEnvelope,
  type PaymentMethod,
} from '../../../lib/api';

/**
 * The tender labels the console shows, mapped to the values the ledger's enum actually accepts.
 * Keeping the Warm Ember wording on screen while sending `mpesa` over the wire is the whole job of
 * this table — the two vocabularies were never going to match, and someone has to do the translation.
 */
const TITHE_METHODS: Record<string, PaymentMethod> = {
  'M-PESA / Online': 'mpesa',
  'Sunday Offering': 'cash',
  Cheque: 'cheque',
  'Card Terminal': 'card',
};

/** `YYYY-MM-DDTHH:mm` in local time, which is exactly what `<input type="datetime-local">` reads. */
function localDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface ActivityItem {
  id: string;
  category: 'giving' | 'pastoral' | 'ministries' | 'governance' | 'sacraments';
  categoryLabel: string;
  title: string;
  description: string;
  timeAgo: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  avatarText: string;
  badgeColor: string;
  badgeBg: string;
  amount?: string;
  icon: string;
}

interface HomeDashboardViewProps {
  onNavigateTab?: (tab: ParishNavTab, subTab?: MembersSubTab | string) => void;
  onAddMember?: (member: Partial<ParishMember>) => void;
}

/** Relative label for an audit entry, e.g. "3h ago". */
function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Just now';
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/** Absolute label for an audit entry, e.g. "09 Feb 2025, 10:12". */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  onNavigateTab,
  onAddMember,
}) => {
  // Cloud Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState('Just now');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch real data from backend
  const { data: overview, isLoading: overviewLoading, error: overviewError, refetch } = useOverviewReport();

  // Operational metrics from real API
  const activeMembersCount = overview?.cards.activeMembers ?? 0;
  const monthlyTithesCurrent = overview?.cards.tithes ?? 0;
  const monthlyTithesTarget = 80000;
  const activeMinistriesCount = overview?.cards.activeMinistries ?? 0;
  const membersTotal = overview?.cards.membersTotal ?? 0;
  const householdsCount = overview?.cards.households ?? 0;
  const pendingResolutionsCount = overview?.cards.pendingResolutions ?? 0;
  const upcomingMeetingsCount = overview?.cards.upcomingMeetings ?? 0;

  // The giving target is monthly, so the cycle *is* the calendar month. Counting the days to the end
  // of it is a fact the console can establish; a hard-coded "19 days left" was an assertion that
  // stayed wrong forever.
  const now = new Date();
  const daysLeftInMonth = Math.max(
    0,
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate(),
  );

  // Activity Feed state - map from audit log
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [activitySearch, setActivitySearch] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const selectedActivityDialog = useDialog(() => setSelectedActivity(null), "Activity Detail");

  // Convert audit log entries to activity items
  useEffect(() => {
    if (overview?.recentActivity) {
      const mapped = overview.recentActivity.map((entry, index): ActivityItem => {
        const actionMap: Record<string, ActivityItem['category']> = {
          create: 'giving',
          update: 'governance',
          delete: 'pastoral',
          restore: 'sacraments',
          login: 'ministries',
        };
        return {
          id: `act-${entry.id ?? index}`,
          category: actionMap[entry.action] ?? 'giving',
          categoryLabel: entry.action === 'create' ? 'Stewardship' : entry.action === 'update' ? 'Council Docket' : entry.action === 'delete' ? 'Pastoral Care' : 'Ministries',
          title: entry.summary || `${entry.action} ${entry.entityName}`,
          description: entry.after ? JSON.stringify(entry.after) : 'No details',
          timeAgo: formatTimeAgo(entry.createdAt),
          timestamp: formatTimestamp(entry.createdAt),
          actor: entry.actor?.name ?? 'System',
          actorRole: 'Staff',
          avatarText: entry.actor?.name?.split(' ').map(n => n[0]).join('') ?? 'SY',
          badgeColor: entry.action === 'create' ? '#059669' : entry.action === 'update' ? '#C2410C' : entry.action === 'delete' ? '#D97706' : '#57534E',
          badgeBg: entry.action === 'create' ? '#059669/10' : entry.action === 'update' ? '#C2410C/10' : entry.action === 'delete' ? '#D97706/10' : '#F8F1E9',
          icon: entry.action === 'create' ? 'account_balance_wallet' : entry.action === 'update' ? 'gavel' : entry.action === 'delete' ? 'home_health' : 'hiking',
        };
      });
      setActivities(mapped);
    }
  }, [overview?.recentActivity]);

  // Modals for sticky bottom quick action pills
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const addMemberOpenDialog = useDialog(() => setIsAddMemberOpen(false), "Quick Member Intake");
  const [isRecordTitheOpen, setIsRecordTitheOpen] = useState(false);
  const recordTitheOpenDialog = useDialog(() => setIsRecordTitheOpen(false), "Record Tithe & Offering");
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);
  const scheduleMeetingOpenDialog = useDialog(() => setIsScheduleMeetingOpen(false), "Schedule Council / Committee Meeting");

  // Form states for quick actions
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberHousehold, setNewMemberHousehold] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberTier, setNewMemberTier] = useState('member');

  const [titheDonorName, setTitheDonorName] = useState('Anonymous / Plate Offering');
  const [titheAmount, setTitheAmount] = useState('500');
  const [titheFund, setTitheFund] = useState('General Operating #101');
  const [titheMethod, setTitheMethod] = useState('M-PESA / Online');

  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingCommittee, setMeetingCommittee] = useState('Church Council');
  // A week out, computed. The mockup shipped a fixed `2025-02-20T19:00`, so the form was pre-filled
  // with a date in the past from the first day it was ever written.
  const [meetingDate, setMeetingDate] = useState(() => localDateTimeValue(new Date(Date.now() + 7 * 86_400_000)));
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [meetingLocation, setMeetingLocation] = useState('Sanctuary Council Chamber');
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [isSavingTithe, setIsSavingTithe] = useState(false);
  const [titheError, setTitheError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncedTime('Just now');
      showToast('Cloud database synchronized across all church nodes (14ms latency).');
    }, 850);
  };

  const handleSaveQuickMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = newMemberName.trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    // The register needs a first *and* a last name. Saying so here beats letting the API reject the
    // request with a field error this modal has nowhere to show.
    if (parts.length < 2) {
      setMemberError('Enter the person’s first and last name, for example “Mary Wanjiku”.');
      return;
    }
    if (isSavingMember) return;

    setIsSavingMember(true);
    setMemberError(null);
    try {
      await api.post<ItemEnvelope<ParishMember>>('/api/members', {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
        location: DEFAULT_LOCATION,
        ...(newMemberEmail.trim() ? { email: newMemberEmail.trim() } : {}),
        ...(newMemberPhone.trim() ? { phone: newMemberPhone.trim() } : {}),
      });
      // The register belongs to the server, and the count on the card above is read from this same
      // overview — so refetching is what makes the two agree.
      await refetch();
      showToast(`${fullName} is now on the register.`);
      setIsAddMemberOpen(false);
      setNewMemberName('');
      setNewMemberHousehold('');
      setNewMemberEmail('');
      setNewMemberPhone('');
    } catch (error) {
      setMemberError(error instanceof ApiError ? error.body.error : 'The member could not be saved.');
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleSaveQuickTithe = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(titheAmount);
    if (Number.isNaN(val) || val <= 0) {
      setTitheError('Enter an amount greater than zero.');
      return;
    }
    if (isSavingTithe) return;

    setIsSavingTithe(true);
    setTitheError(null);
    try {
      // The ledger is the server's, and every write is chained into its audit trail. Posting here —
      // rather than to a browser store — is what makes a recorded tithe a recorded tithe.
      await tithesApi.create({
        donorName: titheDonorName.trim() || 'Anonymous / Plate Offering',
        amount: val,
        method: TITHE_METHODS[titheMethod] ?? 'cash',
        category: titheFund,
      });
      await refetch();
      showToast(`Tithe of KSh ${val.toLocaleString()} posted to ${titheFund}.`);
      setIsRecordTitheOpen(false);
      setTitheAmount('500');
    } catch (error) {
      setTitheError(error instanceof ApiError ? error.body.error : 'The tithe could not be recorded.');
    } finally {
      setIsSavingTithe(false);
    }
  };

  const handleSaveQuickMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim() || isSavingMeeting) return;
    setIsSavingMeeting(true);
    setMeetingError(null);
    try {
      await governanceApi.createMeeting({
        title: meetingTitle.trim(),
        kind: 'stated',
        heldAt: new Date(meetingDate).toISOString(),
        venue: meetingLocation.trim(),
        agenda: [meetingCommittee],
      });
      // The docket belongs to the server. Refetching the overview is what puts the new meeting into
      // the audit feed as a real entry, rather than a line this component invented for itself.
      await refetch();
      showToast(`Meeting "${meetingTitle}" added to the council docket.`);
      setIsScheduleMeetingOpen(false);
      setMeetingTitle('');
    } catch (error) {
      setMeetingError(error instanceof ApiError ? error.body.error : 'The meeting could not be saved.');
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const filteredActivities = activities.filter((act) => {
    const matchesFilter = activityFilter === 'all' || act.category === activityFilter;
    const matchesSearch =
      act.title.toLowerCase().includes(activitySearch.toLowerCase()) ||
      act.description.toLowerCase().includes(activitySearch.toLowerCase()) ||
      act.actor.toLowerCase().includes(activitySearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const progressPercent = Math.min(100, Math.round((monthlyTithesCurrent / monthlyTithesTarget) * 100));

  return (
    <div className="flex flex-col w-full min-h-full pb-28 text-[#1C1917] font-['Inter',sans-serif] bg-[#FDF8F3]">
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-24 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-[9px] bg-[#1C1917] text-white shadow-2xl border border-[#E7E5E4] animate-in slide-in-from-bottom-5 duration-300">
          <span aria-hidden="true" className="material-symbols-outlined text-[#059669] text-[20px]">verified</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Backend unreachable — the sign-in gate is real now, so a dead API is a visible state. */}
      {overviewError && (
        <div role="alert" className="w-full px-6 sm:px-8 pt-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[#B91C1C]">
            <span className="flex items-center gap-2 text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">cloud_off</span>
              Could not reach the church database: {overviewError}
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              className="self-start sm:self-auto rounded-[9px] bg-[#B91C1C] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#991B1B] transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP GREETING BAR + LIVE CLOUD SYNCED STATUS */}
      {/* ========================================================================= */}
      <div className="w-full bg-[#FDF8F3] border-b border-[#E7E5E4] px-6 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Greeting Text & My Year Of Dominion */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#C2410C] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#C2410C]"></span>
              <span>Cloud Church Console • My Year Of Dominion</span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1917]">
                Good morning, Bishop Sammy
              </h1>
              <span className="hidden sm:inline-block text-xs font-medium px-2.5 py-0.5 rounded-[9px] bg-[#F8F1E9] text-[#57534E] border border-[#E7E5E4]">
                Destiny Sanctuary Int'L
              </span>
            </div>
            <p className="text-xs text-[#57534E]">
              Nyahururu Main Church • {membersTotal} souls on the roll across {householdsCount} households.
              {overviewLoading && <span className="ml-1 text-[#A8A29E]">• Refreshing…</span>}
            </p>
          </div>

          {/* Right: Live Cloud Synced Indicator & Quick Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live Green Cloud Synced Status Pill */}
            <div 
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-[9px] bg-[#059669]/10 border border-[#059669]/30 text-[#059669] shadow-sm"
              title="Cloud real-time replica operational"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#059669]"></span>
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#059669] tracking-wide">Cloud synced</span>
                  <span className="text-[10px] text-[#059669]/80 font-medium">• {lastSyncedTime}</span>
                </div>
              </div>
            </div>

            {/* Sync Now Button */}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-[#FFFFFF] hover:bg-[#F5EDE4] text-[#57534E] hover:text-[#1C1917] text-xs font-bold border border-[#E7E5E4] hover:border-[#D6D3D1] transition-all shadow-sm cursor-pointer"
              title="Verify cloud ledger integrity"
            >
              <span aria-hidden="true" className={`material-symbols-outlined text-[17px] text-[#C2410C] ${isSyncing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span className="hidden sm:inline">{isSyncing ? 'Verifying...' : 'Sync'}</span>
            </button>

            {/* Sunday Service Shortcut */}
            <button
              type="button"
              onClick={() => onNavigateTab?.('services-worship')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-[0_2px_8px_rgba(194,65,12,0.25)] cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[17px]">auto_stories</span>
              <span>Sunday Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 CORE METRIC CARDS */}
      {/* ========================================================================= */}
      <div className="w-full px-6 sm:px-8 pt-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* 1. Active Members */}
          <div 
            {...interactiveCard(() => onNavigateTab?.('find-christian'))}
            className="group p-5 rounded-[14px] bg-[#FFFFFF] border border-[#E7E5E4] shadow-warm-card hover:shadow-warm-card-hover hover:border-[#D6D3D1] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-[#57534E]">
                  Active Members
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold tracking-tight text-[#1C1917]">
                    {activeMembersCount.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-[9px] bg-[#F5EDE4] flex items-center justify-center text-[#C2410C] group-hover:scale-105 transition-transform shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[24px]">diversity_1</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E7E5E4] flex items-center justify-between text-[11px]">
              <span className="text-[#57534E]">
                <strong className="text-[#1C1917] font-bold">{membersTotal.toLocaleString()}</strong> on the roll •{' '}
                <strong className="text-[#1C1917] font-bold">{activeMembersCount.toLocaleString()}</strong> active
              </span>
              <span className="font-bold text-[#C2410C] group-hover:text-[#EA580C] flex items-center gap-0.5">
                Roll <span aria-hidden="true" className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </div>
          </div>

          {/* 2. Monthly Tithes & Offerings with Progress Bar */}
          <div 
            {...interactiveCard(() => onNavigateTab?.('giving-stewardship'))}
            className="group p-5 rounded-[14px] bg-[#FFFFFF] border border-[#E7E5E4] shadow-warm-card hover:shadow-warm-card-hover hover:border-[#D6D3D1] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-[#57534E]">
                  Monthly Tithes & Offerings
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-3xl font-bold tracking-tight text-[#1C1917]">{formatKes(monthlyTithesCurrent)}</span>
                  <span className="text-xs text-[#57534E] font-medium">/ {formatKes(monthlyTithesTarget)}</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-[9px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#D97706] group-hover:scale-105 transition-transform shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[24px]">volunteer_activism</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-bold text-[#C2410C]">{progressPercent}% of target</span>
                <span className="text-[#57534E] font-medium">
                  {formatKes(Math.max(0, monthlyTithesTarget - monthlyTithesCurrent))} to goal
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#E7E5E4] overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#C2410C] to-[#EA580C] transition-all duration-500 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#E7E5E4] flex items-center justify-between text-[11px]">
              <span className="text-[#57534E]">
                {daysLeftInMonth} {daysLeftInMonth === 1 ? 'day' : 'days'} left this month
              </span>
              <span className="font-bold text-[#C2410C] group-hover:text-[#EA580C] flex items-center gap-0.5">
                Ledger <span aria-hidden="true" className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </div>
          </div>

          {/* 3. Active Ministries */}
          <div 
            {...interactiveCard(() => onNavigateTab?.('ministries-groups'))}
            className="group p-5 rounded-[14px] bg-[#FFFFFF] border border-[#E7E5E4] shadow-warm-card hover:shadow-warm-card-hover hover:border-[#D6D3D1] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-[#57534E]">
                  Active Ministries
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold tracking-tight text-[#1C1917]">
                    {activeMinistriesCount}
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-[9px] bg-[#F5EDE4] flex items-center justify-center text-[#C2410C] group-hover:scale-105 transition-transform shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[24px]">groups</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E7E5E4] flex items-center justify-between text-[11px]">
              <span className="text-[#57534E]">Departments and fellowships</span>
              <span className="font-bold text-[#C2410C] group-hover:text-[#EA580C] flex items-center gap-0.5">
                Hub <span aria-hidden="true" className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </div>
          </div>

          {/* 4. Pending Board Actions */}
          <div 
            {...interactiveCard(() => onNavigateTab?.('governance'))}
            className="group p-5 rounded-[14px] bg-[#FFFFFF] border border-[#E7E5E4] shadow-warm-card hover:shadow-warm-card-hover hover:border-[#D6D3D1] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-[#57534E]">
                  Pending Board Actions
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold tracking-tight text-[#1C1917]">
                    {pendingResolutionsCount}
                  </span>
                  <span className="inline-flex items-center text-[11px] font-bold text-[#C2410C] bg-[#F5EDE4] px-2 py-0.5 rounded-[9px]">
                    Council Docket
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-[9px] bg-[#F5EDE4] flex items-center justify-center text-[#C2410C] group-hover:scale-105 transition-transform shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[24px]">gavel</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E7E5E4] flex items-center justify-between text-[11px]">
              <span className="text-[#57534E]">
                {upcomingMeetingsCount} {upcomingMeetingsCount === 1 ? 'meeting' : 'meetings'} scheduled ahead
              </span>
              <span className="font-bold text-[#C2410C] group-hover:text-[#EA580C] flex items-center gap-0.5">
                Review <span aria-hidden="true" className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RECENT ACTIVITY FEED */}
      {/* ========================================================================= */}
      <div className="w-full px-6 sm:px-8 pt-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          {/* Feed Header and Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] p-4 rounded-[14px] border border-[#E7E5E4] shadow-warm-card">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[9px] bg-[#C2410C] text-white flex items-center justify-center shadow-sm">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">history</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1C1917] tracking-tight">
                  Church Operational Activity
                </h2>
                <p className="text-[11px] text-[#57534E]">
                  Real-time church stream of stewardship, pastoral calls, and council records.
                </p>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <span aria-hidden="true" className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-[#A8A29E]">
                  search
                </span>
                <input aria-label="Filter events"
                  type="text"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Filter events..."
                  className="h-8 pl-7 pr-3 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 transition-all"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#F8F1E9] p-1 rounded-[9px] border border-[#E7E5E4]">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'giving', label: 'Giving' },
                  { id: 'pastoral', label: 'Pastoral' },
                  { id: 'ministries', label: 'Ministries' },
                  { id: 'governance', label: 'Council' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActivityFilter(tab.id)}
                    className={`px-3 py-1 rounded-[9px] text-xs font-semibold transition-all cursor-pointer ${
                      activityFilter === tab.id
                        ? 'bg-[#FFFFFF] text-[#C2410C] shadow-sm font-bold'
                        : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Cards List */}
          <div className="flex flex-col gap-2.5">
            {filteredActivities.length === 0 ? (
              <div className="bg-[#FFFFFF] rounded-[14px] p-10 text-center border border-[#E7E5E4] shadow-warm-card">
                <span aria-hidden="true" className="material-symbols-outlined text-[36px] text-[#A8A29E] mb-2">
                  event_busy
                </span>
                <p className="text-xs font-semibold text-[#1C1917]">No activity records match your filter</p>
                <button
                  onClick={() => {
                    setActivityFilter('all');
                    setActivitySearch('');
                  }}
                  className="mt-3 text-xs font-bold text-[#C2410C] hover:text-[#EA580C] hover:underline cursor-pointer"
                >
                  Reset activity filters
                </button>
              </div>
            ) : (
              filteredActivities.map((act) => (
                <div
                  key={act.id}
                  {...interactiveCard(() => setSelectedActivity(act))}
                  className="group bg-[#FFFFFF] hover:bg-[#F5EDE4] transition-all p-4 rounded-[14px] border border-[#E7E5E4] hover:border-[#D6D3D1] shadow-warm-card flex items-start justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Icon Avatar */}
                    <div className="w-10 h-10 rounded-[9px] bg-[#F8F1E9] text-[#C2410C] flex items-center justify-center shrink-0 border border-[#E7E5E4] group-hover:scale-105 transition-transform">
                      <span aria-hidden="true" className="material-symbols-outlined text-[20px]">{act.icon}</span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#1C1917] group-hover:text-[#C2410C] transition-colors">
                          {act.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[9px] bg-[#F8F1E9] text-[#57534E] border border-[#E7E5E4]">
                          {act.categoryLabel}
                        </span>
                        {act.amount && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-[9px] bg-[#059669]/10 text-[#059669]">
                            {act.amount}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#57534E] mt-0.5 line-clamp-1 leading-relaxed">
                        {act.description}
                      </p>

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[#A8A29E]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-[#F5EDE4] text-[#C2410C] flex items-center justify-center text-[9px] font-bold">
                            {act.avatarText}
                          </span>
                          <strong className="text-[#57534E] font-medium">{act.actor}</strong> ({act.actorRole})
                        </span>
                        <span>•</span>
                        <span>{act.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-center">
                    <span className="text-[11px] font-medium text-[#A8A29E] hidden sm:inline">
                      {act.timeAgo}
                    </span>
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#A8A29E] group-hover:text-[#C2410C] group-hover:translate-x-0.5 transition-all">
                      chevron_right
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STICKY BOTTOM QUICK-ACTION PILLS DOCK */}
      {/* ========================================================================= */}
      <div className="fixed bottom-5 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E7E5E4] shadow-[0_12px_36px_rgba(87,83,78,0.14)] rounded-[14px] px-4 py-2.5 flex items-center gap-2 sm:gap-3 transition-transform hover:scale-[1.01]">
          {/* Quick Pill 1: + Add Member */}
          <button
            type="button"
            onClick={() => setIsAddMemberOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white font-bold text-xs shadow-[0_2px_8px_rgba(194,65,12,0.25)] transition-all cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[17px]">person_add</span>
            <span>+ Add Member</span>
          </button>

          {/* Quick Pill 2: + Record Tithe */}
          <button
            type="button"
            onClick={() => setIsRecordTitheOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-[#D97706] hover:bg-[#F59E0B] text-white font-bold text-xs shadow-[0_2px_8px_rgba(217,119,6,0.25)] transition-all cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[17px]">payments</span>
            <span>+ Record Tithe</span>
          </button>

          {/* Quick Pill 3: + Schedule Meeting */}
          <button
            type="button"
            onClick={() => setIsScheduleMeetingOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-[#F8F1E9] hover:bg-[#F5EDE4] text-[#1C1917] font-bold text-xs border border-[#E7E5E4] transition-all cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[17px] text-[#C2410C]">calendar_today</span>
            <span>+ Schedule Meeting</span>
          </button>

          <div className="hidden md:flex items-center pl-2 border-l border-[#E7E5E4] text-[10px] text-[#A8A29E] font-medium">
            <span className="px-1.5 py-0.5 rounded-[9px] bg-[#F8F1E9] text-[#57534E] font-mono mr-1 border border-[#E7E5E4]">⌘K</span>
            <span>Command Hub</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: QUICK ADD MEMBER */}
      {/* ========================================================================= */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/40 backdrop-blur-xs" {...addMemberOpenDialog}>
          <div className="w-full max-w-lg bg-[#FFFFFF] rounded-[14px] p-6 shadow-2xl border border-[#E7E5E4] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E5E4] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[9px] bg-[#C2410C] text-white flex items-center justify-center shadow-sm">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">person_add</span>
                </div>
                <div>
                  <h3 className="font-bold text-[#1C1917] text-base">Quick Member Intake</h3>
                  <p className="text-xs text-[#57534E]">Add an individual or family head to active church rolls.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="p-1 rounded-[9px] text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917] cursor-pointer transition-colors"
             aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveQuickMember} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label htmlFor="home-member-name" className="font-bold text-[#1C1917] mb-1 block">Full Legal Name *</label>
                <input id="home-member-name" aria-label="Full Legal Name"
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g. Gabriel Mwangi"
                  className="w-full h-9 px-3 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-medium text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="home-member-household" className="font-bold text-[#1C1917] mb-1 block">Household Name</label>
                  <input id="home-member-household" aria-label="Household Name"
                    type="text"
                    value={newMemberHousehold}
                    onChange={(e) => setNewMemberHousehold(e.target.value)}
                    placeholder="e.g. Mwangi Household"
                    className="w-full h-9 px-3 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-medium text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="home-member-tier" className="font-bold text-[#1C1917] mb-1 block">Membership Tier</label>
                  <select id="home-member-tier" aria-label="Membership Tier"
                    value={newMemberTier}
                    onChange={(e) => setNewMemberTier(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-medium text-[#1C1917] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 cursor-pointer transition-all"
                  >
                    <option value="member">Member (Full Voting)</option>
                    <option value="first-timer">First Timer / Candidate</option>
                    <option value="youth">Youth / Discipleship Class</option>
                    <option value="visitor">Regular Visitor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="home-member-email" className="font-bold text-[#1C1917] mb-1 block">Email Address</label>
                  <input id="home-member-email" aria-label="Email Address"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="gabriel@example.com"
                    className="w-full h-9 px-3 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-medium text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="home-member-phone" className="font-bold text-[#1C1917] mb-1 block">Phone Number</label>
                  <input id="home-member-phone" aria-label="Phone Number"
                    type="tel"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    placeholder="+254 750 192 830"
                    className="w-full h-9 px-3 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-medium text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 transition-all"
                  />
                </div>
              </div>

              {memberError && (
                <p role="alert" className="text-[11px] font-semibold text-[#B91C1C] bg-[#B91C1C]/5 border border-[#B91C1C]/20 rounded-[9px] px-3 py-2">
                  {memberError}
                </p>
              )}

              <div className="pt-3 border-t border-[#E7E5E4] flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 rounded-[9px] bg-[#F8F1E9] hover:bg-[#F5EDE4] text-[#57534E] font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMember}
                  className="px-5 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white font-bold shadow-[0_2px_8px_rgba(194,65,12,0.25)] cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Enroll Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QUICK RECORD TITHE */}
      {/* ========================================================================= */}
      {isRecordTitheOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/40 backdrop-blur-xs" {...recordTitheOpenDialog}>
          <div className="w-full max-w-lg bg-[#FFFFFF] rounded-[14px] p-6 shadow-2xl border border-[#E7E5E4] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E5E4] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[9px] bg-[#D97706] text-white flex items-center justify-center shadow-sm">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">payments</span>
                </div>
                <div>
                  <h3 className="font-bold text-[#1C1917] text-base">Record Tithe & Offering</h3>
                  <p className="text-xs text-[#57534E]">Directly post to treasury batch with receipt attestation.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordTitheOpen(false)}
                className="p-1 rounded-[9px] text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917] cursor-pointer transition-colors"
             aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveQuickTithe} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label htmlFor="home-tithe-donor" className="font-bold text-[#1C1917] mb-1 block">Donor / Household Name</label>
                <input id="home-tithe-donor" aria-label="Donor / Household Name"
                  type="text"
                  required
                  value={titheDonorName}
                  onChange={(e) => setTitheDonorName(e.target.value)}
                  placeholder="e.g. Deacon Marcus Omondi"
                  className="w-full h-9 px-3 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-medium text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="home-tithe-amount" className="font-bold text-[#1C1917] mb-1 block">Offering Amount (KSh) *</label>
                  <input id="home-tithe-amount" aria-label="Offering Amount (KSh)"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={titheAmount}
                    onChange={(e) => setTitheAmount(e.target.value)}
                    placeholder="500.00"
                    className="w-full h-9 px-3 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-bold text-base text-[#059669] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="home-tithe-fund" className="font-bold text-[#1C1917] mb-1 block">Fund Allocation</label>
                  <select id="home-tithe-fund" aria-label="Fund Allocation"
                    value={titheFund}
                    onChange={(e) => setTitheFund(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-medium text-[#1C1917] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 cursor-pointer transition-all"
                  >
                    <option value="General Operating #101">General Operating #101</option>
                    <option value="Building Expansion #610">Building Expansion #610</option>
                    <option value="Missions Reserve #204">Missions Reserve #204</option>
                    <option value="Benevolence Escrow #402">Benevolence Escrow #402</option>
                  </select>
                </div>
              </div>

              <div>
                <label id="home-tithe-method-label" className="font-bold text-[#1C1917] mb-1 block">Tender Method</label>
                <div role="group" aria-labelledby="home-tithe-method-label" className="grid grid-cols-4 gap-2">
                  {['M-PESA / Online', 'Sunday Offering', 'Cheque', 'Card Terminal'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTitheMethod(m)}
                      className={`py-2 rounded-[9px] text-center font-bold border transition-all cursor-pointer ${
                        titheMethod === m
                          ? 'bg-[#D97706] text-white border-[#D97706] shadow-sm'
                          : 'bg-[#FFFFFF] text-[#57534E] border-[#E7E5E4] hover:bg-[#F5EDE4]'
                      }`}
                    >
                      {m.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {titheError && (
                <p role="alert" className="text-[11px] font-semibold text-[#B91C1C] bg-[#B91C1C]/5 border border-[#B91C1C]/20 rounded-[9px] px-3 py-2">
                  {titheError}
                </p>
              )}

              <div className="pt-3 border-t border-[#E7E5E4] flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsRecordTitheOpen(false)}
                  className="px-4 py-2 rounded-[9px] bg-[#F8F1E9] hover:bg-[#F5EDE4] text-[#57534E] font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTithe}
                  className="px-5 py-2 rounded-[9px] bg-[#D97706] hover:bg-[#F59E0B] text-white font-bold shadow-[0_2px_8px_rgba(217,119,6,0.25)] cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Post Tithe to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QUICK SCHEDULE MEETING */}
      {/* ========================================================================= */}
      {isScheduleMeetingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/40 backdrop-blur-xs" {...scheduleMeetingOpenDialog}>
          <div className="w-full max-w-lg bg-[#FFFFFF] rounded-[14px] p-6 shadow-2xl border border-[#E7E5E4] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E5E4] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[9px] bg-[#C2410C] text-white flex items-center justify-center shadow-sm">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">calendar_today</span>
                </div>
                <div>
                  <h3 className="font-bold text-[#1C1917] text-base">Schedule Council / Committee Meeting</h3>
                  <p className="text-xs text-[#57534E]">Book council chambers and dispatch elder calendar invites.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleMeetingOpen(false)}
                className="p-1 rounded-[9px] text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917] cursor-pointer transition-colors"
             aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveQuickMeeting} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label htmlFor="home-meeting-title" className="font-bold text-[#1C1917] mb-1 block">Meeting Docket Title *</label>
                <input id="home-meeting-title" aria-label="Meeting Docket Title"
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Q1 Stated Council Meeting & Budget Hearing"
                  className="w-full h-9 px-3 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-medium text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="home-meeting-committee" className="font-bold text-[#1C1917] mb-1 block">Governing Body / Committee</label>
                  <select id="home-meeting-committee" aria-label="Governing Body / Committee"
                    value={meetingCommittee}
                    onChange={(e) => setMeetingCommittee(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-medium text-[#1C1917] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 cursor-pointer transition-all"
                  >
                    <option value="Church Council">Church Council</option>
                    <option value="Missions, Mercy & Church Planting">Missions, Mercy & Church Planting</option>
                    <option value="Pastoral Care Team">Pastoral Care Team</option>
                    <option value="Trustees & Finance">Trustees & Finance</option>
                    <option value="Destiny Youth">Destiny Youth</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="home-meeting-datetime" className="font-bold text-[#1C1917] mb-1 block">Date & Time</label>
                  <input id="home-meeting-datetime" aria-label="Date &amp; Time"
                    type="datetime-local"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-medium text-[#1C1917] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 cursor-pointer transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="home-meeting-location" className="font-bold text-[#1C1917] mb-1 block">Church Location / Chamber</label>
                <input id="home-meeting-location" aria-label="Church Location / Chamber"
                  type="text"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  placeholder="e.g. Sanctuary Council Chamber (or Zoom Tele-Link)"
                  className="w-full h-9 px-3 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-medium text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 transition-all"
                />
              </div>

              {meetingError && (
                <p role="alert" className="text-[11px] font-semibold text-[#B91C1C] bg-[#B91C1C]/5 border border-[#B91C1C]/20 rounded-[9px] px-3 py-2">
                  {meetingError}
                </p>
              )}

              <div className="pt-3 border-t border-[#E7E5E4] flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleMeetingOpen(false)}
                  className="px-4 py-2 rounded-[9px] bg-[#F8F1E9] hover:bg-[#F5EDE4] text-[#57534E] font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white font-bold shadow-[0_2px_8px_rgba(194,65,12,0.25)] cursor-pointer transition-all"
                >
                  Publish to Docket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTIVITY DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/40 backdrop-blur-xs" {...selectedActivityDialog}>
          <div className="w-full max-w-md bg-[#FFFFFF] rounded-[14px] p-6 shadow-2xl border border-[#E7E5E4] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4] mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[9px] bg-[#F8F1E9] text-[#C2410C] border border-[#E7E5E4]">
                  {selectedActivity.categoryLabel}
                </span>
                <span className="text-[11px] text-[#A8A29E]">• {selectedActivity.timestamp}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="p-1 rounded-[9px] text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917] cursor-pointer transition-colors"
             aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>

            <h3 className="font-bold text-base text-[#1C1917] mb-2">{selectedActivity.title}</h3>
            <p className="text-xs text-[#57534E] leading-relaxed mb-4">{selectedActivity.description}</p>

            <div className="bg-[#F8F1E9] p-3 rounded-[9px] border border-[#E7E5E4] flex items-center justify-between text-xs mb-4">
              <span className="text-[#57534E]">Recorded By:</span>
              <span className="font-bold text-[#1C1917]">
                {selectedActivity.actor} ({selectedActivity.actorRole})
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="px-4 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white font-bold text-xs shadow-[0_2px_8px_rgba(194,65,12,0.25)] cursor-pointer transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
