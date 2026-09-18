import React, { useMemo, useState } from 'react';
import { useMinistryRoster, useMinistries } from '../../../hooks/useApi';
import { type MinistryMemberDto } from '../../../lib/api';
import { usePermissions } from '../../../lib/permissions';
import { ErrorBlock, LoadingBlock, EmptyBlock } from '../DataState';
import { exportCsv } from '../../../lib/export';

/**
 * The leadership roll: who leads what, read from the ministry roster with `leadershipOnly`.
 *
 * The mock invented nine fixed leaders with perpetual tenures and a fabricated ratification banner.
 * The live panel reads the same roll the Volunteer Roles panel reads — filtered to leadership — so
 * the two panels cannot disagree about who holds which office, and every row is a real person on a
 * real ministry.
 */
export const MinistriesLeadershipPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const { canEdit } = usePermissions();

  const roster = useMinistryRoster({ leadershipOnly: true });
  const ministries = useMinistries({});

  const rows = useMemo(() => {
    const wanted = searchQuery.trim().toLowerCase();
    return roster.items.filter((row) => {
      const ministryName = row.ministry?.name ?? '';
      const person = row.member ? `${row.member.firstName} ${row.member.lastName}` : '';
      const matchesSearch =
        !wanted ||
        [row.roleTitle, ministryName, person].some((value) => value.toLowerCase().includes(wanted));
      return matchesSearch && (selectedDept === 'all' || row.ministry?.id === selectedDept);
    });
  }, [roster.items, searchQuery, selectedDept]);

  const exportLeaders = () => {
    exportCsv<MinistryMemberDto>(
      'leadership-roles.csv',
      [
        { label: 'Member', value: (row) => `${row.member?.firstName ?? ''} ${row.member?.lastName ?? ''}`.trim() },
        { label: 'Role', value: (row) => row.roleTitle },
        { label: 'Ministry', value: (row) => row.ministry?.name ?? '' },
        { label: 'Joined', value: (row) => row.joinedAt.slice(0, 10) },
      ],
      rows,
    );
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {roster.loading && <LoadingBlock label="Reading the leadership roll…" />}
      {roster.error && <ErrorBlock message={roster.error} onRetry={roster.refetch} />}

      {!roster.loading && !roster.error && (
        <>
          {/* Stat band, derived from the roll so it cannot disagree with the table. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80">
              <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Leadership roles</span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-headline text-3xl font-bold text-[#1e1b19] tracking-tight">{roster.items.length}</span>
                <span className="text-xs text-[#59413a]">filled on the roll</span>
              </div>
              <div className="mt-3 pt-2 border-t border-[#f4ece8] text-[#59413a] text-xs">
                Across {ministries.items.filter((m) => m.isActive).length} active departments
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80">
              <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Distinct members serving</span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-headline text-3xl font-bold text-[#1e1b19] tracking-tight">
                  {new Set(roster.items.map((row) => row.memberId)).size}
                </span>
                <span className="text-xs text-[#59413a]">people</span>
              </div>
              <div className="mt-3 pt-2 border-t border-[#f4ece8] text-[#59413a] text-xs">
                One person may hold more than one office
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80">
              <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Departments with a leader</span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-headline text-3xl font-bold text-[#1e1b19] tracking-tight">
                  {new Set(roster.items.map((row) => row.ministryId)).size}
                </span>
                <span className="text-xs text-[#59413a]">of the register</span>
              </div>
              <div className="mt-3 pt-2 border-t border-[#f4ece8] text-[#59413a] text-xs">
                Appointments are made from a member's own record
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80">
              <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">The roll itself</span>
              <p className="mt-3 text-xs text-[#59413a] leading-relaxed">
                This panel and Volunteer Roles read the same ministry roll — one filtered to leadership — so the two
                cannot tell different stories about an office.
              </p>
            </div>
          </div>

          {/* Filter bar */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#EAE1D7] shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[240px]">
                <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-[#8d7168] text-[18px]">search</span>
                <input
                  aria-label="Search role, ministry, or person"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search role, ministry, or person..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#faf2ee] text-[#1e1b19] placeholder:text-[#8d7168] text-xs border border-[#EAE1D7] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#9b2f00]/20 transition-all"
                />
              </div>
              <div className="relative">
                <select
                  aria-label="Ministry filter"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="h-10 pl-3 pr-8 rounded-xl bg-[#faf2ee] text-[#1e1b19] text-xs font-medium border border-[#EAE1D7] outline-none appearance-none cursor-pointer hover:bg-[#f4ece8]"
                >
                  <option value="all">All councils &amp; ministries</option>
                  {ministries.items.map((ministry) => (
                    <option key={ministry.id} value={ministry.id}>{ministry.name}</option>
                  ))}
                </select>
                <span aria-hidden="true" className="material-symbols-outlined absolute right-2 top-2.5 text-[#8d7168] text-[18px] pointer-events-none">arrow_drop_down</span>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end shrink-0">
              <button
                type="button"
                onClick={exportLeaders}
                disabled={rows.length === 0}
                className="h-10 px-3.5 rounded-xl bg-[#faf2ee] hover:bg-[#f4ece8] disabled:opacity-60 text-[#1e1b19] text-xs font-semibold flex items-center gap-1.5 border border-[#EAE1D7] transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#8d7168]">file_download</span>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Roster table */}
          <div className="w-full bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#faf2ee] text-[#59413a] text-xs font-semibold uppercase tracking-wider border-b border-[#EAE1D7]">
                    <th className="py-3 px-4">Role Title</th>
                    <th className="py-3 px-4">Ministry</th>
                    <th className="py-3 px-4">Serving Person</th>
                    <th className="py-3 px-4">On the roll since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE1D7] text-xs text-[#1e1b19]">
                  {rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-[#faf2ee]/70">
                      <td className="py-3.5 px-4 font-headline font-semibold text-[#1e1b19]">{row.roleTitle}</td>
                      <td className="py-3.5 px-4 text-[#59413a]">{row.ministry?.name ?? '—'}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-[#f4ece8] text-[#9b2f00] shrink-0">
                            {row.member?.initials ?? '?'}
                          </div>
                          <span className="font-semibold">{`${row.member?.firstName ?? ''} ${row.member?.lastName ?? ''}`.trim() || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#59413a]">{row.joinedAt.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3.5 bg-[#faf2ee] flex items-center gap-2 border-t border-[#EAE1D7] text-xs text-[#59413a]">
              {rows.length === 0 ? (
                <span>No leadership roles match the current filters</span>
              ) : (
                <span>Showing <strong className="text-[#1e1b19] font-semibold">{rows.length}</strong> of <strong className="text-[#1e1b19] font-semibold">{roster.items.length}</strong> leadership roles</span>
              )}
            </div>
          </div>

          {rows.length === 0 && !searchQuery && selectedDept === 'all' && (
            <EmptyBlock
              icon="military_tech"
              title="No leadership roles recorded yet"
              hint="Appoint someone to lead a ministry from their own record in Find Christian — the roll fills from there."
            />
          )}

          {!canEdit('groups') && (
            <p className="text-[11px] text-[#57534E]">
              You can read the roll but your role does not include changing it; appointments are made from a member's record.
            </p>
          )}
        </>
      )}
    </div>
  );
};
