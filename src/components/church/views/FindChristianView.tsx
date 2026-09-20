import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParishMember } from '../../../types';
import { useLocations } from '../../../lib/hooks/useMembers';
import { interactiveCard } from '../interactiveCard';
import { useMemberReport } from '../../../hooks/useApi';
import { usePermissions } from '../../../lib/permissions';
import { exportCsv } from '../../../lib/export';
import { EmptyState } from '../../ui';
import { useMembers, type ListMembersQuery } from '../../../lib/hooks/useMembers';
import { MEMBER_STATUS_LABELS } from '../../../lib/adapters';
import { MemberRecordDialog } from './MemberRecordDialog';
import { useChurchIdentity } from '../../../hooks/useChurchIdentity';
import { ImportMembersDialog } from './ImportMembersDialog';
import { useRouter } from '../../../lib/router';

/** The columns the register leaves the app as, matching ECCLESIA's export panels. */
const MEMBER_COLUMNS = [
  { label: 'Member ID', value: (m: ParishMember) => m.memberId },
  { label: 'Name', value: (m: ParishMember) => m.name },
  { label: 'Household', value: (m: ParishMember) => m.householdName },
  { label: 'Congregation', value: (m: ParishMember) => m.church },
  { label: 'Status', value: (m: ParishMember) => m.statusLabel },
  { label: 'Envelope', value: (m: ParishMember) => m.envelopeNumber },
  { label: 'Phone', value: (m: ParishMember) => m.phone },
  { label: 'Email', value: (m: ParishMember) => m.email },
];

interface FindChristianViewProps {
  onNavigateToAdd: () => void;
  onNavigateToFamilyUnit?: () => void;
  onSelectMemberForArchive?: (member: ParishMember) => void;
}

