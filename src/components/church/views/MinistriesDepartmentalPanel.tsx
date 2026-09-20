import React, { useMemo, useState } from 'react';
import { useMinistries, useMemberOptions } from '../../../hooks/useApi';
import { ministriesApi } from '../../../lib/api';
import { usePermissions } from '../../../lib/permissions';
import { useDialog } from '../dialog';
import { ErrorBlock, LoadingBlock, EmptyBlock } from '../DataState';

/**
 * The departments register: every ministry the church has chartered, read from the API.
 *
 * Where the mock invented budgets, vetting percentages and campus selectors, the live panel shows
 * what the database actually holds — the ministry, its description, where and when it meets, its
 * leader, and how many people serve on its roll. The "Add Department" drawer creates a real
 * ministry, and a member's own record (Members → Find Christian) is where somebody joins a roll,
 * so this panel stays a register rather than growing a second membership editor.
 */
export const MinistriesDepartmentalPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFormat, setViewFormat] = useState<'grid' | 'list'>('grid');
  const [showRetired, setShowRetired] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerOpenDialog = useDialog(() => setIsDrawerOpen(false), 'New Department Charter');
  const { canEdit } = usePermissions();

  const ministries = useMinistries({});
  const leaders = useMemberOptions();

  const departments = useMemo(() => {
    const rows = ministries.items;
    const wanted = searchQuery.trim().toLowerCase();
    const searched = wanted
      ? rows.filter((d) => {
          const leader = d.leader ? `${d.leader.firstName} ${d.leader.lastName}` : '';
          return (
            d.name.toLowerCase().includes(wanted) ||
            (d.description ?? '').toLowerCase().includes(wanted) ||
            leader.toLowerCase().includes(wanted)
          );
        })
      : rows;
    // The seed's active ministries are the council's working list; retired ones stay reachable
    // through the toggle rather than vanishing, because a roll that once met still happened.
    return showRetired ? searched : searched.filter((d) => d.isActive);
  }, [ministries.items, searchQuery, showRetired]);

  const servingTotal = departments.reduce((total, dept) => total + (dept._count?.members ?? 0), 0);
  const activeCount = ministries.items.filter((d) => d.isActive).length;

  // Form state
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDescription, setNewDeptDescription] = useState('');
  const [newDeptLocation, setNewDeptLocation] = useState('');
  const [newDeptMeetingDay, setNewDeptMeetingDay] = useState('');
  const [newDeptLeader, setNewDeptLeader] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const createDepartment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newDeptName.trim() || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      await ministriesApi.create({
        name: newDeptName.trim(),
        ...(newDeptDescription.trim() ? { description: newDeptDescription.trim() } : {}),
        ...(newDeptLocation.trim() ? { location: newDeptLocation.trim() } : {}),
        ...(newDeptMeetingDay.trim() ? { meetingDay: newDeptMeetingDay.trim() } : {}),
        ...(newDeptLeader ? { leaderId: newDeptLeader } : {}),
      });
      setIsDrawerOpen(false);
      setNewDeptName('');
      setNewDeptDescription('');
      setNewDeptLocation('');
      setNewDeptMeetingDay('');
      setNewDeptLeader('');
      void ministries.refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'The department could not be chartered.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {ministries.loading && <LoadingBlock label="Reading the departments register…" />}
      {ministries.error && <ErrorBlock message={ministries.error} onRetry={ministries.refetch} />}

      {/* KPI band — derived from the register, so the cards and the count cannot disagree. */}
      {!ministries.loading && !ministries.error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7]/80">
            <span className="font-headline text-xs text-[#59413a] uppercase tracking-wider font-semibold">Chartered departments</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-[#1e1b19]">{activeCount}</span>
              <span className="font-headline text-sm text-[#9b2f00] font-semibold">Active</span>
            </div>
            <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
              {ministries.items.length - activeCount} retired · kept on the register
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7]/80">
            <span className="font-headline text-xs text-[#59413a] uppercase tracking-wider font-semibold">Serving on rolls</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-[#1e1b19]">{servingTotal}</span>
              <span className="font-headline text-sm text-[#59413a]">People</span>
            </div>
            <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
              Across {departments.length} shown departments
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7]/80 lg:col-span-2">
            <span className="font-headline text-xs text-[#59413a] uppercase tracking-wider font-semibold">About this register</span>
            <p className="mt-3 text-xs text-[#59413a] leading-relaxed">
              Every department and fellowship the council has chartered, with the leader responsible for it and the roll
              of people serving. Membership is added from a person's own record — open them in{' '}
              <span className="font-semibold text-[#1e1b19]">Find Christian</span> and add the ministry there.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-[#faf2ee] p-3.5 rounded-2xl border border-[#EAE1D7] flex flex-col lg:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full lg:w-96">
          <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-[#8d7168] text-[20px]">manage_search</span>
          <input
            aria-label="Search department name, leader, or description"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search department name, leader, or description..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white text-[#1e1b19] placeholder:text-[#8d7168] text-xs border border-[#EAE1D7] focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end w-full lg:w-auto gap-2">
          <label className="h-10 px-3.5 rounded-xl bg-white text-[#1e1b19] text-xs font-semibold flex items-center gap-2 border border-[#EAE1D7] cursor-pointer">
            <input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} className="accent-[#9b2f00]" />
            <span>Show retired</span>
          </label>
          {canEdit('groups') && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              type="button"
              className="h-10 px-4 rounded-xl bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">add_business</span>
              <span>Add New Department</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-[#59413a]">
          Viewing {departments.length} of {ministries.items.length} registered ministries
        </span>
        <div className="flex items-center gap-1 bg-[#faf2ee] p-1 rounded-lg border border-[#EAE1D7]">
          <button
            onClick={() => setViewFormat('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewFormat === 'grid' ? 'bg-white text-[#9b2f00] shadow-xs' : 'text-[#59413a] hover:text-[#1e1b19]'}`}
            title="Grid View"
            aria-pressed={viewFormat === 'grid'}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">grid_view</span>
          </button>
          <button
            onClick={() => setViewFormat('list')}
            className={`p-1.5 rounded-md transition-colors ${viewFormat === 'list' ? 'bg-white text-[#9b2f00] shadow-xs' : 'text-[#59413a] hover:text-[#1e1b19]'}`}
            title="List View"
            aria-pressed={viewFormat === 'list'}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">table_rows</span>
          </button>
        </div>
      </div>

      {/* Department cards */}
      <div className={viewFormat === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'flex flex-col gap-3'}>
        {departments.map((dept) => {
          const leaderName = dept.leader ? `${dept.leader.firstName} ${dept.leader.lastName}` : null;
          return (
            <div key={dept.id} className="bg-white rounded-2xl p-5 shadow-sm border border-[#EAE1D7]/80 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${dept.isActive ? 'bg-[#85f8c4]/30 text-[#005137]' : 'bg-[#EAE1D7] text-[#59413a]'}`}>
                        {dept.isActive ? 'Active' : 'Retired'}
                      </span>
                    </div>
                    <h3 className="font-headline text-base font-bold text-[#1e1b19] mt-0.5">{dept.name}</h3>
                    {dept.description && <p className="text-xs text-[#59413a] mt-0.5">{dept.description}</p>}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-[#faf2ee] rounded-xl space-y-2 border border-[#EAE1D7]/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#59413a] flex items-center gap-1.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#9b2f00]">groups</span>
                      Serving on the roll
                    </span>
                    <span className="font-headline text-sm font-bold text-[#1e1b19]">{dept._count?.members ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-[#EAE1D7]">
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#9b2f00]">badge</span>
                    <p className="text-xs font-semibold text-[#1e1b19] truncate">
                      {leaderName ?? <span className="text-[#59413a] font-normal">No leader appointed</span>}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-[#59413a]">
                  {dept.meetingDay && (
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#8d7168]">schedule</span>
                      <span className="truncate">Meets {dept.meetingDay}</span>
                    </div>
                  )}
                  {dept.location && (
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#8d7168]">place</span>
                      <span className="truncate">{dept.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {departments.length === 0 && !ministries.loading && (
        <div className="bg-white rounded-2xl p-10 text-center space-y-3 border border-[#EAE1D7]">
          <EmptyBlock
            icon={searchQuery ? 'search_off' : 'groups'}
            title={searchQuery ? 'No ministries match your query' : 'No departments chartered yet'}
            hint={
              searchQuery
                ? 'Try clearing search terms or verifying spelling.'
                : 'Charter the first department and its roll can start filling from the register.'
            }
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="inline-flex items-center gap-1 text-[#9b2f00] text-xs font-bold hover:underline">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Creation drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs" {...drawerOpenDialog}>
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EAE1D7]">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[24px]">domain_add</span>
                  <h2 className="font-headline text-lg font-bold text-[#1e1b19]">New Department Charter</h2>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 rounded-lg text-[#59413a] hover:bg-[#f4ece8] transition-colors" aria-label="Close">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form className="mt-5 space-y-4" onSubmit={createDepartment}>
                <div>
                  <label htmlFor="ministry-name" className="block text-xs font-semibold text-[#1e1b19] mb-1">Ministry Name *</label>
                  <input
                    id="ministry-name"
                    aria-label="Ministry Name"
                    type="text"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="e.g. Media & Sacred Arts"
                    required
                    className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                  />
                </div>

                <div>
                  <label htmlFor="ministry-description" className="block text-xs font-semibold text-[#1e1b19] mb-1">Description</label>
                  <input
                    id="ministry-description"
                    aria-label="Ministry Description"
                    type="text"
                    value={newDeptDescription}
                    onChange={(e) => setNewDeptDescription(e.target.value)}
                    placeholder="What this department exists to do"
                    className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                  />
                </div>

                <div>
                  <label htmlFor="ministry-leader" className="block text-xs font-semibold text-[#1e1b19] mb-1">Leader</label>
                  <select
                    id="ministry-leader"
                    aria-label="Leader"
                    value={newDeptLeader}
                    onChange={(e) => setNewDeptLeader(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="">Appoint later…</option>
                    {leaders.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ministry-location" className="block text-xs font-semibold text-[#1e1b19] mb-1">Meets at</label>
                    <input
                      id="ministry-location"
                      aria-label="Meeting location"
                      type="text"
                      value={newDeptLocation}
                      onChange={(e) => setNewDeptLocation(e.target.value)}
                      placeholder="e.g. Main Sanctuary"
                      className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="ministry-day" className="block text-xs font-semibold text-[#1e1b19] mb-1">Meeting day</label>
                    <input
                      id="ministry-day"
                      aria-label="Meeting day"
                      type="text"
                      value={newDeptMeetingDay}
                      onChange={(e) => setNewDeptMeetingDay(e.target.value)}
                      placeholder="e.g. Tuesdays"
                      className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                    />
                  </div>
                </div>

                {formError && <ErrorBlock message={formError} />}

                <div className="pt-4 border-t border-[#EAE1D7] flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-[#59413a] hover:bg-[#f4ece8] transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !newDeptName.trim()}
                    className="px-5 py-2 rounded-xl bg-[#9b2f00] hover:bg-[#c2410c] disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    {saving ? 'Chartering…' : 'Create Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
