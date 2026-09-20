import React, { useMemo, useState } from 'react';
import { useMinistryRoster, useMinistries } from '../../../hooks/useApi';
import { type MinistryMemberDto } from '../../../lib/api';
import { ErrorBlock, LoadingBlock, EmptyBlock } from '../DataState';
import { exportCsv } from '../../../lib/export';

/**
 * The volunteer roll: everybody serving on a ministry, read from the roster endpoint.
 *
 * The mock hardcoded five teams, an invented 248-person pool, fake swap requests and a fabricated
 * vetting percentage. What the API actually holds is the ministry roll — a person, the title they
 * hold, and the ministry they serve on — so the panel shows exactly that, with the same `serving`
 * total the backend counts. Service-time rosters (who is on duty *this Sunday*) live in
 * Services & Worship → Volunteer Roster, which is the schedule rather than the roll.
 */
export const MinistriesVolunteerPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMinistry, setSelectedMinistry] = useState('all');
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');

  const roster = useMinistryRoster({});
  const ministries = useMinistries({});

  const rows = useMemo(() => {
    const wanted = searchQuery.trim().toLowerCase();
    return roster.items.filter((row) => {
      const ministryName = row.ministry?.name ?? '';
      const person = row.member ? `${row.member.firstName} ${row.member.lastName}` : '';
      const matchesSearch =
        !wanted ||
        [row.roleTitle, ministryName, person].some((value) => value.toLowerCase().includes(wanted));
      return matchesSearch && (selectedMinistry === 'all' || row.ministry?.id === selectedMinistry);
    });
  }, [roster.items, searchQuery, selectedMinistry]);

  /** One column per ministry that has somebody on its roll, in the register's order. */
  const matrixMinistries = useMemo(() => {
    const ids: Array<{ id: string; name: string }> = [];
    for (const row of roster.items) {
      if (row.ministry && !ids.some((m) => m.id === row.ministry!.id)) {
        ids.push({ id: row.ministry.id, name: row.ministry.name });
      }
    }
    return ids;
  }, [roster.items]);

  const exportRoll = () => {
    exportCsv<MinistryMemberDto>(
      'volunteer-roles.csv',
      [
        { label: 'Member', value: (row) => `${row.member?.firstName ?? ''} ${row.member?.lastName ?? ''}`.trim() },
        { label: 'Role', value: (row) => row.roleTitle },
        { label: 'Ministry', value: (row) => row.ministry?.name ?? '' },
        { label: 'Phone', value: (row) => row.member?.phone ?? '' },
        { label: 'Joined', value: (row) => row.joinedAt.slice(0, 10) },
      ],
      rows,
    );
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {roster.loading && <LoadingBlock label="Reading the volunteer roll…" />}
      {roster.error && <ErrorBlock message={roster.error} onRetry={roster.refetch} />}

      {!roster.loading && !roster.error && (
        <>
          {/* Stat band — every figure is a count of the roll the table below shows. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80">
              <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Serving on rolls</span>
              <div className="font-headline text-3xl font-bold text-[#1e1b19] tracking-tight mt-3">{roster.serving}</div>
              <div className="text-[#59413a] text-xs mt-1">Total {roster.serving === 1 ? 'entry' : 'entries'} · the count the server keeps</div>
            </div>
            <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80">
              <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Distinct volunteers</span>
              <div className="font-headline text-3xl font-bold text-[#1e1b19] tracking-tight mt-3">
                {new Set(roster.items.map((row) => row.memberId)).size}
              </div>
              <div className="text-[#59413a] text-xs mt-1">People, some on more than one roll</div>
            </div>
            <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80">
              <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Ministries with a roll</span>
              <div className="font-headline text-3xl font-bold text-[#1e1b19] tracking-tight mt-3">{matrixMinistries.length}</div>
              <div className="text-[#59413a] text-xs mt-1">Of {ministries.items.length} on the register</div>
            </div>
            <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80">
              <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Who is on duty Sunday</span>
              <p className="text-xs text-[#59413a] leading-relaxed mt-3">
                The service-time roster is a schedule, not a roll — it lives in{' '}
                <span className="font-semibold text-[#1e1b19]">Services &amp; Worship → Volunteer Roster</span>.
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#EAE1D7] shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[240px]">
                <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-[#8d7168] text-[18px]">search</span>
                <input
                  aria-label="Search volunteer, role, or ministry"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search volunteer, role, or ministry..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#faf2ee] text-[#1e1b19] placeholder:text-[#8d7168] text-xs border border-[#EAE1D7] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#9b2f00]/20 transition-all"
                />
              </div>
              <div className="relative">
                <select
                  aria-label="Ministry filter"
                  value={selectedMinistry}
                  onChange={(e) => setSelectedMinistry(e.target.value)}
                  className="h-10 pl-3 pr-8 rounded-xl bg-[#faf2ee] text-[#1e1b19] text-xs font-medium border border-[#EAE1D7] outline-none appearance-none cursor-pointer hover:bg-[#f4ece8]"
                >
                  <option value="all">All ministries</option>
                  {ministries.items.map((ministry) => (
                    <option key={ministry.id} value={ministry.id}>{ministry.name}</option>
                  ))}
                </select>
                <span aria-hidden="true" className="material-symbols-outlined absolute right-2 top-2.5 text-[#8d7168] text-[18px] pointer-events-none">arrow_drop_down</span>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end shrink-0">
              <div className="flex items-center gap-1 bg-[#faf2ee] p-1 rounded-lg border border-[#EAE1D7]">
                <button
                  type="button"
                  onClick={() => setViewMode('matrix')}
                  aria-pressed={viewMode === 'matrix'}
                  title="By ministry"
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'matrix' ? 'bg-white text-[#9b2f00] shadow-xs' : 'text-[#59413a] hover:text-[#1e1b19]'}`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  title="As a list"
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-[#9b2f00] shadow-xs' : 'text-[#59413a] hover:text-[#1e1b19]'}`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">table_rows</span>
                </button>
              </div>
              <button
                type="button"
                onClick={exportRoll}
                disabled={rows.length === 0}
                className="h-10 px-3.5 rounded-xl bg-[#faf2ee] hover:bg-[#f4ece8] disabled:opacity-60 text-[#1e1b19] text-xs font-semibold flex items-center gap-1.5 border border-[#EAE1D7] transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#8d7168]">file_download</span>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Matrix: one column per ministry, one card per person on it. */}
          {viewMode === 'matrix' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {matrixMinistries.map((ministry) => {
                const onRoll = rows.filter((row) => row.ministry?.id === ministry.id);
                return (
                  <div key={ministry.id} className="bg-white rounded-2xl p-5 shadow-sm border border-[#EAE1D7]/80">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-headline text-sm font-bold text-[#1e1b19]">{ministry.name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-[#f4ece8] text-[#59413a] text-[10px] font-bold">
                        {onRoll.length}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {onRoll.map((row) => (
                        <li key={row.id} className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-[#f4ece8] text-[#9b2f00] shrink-0">
                            {row.member?.initials ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#1e1b19] truncate">
                              {`${row.member?.firstName ?? ''} ${row.member?.lastName ?? ''}`.trim() || 'Unknown'}
                            </p>
                            <p className="text-[11px] text-[#59413a] truncate">{row.roleTitle}</p>
                          </div>
                        </li>
                      ))}
                      {onRoll.length === 0 && (
                        <li className="text-[11px] text-[#59413a] py-2">Nobody on this roll yet.</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#faf2ee] text-[#59413a] text-xs font-semibold uppercase tracking-wider border-b border-[#EAE1D7]">
                      <th className="py-3 px-4">Volunteer</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Ministry</th>
                      <th className="py-3 px-4">Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE1D7] text-xs text-[#1e1b19]">
                    {rows.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-[#faf2ee]/70">
                        <td className="py-3 px-4 font-semibold">
                          {`${row.member?.firstName ?? ''} ${row.member?.lastName ?? ''}`.trim() || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-[#59413a]">{row.roleTitle}</td>
                        <td className="py-3 px-4 text-[#59413a]">{row.ministry?.name ?? '—'}</td>
                        <td className="py-3 px-4 font-mono text-[#59413a]">{row.joinedAt.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3.5 bg-[#faf2ee] border-t border-[#EAE1D7] text-xs text-[#59413a]">
                Showing <strong className="text-[#1e1b19] font-semibold">{rows.length}</strong> of{' '}
                <strong className="text-[#1e1b19] font-semibold">{roster.items.length}</strong> roll entries
              </div>
            </div>
          )}

          {rows.length === 0 && !searchQuery && selectedMinistry === 'all' && (
            <EmptyBlock
              icon="volunteer_activism"
              title="Nobody is on a ministry roll yet"
              hint="Add a person to a ministry from their own record in Find Christian — the roll fills from there."
            />
          )}
        </>
      )}
    </div>
  );
};