export const FindChristianView: React.FC<FindChristianViewProps> = ({
  onNavigateToAdd,
  onNavigateToFamilyUnit,
  onSelectMemberForArchive,
}) => {
  // The census cards report the whole register, so they read the register report rather than the page
  // of rows below them: that list is filtered by the search box and paged, and a filtered page is not
  // a census.
  const { data: register } = useMemberReport();
  const roll = {
    total: register?.total ?? 0,
    active: register?.byStatus.active ?? 0,
    households: register?.households.total ?? 0,
    withBaptismRecord: register?.withBaptismRecord ?? 0,
    awaitingRecord: register?.byBaptismType.none ?? 0,
    envelopesIssued: register?.envelopesIssued ?? 0,
    youth: register?.youth ?? 0,
  };
  /** Every card shows a count and its share of the roll, so the division lives in one place. */
  const shareOfRoll = (count: number) => (roll.total === 0 ? 0 : Math.round((count / roll.total) * 100));
  const { canEdit } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [baptismFilter, setBaptismFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [parishFilter, setParishFilter] = useState('');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  /** The member whose record dialog is open; every row action opens it. */
  const [openRecord, setOpenRecord] = useState<ParishMember | null>(null);
  const { church } = useChurchIdentity();

  // The open record is a **deep link**: `/members/find?member=<id>` names the very file that is
  // open, so a refresh reopens it and a shared link opens it for a colleague. `getMember` re-reads
  // the record from the server by id, so the dialog holds the same data a click would have loaded.
  const { route, navigate } = useRouter();
  const deepLinkId = route.memberId;
  const openRecordRef = useRef<ParishMember | null>(null);
  openRecordRef.current = openRecord;
  useEffect(() => {
    if (!deepLinkId || openRecordRef.current?.id === deepLinkId) return;
    let cancelled = false;
    void getMember(deepLinkId)
      .then((member) => {
        if (!cancelled) setOpenRecord(member);
      })
      .catch(() => {
        // A record that will not open (deleted, or not this church's) must not wedge the URL:
        // drop the parameter so the register reads clean.
        if (!cancelled) navigate({ ...route, memberId: null }, true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkId]);

  /** Whatever the record dialog saved is written straight into the page it was opened from. */
  const handleRecordSaved = useCallback((updated: ParishMember) => {
    setMembers((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
  }, []);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<ListMembersQuery['sort']>('name');
  const [importing, setImporting] = useState(false);

  const { listMembers, getMember, isLoading, error } = useMembers();
  const { locations } = useLocations();

  /** Opening a record names it in the URL; closing clears the parameter without a history entry. */
  const openRecordFor = useCallback((member: ParishMember) => {
    setOpenRecord(member);
    navigate({ ...route, memberId: member.id }, true);
  }, [navigate, route]);
  const closeRecord = useCallback(() => {
    setOpenRecord(null);
    navigate({ ...route, memberId: null }, true);
  }, [navigate, route]);

  const [members, setMembers] = useState<ParishMember[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  const fetchMembers = useCallback(async () => {
    try {
      const query: ListMembersQuery = {
        q: searchTerm || undefined,
        status: statusFilter || undefined,
        baptismType: baptismFilter || undefined,
        location: parishFilter || undefined,
        page,
        pageSize,
        sort,
      };
      const response = await listMembers(query);
      setMembers(response.data);
      setTotal(response.meta.total);
      setPages(response.meta.pages);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  }, [listMembers, searchTerm, baptismFilter, statusFilter, parishFilter, page, pageSize, sort]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, baptismFilter, statusFilter, parishFilter, sort]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const renderRows = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={7} className="px-4 py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-[48px] text-[#C2410C] animate-spin">progress_activity</span>
              <p className="font-headline text-lg text-[#57534E]">Loading members…</p>
            </div>
          </td>
        </tr>
      );
    }
    if (error) {
      return (
        <tr>
          <td colSpan={7} className="px-4 py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-[48px] text-[#B91C1C]">error</span>
              <p className="font-headline text-lg text-[#B91C1C]">Failed to load members</p>
              <p className="font-body text-sm text-[#57534E]">{error}</p>
              <button
                type="button"
                onClick={fetchMembers}
                className="px-4 py-2 rounded-lg bg-[#C2410C] hover:bg-[#EA580C] text-white font-headline text-xs font-bold"
              >
                Retry
              </button>
            </div>
          </td>
        </tr>
      );
    }
    if (members.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="px-4">
            <EmptyState
              icon="person_search"
              title="No members match this view"
              description="Widen the search term, or clear the sacraments, standing and congregation filters."
            />
          </td>
        </tr>
      );
    }
    return members.map((member) => {
      return (
        <tr key={member.id} className="group transition-colors hover:bg-[#faf2ee]">
          <td className={`px-4 ${density === 'compact' ? 'py-2.5' : 'py-4'}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#ffdbd0] text-[#390c00] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                {member.initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-headline text-sm text-[#1e1b19] font-bold group-hover:text-[#9b2f00] transition-colors cursor-pointer truncate">
                  {member.name}
                </span>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#59413a]">
                  <span className="bg-[#f4ece8] px-1 rounded">{member.memberId}</span>
                  <span>•</span>
                  <span>{member.church}</span>
                </div>
              </div>
            </div>
          </td>
          <td className={`px-4 ${density === 'compact' ? 'py-2.5' : 'py-4'}`}>
            <div className="flex flex-col">
              <span className="font-headline text-xs text-[#1e1b19] font-bold flex items-center gap-1">
                <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#006243]">water_drop</span>
                {member.baptismLabel}
              </span>
              <span className="text-[#59413a] font-mono text-[11px]">
                {member.baptismDate || 'Jan 12, 2025'} • {member.baptismOfficiant || 'Bishop Sammy'}
              </span>
            </div>
          </td>
          <td className={`px-4 ${density === 'compact' ? 'py-2.5' : 'py-4'}`}>
            <div
              {...interactiveCard(() => onNavigateToFamilyUnit && onNavigateToFamilyUnit())}
              className="flex items-center gap-1.5 group/unit cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#fe932c]">home</span>
              <div className="flex flex-col">
                <span className="font-headline text-xs text-[#1e1b19] font-bold group-hover/unit:text-[#9b2f00] underline decoration-dotted">
                  {member.householdName ?? 'No household recorded'}
                </span>
                <span className="text-[#59413a] text-[11px]">
                  {member.householdUnitNumber
                    ? `${member.householdUnitNumber} (${member.householdRole ?? 'Member'})`
                    : 'Not yet linked to a household'}
                </span>
              </div>
            </div>
          </td>
          <td className={`px-4 ${density === 'compact' ? 'py-2.5' : 'py-4'}`}>
            <div className="flex flex-col">
              <span className="text-[#1e1b19] hover:text-[#9b2f00] cursor-pointer truncate font-medium">
                {member.email}
              </span>
              <div className="flex items-center gap-1 text-[#59413a] text-[11px] group/phone">
                <span>{member.phone}</span>
                <button
                  type="button"
                  className="opacity-0 group-hover/phone:opacity-100 text-[#9b2f00] cursor-pointer"
                  title="Open this member's record"
                  onClick={() => openRecordFor(member)}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[13px]">edit</span>
                </button>
              </div>
            </div>
          </td>
          <td className={`px-4 ${density === 'compact' ? 'py-2.5' : 'py-4'}`}>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#006243]/10 text-[#006243] font-headline text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006243] animate-pulse"></span>
              {member.statusLabel}
            </div>
          </td>
          <td className={`px-4 text-right whitespace-nowrap ${density === 'compact' ? 'py-2.5' : 'py-4'}`}>
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => openRecordFor(member)}
                className="p-1 rounded hover:bg-[#f4ece8] text-[#59413a] hover:text-[#9b2f00] transition-colors cursor-pointer"
                title="Open this member's record"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">clinical_notes</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateToFamilyUnit && onNavigateToFamilyUnit()}
                className="p-1 rounded hover:bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] transition-colors cursor-pointer"
                title="Manage Household"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">family_restroom</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectMemberForArchive && onSelectMemberForArchive(member)}
                className="p-1 rounded hover:bg-[#f4ece8] text-[#59413a] hover:text-[#ba1a1a] transition-colors cursor-pointer"
                title="Official Archival / Delete"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete_sweep</span>
              </button>
              <button
                type="button"
                onClick={() => openRecordFor(member)}
                className="p-1 rounded hover:bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] transition-colors cursor-pointer"
                title="Open this member's record"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">more_vert</span>
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="flex flex-col w-full gap-6 pb-12">
      {/* Top Metric Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Stat 1: Total Roll */}
        <div className="relative overflow-hidden rounded-xl bg-white p-4 shadow-sm border border-[#EAE1D7]/60 hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-[#9b2f00]/5 pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="font-headline text-xs font-semibold uppercase tracking-wider text-[#59413a]">
              Members Register Census
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#006243]/10 px-2 py-0.5 font-headline text-xs text-[#006243] font-bold">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">diversity_1</span>
              {roll.households} households
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold tracking-tight">
              {roll.total.toLocaleString()}
            </span>
            <span className="font-body text-xs text-[#59413a]">On the roll</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[#59413a] font-headline text-xs">
            <span>Membership Register Vol. I</span>
            <span className="text-[#9b2f00] font-bold">
              {shareOfRoll(roll.withBaptismRecord)}% with
              a baptism or dedication on file
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#f4ece8] overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-[#9b2f00]"
              style={{
                width: `${shareOfRoll(roll.withBaptismRecord)}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Stat 2: Members */}
        <div className="relative overflow-hidden rounded-xl bg-white p-4 shadow-sm border border-[#EAE1D7]/60 hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-[#fe932c]/10 pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="font-headline text-xs font-semibold uppercase tracking-wider text-[#59413a]">
              Members
            </span>
            <span className="inline-flex items-center rounded-md bg-[#f4ece8] px-2 py-0.5 font-mono text-xs text-[#904d00] font-bold">
              {shareOfRoll(roll.active)}% of the roll
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold tracking-tight">{roll.active}</span>
            <span className="font-body text-xs text-[#59413a]">Active on the roll</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[#59413a] font-headline text-xs">
            <span>Envelope numbers issued</span>
            <span className="text-[#006243] font-bold">
              {roll.envelopesIssued} of {roll.total}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#f4ece8] overflow-hidden">
            <div className="h-1.5 rounded-full bg-[#fe932c]" style={{ width: `${shareOfRoll(roll.active)}%` }}></div>
          </div>
        </div>

        {/* Stat 3: First Timers / Visitors */}
        <div className="relative overflow-hidden rounded-xl bg-white p-4 shadow-sm border border-[#EAE1D7]/60 hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-[#006243]/10 pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="font-headline text-xs font-semibold uppercase tracking-wider text-[#59413a]">
              First Timers & Visitors
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f4ece8] px-2 py-0.5 font-headline text-xs text-[#59413a] font-semibold">
              Discipleship Class
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold tracking-tight">
              {roll.awaitingRecord}
            </span>
            <span className="font-body text-xs text-[#59413a]">Under Instruction</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[#59413a] font-headline text-xs">
            <span>Share of the register</span>
            <span className="font-bold text-[#1e1b19]">{shareOfRoll(roll.awaitingRecord)}% of the roll</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#f4ece8] overflow-hidden">
            <div className="h-1.5 rounded-full bg-[#006243]" style={{ width: `${shareOfRoll(roll.awaitingRecord)}%` }}></div>
          </div>
        </div>

        {/* Stat 4: Youth & Children */}
        <div className="relative overflow-hidden rounded-xl bg-white p-4 shadow-sm border border-[#EAE1D7]/60 hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-[#ffdcc3]/40 pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="font-headline text-xs font-semibold uppercase tracking-wider text-[#59413a]">
              Youth & Children
            </span>
            <span className="inline-flex items-center rounded-md bg-[#ffdcc3]/60 px-2 py-0.5 font-headline text-xs text-[#2f1500] font-bold">
              Nursery – Gr 12
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold tracking-tight">{roll.youth}</span>
            <span className="font-body text-xs text-[#59413a]">On the youth roll</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[#59413a] font-headline text-xs">
            <span>Share of the register</span>
            <span className="text-[#9b2f00] font-bold">{shareOfRoll(roll.youth)}% of the roll</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#f4ece8] overflow-hidden">
            <div className="h-1.5 rounded-full bg-[#8d7168]" style={{ width: `${shareOfRoll(roll.youth)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main Search, Filtering & Tools Bar */}
      <div className="rounded-xl bg-white p-4 shadow-sm border border-[#EAE1D7]/60 flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[280px]">
            <span aria-hidden="true" className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-[#59413a]">
              search
            </span>
            <input aria-label="Search by name, member ID #, email, phone, or household"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, member ID #, email, phone, or household..."
              className="w-full h-11 pl-11 pr-10 rounded-lg bg-[#faf2ee] font-body text-sm text-[#1e1b19] placeholder:text-[#59413a]/60 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#9b2f00]/20 shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#59413a] hover:text-[#1e1b19]"
                title="Clear input"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">backspace</span>
              </button>
            )}
          </div>

          {/* Quick Filter Selects */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <div className="relative min-w-[155px] flex-1 sm:flex-initial">
              <select aria-label="Order of the register"
                value={sort}
                onChange={(e) => setSort(e.target.value as ListMembersQuery['sort'])}
                className="w-full h-11 pl-3 pr-8 rounded-lg bg-[#faf2ee] font-headline text-xs font-semibold text-[#1e1b19] cursor-pointer appearance-none focus:outline-none"
              >
                <option value="name">Name (A–Z)</option>
                <option value="recent">Newest on the roll</option>
                <option value="oldest">Longest on the roll</option>
              </select>
              <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#59413a]">
                expand_more
              </span>
            </div>

            <div className="relative min-w-[155px] flex-1 sm:flex-initial">
              <select aria-label="Baptism & sacraments filter"
                value={baptismFilter}
                onChange={(e) => setBaptismFilter(e.target.value)}
                className="w-full h-11 pl-3 pr-8 rounded-lg bg-[#faf2ee] font-headline text-xs font-semibold text-[#1e1b19] cursor-pointer appearance-none focus:outline-none"
              >
                <option value="">All Sacraments</option>
                <option value="baptized">Baptized (Believer)</option>
                <option value="dedicated">Child Dedication</option>
                <option value="none">Awaiting a Record</option>
              </select>
              <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#59413a]">
                expand_more
              </span>
            </div>

            <div className="relative min-w-[160px] flex-1 sm:flex-initial">
              <select aria-label="Standing on the register filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-11 pl-3 pr-8 rounded-lg bg-[#faf2ee] font-headline text-xs font-semibold text-[#1e1b19] cursor-pointer appearance-none focus:outline-none"
              >
                <option value="">All Standings</option>
                {(Object.entries(MEMBER_STATUS_LABELS) as [string, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#59413a]">
                expand_more
              </span>
            </div>

            <div className="relative min-w-[160px] flex-1 sm:flex-initial">
              <select aria-label="Church location filter"
                value={parishFilter}
                onChange={(e) => setParishFilter(e.target.value)}
                className="w-full h-11 pl-3 pr-8 rounded-lg bg-[#faf2ee] font-headline text-xs font-semibold text-[#1e1b19] cursor-pointer appearance-none focus:outline-none"
              >
                <option value="">All Churches</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#59413a]">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar Secondary Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="font-headline text-xs text-[#59413a]">View Density:</span>
            <div className="inline-flex rounded-lg bg-[#f4ece8] p-0.5 border border-[#e1bfb5]/40">
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-2.5 py-1 rounded font-headline text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  density === 'compact'
                    ? 'bg-white text-[#1e1b19] shadow-sm font-bold'
                    : 'text-[#59413a] hover:text-[#1e1b19]'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">density_small</span>
                <span>Compact</span>
              </button>
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                className={`px-2.5 py-1 rounded font-headline text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  density === 'comfortable'
                    ? 'bg-white text-[#1e1b19] shadow-sm font-bold'
                    : 'text-[#59413a] hover:text-[#1e1b19]'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">density_medium</span>
                <span>Comfortable</span>
              </button>
            </div>

            <span className="ml-2 hidden lg:inline-flex items-center gap-1 rounded-md bg-[#ffdcc3]/40 px-2 py-0.5 font-mono text-xs text-[#6e3900]">
              Showing: {church.name} roll
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-lg bg-[#faf2ee] shadow-sm border border-[#e1bfb5]/30">
              <button
                type="button"
                onClick={() =>
                  exportCsv('destiny-sanctuary-roll', MEMBER_COLUMNS, members)
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 hover:bg-[#f4ece8] font-headline text-xs font-semibold text-[#1e1b19] transition-colors rounded-l-lg cursor-pointer"
                title="Export current roll filtered view"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">download</span>
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="p-1.5 hover:bg-[#f4ece8] text-[#59413a] transition-colors rounded-r-lg border-l border-[#e1bfb5]/40 cursor-pointer"
                title="Print Baptism & Communion Register"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">print</span>
              </button>
            </div>

            {/* Bringing an existing register in is the same act as enrolling one person, so it needs
                the same right. */}
            {canEdit('members') && (
              <button
                type="button"
                onClick={() => setImporting(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#faf2ee] hover:bg-[#f4ece8] border border-[#e1bfb5]/40 font-headline text-xs font-semibold text-[#1e1b19] shadow-sm transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">upload_file</span>
                <span>Import</span>
              </button>
            )}

            {/* A viewer role may read the roll but not enrol anyone — ECCLESIA's `edit` action. */}
            {canEdit('members') && (
              <button
                type="button"
                onClick={onNavigateToAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#9b2f00] hover:bg-[#c2410c] text-white font-headline text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">person_add</span>
                <span>+ Add Christian</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="rounded-xl bg-white shadow-sm border border-[#EAE1D7]/60 overflow-hidden flex flex-col">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f1e9] font-headline text-xs font-semibold text-[#59413a] uppercase tracking-wider select-none border-b border-[#EAE1D7]">
                <th className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span>{sort === 'recent' ? 'Newest first' : sort === 'oldest' ? 'Longest on the roll first' : 'Member Name & ID (A–Z)'}</span>
                  </div>
                </th>
                <th className="px-4 py-3">Baptism & Sacraments</th>
                <th className="px-4 py-3">Household / Unit</th>
                <th className="px-4 py-3">Contact & Pastoral Care</th>
                <th className="px-4 py-3">Pastoral Status</th>
                <th className="px-4 py-3 text-right">Quick Actions</th>
              </tr>
            </thead>
<tbody className="divide-y divide-[#f4ece8] text-[#1e1b19] font-body text-xs">
              {renderRows()}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-[#f8f1e9] flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#EAE1D7]">
          <div className="flex items-center gap-2 text-[#59413a] font-headline text-xs font-semibold">
            <span>
              Showing <strong className="text-[#1e1b19]">
                {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
              </strong>{' '}
              of <strong className="text-[#1e1b19]">{total}</strong> congregants
            </span>
            <span className="text-[#8d7168]/40">•</span>
            <div className="flex items-center gap-1">
              <span>Per page:</span>
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="bg-white rounded px-2 py-0.5 font-bold text-[#1e1b19] border border-[#e1bfb5] focus:outline-none cursor-pointer"
              >
                <option value={8}>8</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 font-headline text-xs">
            <button
              type="button"
              disabled={page === 1}
              aria-label="Previous page"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 rounded-lg bg-white text-[#59413a] flex items-center justify-center shadow-sm disabled:opacity-50 border border-[#e1bfb5]/50 cursor-pointer disabled:cursor-not-allowed"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center shadow-sm ${
                  p === page
                    ? 'bg-[#9b2f00] text-white'
                    : 'bg-white text-[#1e1b19] hover:bg-[#f4ece8] border border-[#e1bfb5]/50'
                } cursor-pointer`}
              >
                {p}
              </button>
            ))}

            {pages > 5 && (
              <span className="px-1 text-[#59413a] font-bold">…</span>
            )}
            {pages > 5 && (
              <button
                type="button"
                onClick={() => setPage(pages)}
                className="w-8 h-8 rounded-lg bg-white text-[#1e1b19] hover:bg-[#f4ece8] font-bold flex items-center justify-center shadow-sm border border-[#e1bfb5]/50 cursor-pointer"
              >
                {pages}
              </button>
            )}
            <button
              type="button"
              disabled={page === pages}
              aria-label="Next page"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="w-8 h-8 rounded-lg bg-white text-[#1e1b19] hover:text-[#9b2f00] flex items-center justify-center shadow-sm disabled:opacity-50 border border-[#e1bfb5]/50 cursor-pointer disabled:cursor-not-allowed"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {openRecord && (
        <MemberRecordDialog
          member={openRecord}
          onClose={closeRecord}
          onSaved={handleRecordSaved}
        />
      )}

      {importing && (
        <ImportMembersDialog
          onClose={() => setImporting(false)}
          onImported={() => {
            // The census cards and the table are both reads of the register, so both are asked again.
            setPage(1);
            void fetchMembers();
          }}
        />
      )}
    </div>
  );
};
