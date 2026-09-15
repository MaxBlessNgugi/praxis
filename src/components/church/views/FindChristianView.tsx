import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ParishMember } from '../../../types';
import { LOCATIONS } from '../../../data/churchDomain';
import { useDialog } from '../dialog';
import { interactiveCard } from '../interactiveCard';
import { useDemoData } from '../../../data/demoStore';
import { usePermissions } from '../../../lib/permissions';
import { exportCsv } from '../../../lib/export';
import { EmptyState } from '../../ui';
import { useMembers, type ListMembersQuery } from '../../../lib/hooks/useMembers';
import { ApiError } from '../../../lib/api';
import { errorMessage } from '../../../hooks/useApi';
import { useChurchIdentity } from '../../../hooks/useChurchIdentity';
import { buildBaptismCertificate, buildDedicationCertificate, printDocument } from '../../../lib/documents';

/** The columns the register leaves the app as, matching ECCLESIA's export panels. */
const MEMBER_COLUMNS = [
  { label: 'Member ID', value: (m: ParishMember) => m.memberId },
  { label: 'Name', value: (m: ParishMember) => m.name },
  { label: 'Household', value: (m: ParishMember) => m.householdName },
  { label: 'Tier', value: (m: ParishMember) => m.membershipTier },
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
  const { memberStats } = useDemoData();
  const { canEdit } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [parishFilter, setParishFilter] = useState('');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCareModalMember, setActiveCareModalMember] = useState<ParishMember | null>(null);
  const activeCareModalMemberDialog = useDialog(() => setActiveCareModalMember(null), "Member Care Record");

  // Certificates are printed from the care record, using the same identity every screen reads.
  const { church } = useChurchIdentity();
  const [printingCertificate, setPrintingCertificate] = useState(false);
  const [certificateError, setCertificateError] = useState<string | null>(null);

  /**
   * Print the certificate this member's record calls for.
   *
   * Which document is right is decided by `baptismType`, not asked again — the register already
   * knows, and a clerk who has to choose between "baptism" and "dedication" for somebody recorded as
   * dedicated is being asked a question the system could answer.
   */
  const handlePrintCertificate = async (member: ParishMember) => {
    setPrintingCertificate(true);
    setCertificateError(null);
    try {
      const memberNumber = member.memberId.replace(/^#/, '');
      const html =
        member.baptismType === 'dedicated'
          ? buildDedicationCertificate({
              church,
              childName: member.name,
              parents: member.householdName || 'the parents',
              dedicationDate: member.baptismDate ?? null,
              officiant: member.baptismOfficiant ?? null,
              memberNumber,
              location: church.location,
            })
          : buildBaptismCertificate({
              church,
              fullName: member.name,
              baptismDate: member.baptismDate ?? null,
              officiant: member.baptismOfficiant ?? null,
              memberNumber,
              location: church.location,
            });
      await printDocument(html);
    } catch (cause) {
      setCertificateError(errorMessage(cause));
    } finally {
      setPrintingCertificate(false);
    }
  };
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<'name' | 'recent' | 'oldest'>('name');

  const { listMembers, isLoading, error } = useMembers();

  const [members, setMembers] = useState<ParishMember[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  const fetchMembers = useCallback(async () => {
    try {
      const query: ListMembersQuery = {
        q: searchTerm || undefined,
        status: statusFilter || undefined,
        baptismType: tierFilter === 'first-timer' ? 'none' : tierFilter === 'youth' ? 'dedicated' : undefined,
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
  }, [listMembers, searchTerm, tierFilter, statusFilter, parishFilter, page, pageSize, sort]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, tierFilter, statusFilter, parishFilter, sort]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(members.map((m) => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const renderRows = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={9} className="px-4 py-12 text-center">
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
          <td colSpan={9} className="px-4 py-12 text-center">
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
          <td colSpan={9} className="px-4">
            <EmptyState
              icon="person_search"
              title="No members match this view"
              description="Widen the search term, or clear the tier, status and location filters."
            />
          </td>
        </tr>
      );
    }
    return members.map((member) => {
      const isSelected = selectedIds.includes(member.id);
      return (
        <tr
          key={member.id}
          className={`group transition-colors ${
            isSelected
              ? 'bg-[#ffdbd0]/30'
              : member.pastoralStatus === 'homebound'
              ? 'bg-[#ffdcc3]/10 hover:bg-[#ffdcc3]/20'
              : 'hover:bg-[#faf2ee]'
          }`}
        >
          <td className={`px-4 text-center ${density === 'compact' ? 'py-2.5' : 'py-4'}`}>
            <input aria-label="Select member"
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggleRow(member.id)}
              className="w-4 h-4 rounded bg-white accent-[#9b2f00] cursor-pointer"
            />
          </td>
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
                  <span>{member.roleDescription || member.church}</span>
                </div>
              </div>
            </div>
          </td>
          <td className={`px-4 ${density === 'compact' ? 'py-2.5' : 'py-4'}`}>
            {member.membershipTier === 'member' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#c2410c] text-white font-headline text-xs font-semibold shadow-sm">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">verified</span> Member
              </span>
            )}
            {member.membershipTier === 'active-member' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#eee7e3] text-[#1e1b19] font-headline text-xs font-semibold border border-[#e1bfb5]/50">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">church</span> Active Member
              </span>
            )}
            {member.membershipTier === 'youth' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffdcc3] text-[#2f1500] font-headline text-xs font-semibold">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">school</span> Youth Discipleship Class
              </span>
            )}
            {member.membershipTier === 'first-timer' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f4ece8] text-[#59413a] font-headline text-xs font-semibold">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">help</span> First Timer / Visitor
              </span>
            )}
          </td>
          <td className={`px-4 ${density === 'compact' ? 'py-2.5' : 'py-4'}`}>
            <div className="flex flex-col">
              <span className="font-headline text-xs text-[#1e1b19] font-bold flex items-center gap-1">
                <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#006243]">water_drop</span>
                {member.baptismType === 'baptized' ? 'Baptized (Believer)' : member.baptismType === 'dedicated' ? 'Child Dedication' : 'Baptism & Communion Pending'}
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
                  {member.householdName}
                </span>
                <span className="text-[#59413a] text-[11px]">
                  {member.householdId} ({member.householdRole})
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
                  title="Quick Call or SMS"
                  onClick={() => alert(`Calling ${member.phone}`)}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[13px]">edit</span>
                </button>
              </div>
            </div>
          </td>
          <td className={`px-4 ${density === 'compact' ? 'py-2.5' : 'py-4'}`}>
            {member.pastoralStatus === 'homebound' ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#ffdcc3]/80 text-[#6e3900] font-headline text-xs font-bold border border-[#fe932c]/40">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-[#904d00]">local_hospital</span>
                Homebound Care
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#006243]/10 text-[#006243] font-headline text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006243] animate-pulse"></span>
                {member.statusLabel}
              </div>
            )}
          </td>
          <td className={`px-4 text-right whitespace-nowrap ${density === 'compact' ? 'py-2.5' : 'py-4'}`}>
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setActiveCareModalMember(member)}
                className="p-1 rounded hover:bg-[#f4ece8] text-[#59413a] hover:text-[#9b2f00] transition-colors cursor-pointer"
                title="View Care Log"
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
                onClick={() => alert(`Details for ${member.name}: Member ${member.memberId}, Envelope ${member.envelopeNumber || 'N/A'}`)}
                className="p-1 rounded hover:bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] transition-colors cursor-pointer"
                title="More Actions"
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
              {memberStats.households} households
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold tracking-tight">
              {memberStats.total.toLocaleString()}
            </span>
            <span className="font-body text-xs text-[#59413a]">On the roll</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[#59413a] font-headline text-xs">
            <span>Membership Register Vol. I</span>
            <span className="text-[#9b2f00] font-bold">
              {memberStats.total === 0 ? 0 : Math.round((memberStats.baptized / memberStats.total) * 100)}% with
              baptism on file
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#f4ece8] overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-[#9b2f00]"
              style={{
                width: `${memberStats.total === 0 ? 0 : Math.round((memberStats.baptized / memberStats.total) * 100)}%`,
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
              {memberStats.votingRatio}% ratio
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold tracking-tight">{memberStats.voting}</span>
            <span className="font-body text-xs text-[#59413a]">Full Voting Roll</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[#59413a] font-headline text-xs">
            <span>Envelope numbers issued</span>
            <span className="text-[#006243] font-bold">
              {members.filter((m) => m.envelopeNumber).length} of {memberStats.total}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#f4ece8] overflow-hidden">
            <div className="h-1.5 rounded-full bg-[#fe932c]" style={{ width: `${memberStats.votingRatio}%` }}></div>
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
              {memberStats.inquirers}
            </span>
            <span className="font-body text-xs text-[#59413a]">Under Instruction</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[#59413a] font-headline text-xs">
            <span>Next Membership Class</span>
            <span className="font-bold text-[#1e1b19]">Feb 13</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#f4ece8] overflow-hidden">
            <div className="h-1.5 rounded-full bg-[#006243]" style={{ width: `${memberStats.inquirerRatio}%` }}></div>
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
            <span className="font-headline text-3xl text-[#1e1b19] font-bold tracking-tight">{memberStats.youth}</span>
            <span className="font-body text-xs text-[#59413a]">On the youth roll</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[#59413a] font-headline text-xs">
            <span>Share of the register</span>
            <span className="text-[#9b2f00] font-bold">{memberStats.youthRatio}% of the roll</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#f4ece8] overflow-hidden">
            <div className="h-1.5 rounded-full bg-[#8d7168]" style={{ width: `${memberStats.youthRatio}%` }}></div>
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
              <select aria-label="Membership tier filter"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="w-full h-11 pl-3 pr-8 rounded-lg bg-[#faf2ee] font-headline text-xs font-semibold text-[#1e1b19] cursor-pointer appearance-none focus:outline-none"
              >
                <option value="">All Tiers</option>
                <option value="member">Member</option>
                <option value="active-member">Active Member</option>
                <option value="first-timer">First Timer / Visitor</option>
                <option value="youth">Youth / Discipleship Class</option>
              </select>
              <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#59413a]">
                expand_more
              </span>
            </div>

            <div className="relative min-w-[160px] flex-1 sm:flex-initial">
              <select aria-label="Pastoral status filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-11 pl-3 pr-8 rounded-lg bg-[#faf2ee] font-headline text-xs font-semibold text-[#1e1b19] cursor-pointer appearance-none focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Regular</option>
                <option value="care">Under Pastoral Care</option>
                <option value="homebound">Homebound / Convalescent</option>
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
                {LOCATIONS.map((location) => (
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
              Showing: Destiny Sanctuary Roll 2025
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#faf2ee] hover:bg-[#f4ece8] font-headline text-xs font-semibold text-[#1e1b19] transition-colors shadow-sm cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">view_column</span>
              <span>Columns (7/7)</span>
            </button>

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
        {/* Floating Batch Tray */}
        {selectedIds.length > 0 && (
          <div className="bg-[#e9e1dd] px-4 py-2.5 flex items-center justify-between transition-all border-b border-[#e1bfb5]">
            <div className="flex items-center gap-3 font-headline text-xs text-[#1e1b19]">
              <span className="font-bold text-[#9b2f00]">{selectedIds.length}</span> selected congregants
              <span className="text-[#8d7168]/40">|</span>
              <button
                type="button"
                onClick={() => setSelectedIds(members.map((m) => m.id))}
                className="text-[#9b2f00] hover:underline font-bold cursor-pointer"
              >
                Select all {members.length} on this page
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => alert(`Batch email composer initialized for ${selectedIds.length} members.`)}
                className="px-2.5 py-1 rounded bg-white text-[#1e1b19] font-headline text-xs font-semibold hover:bg-[#fff8f5] shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">mail</span> Batch Email
              </button>
              <button
                type="button"
                onClick={() => alert(`Printing nametags for ${selectedIds.length} members...`)}
                className="px-2.5 py-1 rounded bg-white text-[#1e1b19] font-headline text-xs font-semibold hover:bg-[#fff8f5] shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">label</span> Print Nametags
              </button>
              <button
                type="button"
                onClick={() => alert(`Marked attendance for ${selectedIds.length} selected believers.`)}
                className="px-2.5 py-1 rounded bg-white text-[#1e1b19] font-headline text-xs font-semibold hover:bg-[#fff8f5] shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">assignment_turned_in</span> Mark Attendance
              </button>
            </div>
          </div>
        )}

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f1e9] font-headline text-xs font-semibold text-[#59413a] uppercase tracking-wider select-none border-b border-[#EAE1D7]">
                <th className="w-12 px-4 py-3 text-center">
                  <input aria-label="Select all members"
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === members.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded bg-white border border-[#e1bfb5] accent-[#9b2f00] cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-[#1e1b19]">
                    <span>Member Name & ID</span>
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#9b2f00]">arrow_downward</span>
                  </div>
                </th>
                <th className="px-4 py-3">Membership Tier</th>
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

      {/* Quick Care Log View Modal */}
      {activeCareModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs" {...activeCareModalMemberDialog}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#EAE1D7] relative animate-in fade-in zoom-in duration-150">
            <button
              type="button"
              onClick={() => setActiveCareModalMember(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[#59413a] hover:bg-[#f4ece8] cursor-pointer"
           aria-label="Close">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#ffdbd0] text-[#390c00] flex items-center justify-center font-bold">
                {activeCareModalMember.initials}
              </div>
              <div>
                <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                  {activeCareModalMember.name}
                </h3>
                <span className="text-xs text-[#59413a] font-mono">{activeCareModalMember.memberId}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#faf2ee] rounded-lg">
                <span className="font-bold text-[#1e1b19] block mb-1">Pastoral Triage & Notes:</span>
                <p className="text-[#59413a] leading-relaxed">
                  {activeCareModalMember.pastoralNotes || 'Active member in good standing. Assigned to Elder Circle #4 for quarterly pastoral communion visitation.'}
                </p>
              </div>
              <div className="flex items-center justify-between text-[#59413a]">
                <span>Membership Date:</span>
                <span className="font-bold text-[#1e1b19]">{activeCareModalMember.baptismDate || 'Jan 12, 2025'}</span>
              </div>
              <div className="flex items-center justify-between text-[#59413a]">
                <span>Household Unit:</span>
                <span className="font-bold text-[#1e1b19]">{activeCareModalMember.householdName}</span>
              </div>
            </div>

            {certificateError && (
              <p role="alert" className="mt-4 text-[11px] font-semibold text-[#B91C1C]">
                {certificateError}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void handlePrintCertificate(activeCareModalMember)}
                disabled={printingCertificate}
                className="px-4 py-2 rounded-lg border border-[#EAE1D7] bg-[#faf2ee] hover:bg-[#f4ece8] text-[#9b2f00] font-headline text-xs font-bold shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-wait transition-colors"
              >
                {printingCertificate
                  ? 'Preparing…'
                  : activeCareModalMember.baptismType === 'dedicated'
                    ? 'Print Dedication Certificate'
                    : 'Print Baptism Certificate'}
              </button>
              <button
                type="button"
                onClick={() => setActiveCareModalMember(null)}
                className="px-4 py-2 rounded-lg bg-[#9b2f00] text-white font-headline text-xs font-bold shadow-sm cursor-pointer"
              >
                Close Care Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
