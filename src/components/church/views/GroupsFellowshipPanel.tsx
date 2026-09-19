import React, { useMemo, useState } from 'react';
import { errorMessage, useGroupDetail, useGroups, useMemberOptions } from '../../../hooks/useApi';
import { groupsApi } from '../../../lib/api';
import { usePermissions } from '../../../lib/permissions';
import { useDialog } from '../dialog';
import { ErrorBlock, EmptyBlock, LoadingBlock } from '../DataState';

/**
 * The fellowships that meet midweek.
 *
 * A department is who *serves*; a group is who *belongs*. The roll and the leader look alike, but
 * the datum a cell leader reports is the **meeting** — when the circle gathered and how many came —
 * so that act gets its own form beside the roll, not a buried menu.
 */

interface GroupDraft {
  name: string;
  description: string;
  meetingDay: string;
  location: string;
  leaderId: string;
}

const EMPTY_DRAFT: GroupDraft = { name: '', description: '', meetingDay: '', location: '', leaderId: '' };

const MEETING_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function GroupsFellowshipPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showRetired, setShowRetired] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerOpenDialog = useDialog(() => setIsDrawerOpen(false), 'Convene a New Fellowship');
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [rollError, setRollError] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('');
  const [meetingForm, setMeetingForm] = useState({ metAt: '', hostName: '', attendedCount: '0' });
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const { canEdit } = usePermissions();

  const groups = useGroups({});
  const leaders = useMemberOptions();
  // The list endpoint carries counts only; the roll and the meeting record live on the detail read,
  // so an open circle is rendered from its own record — one fetch, and it can never show a stale roll.
  const openDetail = useGroupDetail(openGroupId);
  const openGroup = useMemo(
    () => (openGroupId ? openDetail.data?.data ?? groups.items.find((g) => g.id === openGroupId) : null),
    [openGroupId, openDetail.data, groups.items],
  );

  const visible = useMemo(() => {
    const wanted = searchQuery.trim().toLowerCase();
    const searched = wanted
      ? groups.items.filter((g) => {
          const leader = g.leader ? `${g.leader.firstName} ${g.leader.lastName}` : '';
          return g.name.toLowerCase().includes(wanted) || (g.description ?? '').toLowerCase().includes(wanted) || leader.toLowerCase().includes(wanted);
        })
      : groups.items;
    return showRetired ? searched : searched.filter((g) => g.isActive);
  }, [groups.items, searchQuery, showRetired]);

  const belongingTotal = visible.reduce((total, g) => total + (g._count?.members ?? 0), 0);
  const activeCount = groups.items.filter((g) => g.isActive).length;

  // Form state
  const [draft, setDraft] = useState<GroupDraft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const createGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      await groupsApi.create({
        name: draft.name.trim(),
        ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
        ...(draft.location.trim() ? { location: draft.location.trim() } : {}),
        ...(draft.meetingDay.trim() ? { meetingDay: draft.meetingDay.trim() } : {}),
        ...(draft.leaderId ? { leaderId: draft.leaderId } : {}),
      });
      setIsDrawerOpen(false);
      setDraft(EMPTY_DRAFT);
      void groups.refetch();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const joinGroup = async (groupId: string, memberId: string, roleTitle: string) => {
    setRollError(null);
    try {
      await groupsApi.addMember(groupId, { memberId, ...(roleTitle.trim() ? { roleTitle: roleTitle.trim() } : {}) });
      setNewRole('');
      void groups.refetch();
    } catch (err) {
      setRollError(errorMessage(err));
    }
  };

  const leaveGroup = async (memberRowId: string) => {
    setRollError(null);
    try {
      await groupsApi.removeMember(memberRowId);
      void groups.refetch();
    } catch (err) {
      setRollError(errorMessage(err));
    }
  };

  const retireGroup = async (groupId: string) => {
    setRollError(null);
    try {
      await groupsApi.retire(groupId, { reason: 'other', reasonLabel: 'Fellowship concluded' });
      setOpenGroupId(null);
      void groups.refetch();
    } catch (err) {
      setRollError(errorMessage(err));
    }
  };

  const recordMeeting = async (groupId: string) => {
    setMeetingError(null);
    if (!meetingForm.metAt) {
      setMeetingError('Say when the group met.');
      return;
    }
    try {
      await groupsApi.recordMeeting(groupId, {
        metAt: new Date(`${meetingForm.metAt}T12:00:00`).toISOString(),
        ...(meetingForm.hostName.trim() ? { hostName: meetingForm.hostName.trim() } : {}),
        attendedCount: Math.max(0, Number.parseInt(meetingForm.attendedCount, 10) || 0),
      });
      setMeetingForm({ metAt: '', hostName: '', attendedCount: '0' });
      void groups.refetch();
    } catch (err) {
      setMeetingError(errorMessage(err));
    }
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {groups.loading && <LoadingBlock label="Reading the fellowships register…" />}
      {groups.error && <ErrorBlock message={groups.error} onRetry={groups.refetch} />}

      {!groups.loading && !groups.error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7]/80">
            <span className="font-headline text-xs text-[#59413a] uppercase tracking-wider font-semibold">Meeting fellowships</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-[#1e1b19]">{activeCount}</span>
              <span className="font-headline text-sm text-[#9b2f00] font-semibold">Active</span>
            </div>
            <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
              {groups.items.length - activeCount} retired · kept on the register
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7]/80">
            <span className="font-headline text-xs text-[#59413a] uppercase tracking-wider font-semibold">Belonging to a circle</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-[#1e1b19]">{belongingTotal}</span>
              <span className="font-headline text-sm text-[#59413a]">People</span>
            </div>
            <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">Across {visible.length} shown groups</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7]/80 lg:col-span-2">
            <span className="font-headline text-xs text-[#59413a] uppercase tracking-wider font-semibold">About this register</span>
            <p className="mt-3 text-xs text-[#59413a] leading-relaxed">
              A department is who <span className="font-semibold text-[#1e1b19]">serves</span>; a fellowship is who{' '}
              <span className="font-semibold text-[#1e1b19]">belongs</span>. Open a circle below to keep its roll and to
              record each gathering with the number that came.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-[#faf2ee] p-3.5 rounded-2xl border border-[#EAE1D7] flex flex-col lg:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full lg:w-96">
          <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-[#8d7168] text-[20px]">manage_search</span>
          <input
            aria-label="Search fellowship name, leader, or description"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fellowship name, leader, or description..."
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
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">group_add</span>
              <span>Convene a Fellowship</span>
            </button>
          )}
        </div>
      </div>

      {rollError && <ErrorBlock message={rollError} onRetry={() => setRollError(null)} />}

      {/* Group cards */}
      {!groups.loading && !groups.error && visible.length === 0 && (
        <EmptyBlock
          title="No fellowships yet"
          hint="Cell groups, fellowship circles and youth chapters live here. Convene the first one to begin keeping rolls and meeting records."
          icon="groups_2"
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((group) => {
          const leaderName = group.leader ? `${group.leader.firstName} ${group.leader.lastName}` : null;
          const isOpen = openGroupId === group.id;
          return (
            <div key={group.id} className="bg-white rounded-2xl p-5 shadow-sm border border-[#EAE1D7]/80 hover:shadow-md transition-all flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${group.isActive ? 'bg-[#85f8c4]/30 text-[#005137]' : 'bg-[#EAE1D7] text-[#59413a]'}`}>
                    {group.isActive ? 'Active' : 'Retired'}
                  </span>
                  <h3 className="font-headline text-base font-bold text-[#1e1b19] mt-0.5">{group.name}</h3>
                  {group.description && <p className="text-xs text-[#59413a] mt-0.5">{group.description}</p>}
                </div>
              </div>

              <div className="mt-4 p-3 bg-[#faf2ee] rounded-xl space-y-2 border border-[#EAE1D7]/60 text-xs text-[#59413a]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">person</span>
                    Leader
                  </span>
                  <span className="font-semibold text-[#1e1b19]">{leaderName ?? 'Not named yet'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">event_repeat</span>
                    Meets
                  </span>
                  <span className="font-semibold text-[#1e1b19]">{group.meetingDay ?? 'Unfixed'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">groups</span>
                    On the roll
                  </span>
                  <span className="font-semibold text-[#1e1b19]">{group._count?.members ?? 0}</span>
                </div>
                {group.location && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">location_on</span>
                      Where
                    </span>
                    <span className="font-semibold text-[#1e1b19] truncate max-w-[55%]" title={group.location}>{group.location}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setOpenGroupId(isOpen ? null : group.id)}
                aria-expanded={isOpen}
                className="mt-4 h-9 px-3 rounded-xl bg-white border border-[#EAE1D7] text-xs font-semibold text-[#1e1b19] hover:bg-[#f4ece8] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">{isOpen ? 'unfold_less' : 'unfold_more'}</span>
                {isOpen ? 'Close the circle' : 'Open the circle'}
              </button>

              {isOpen && (
                <div className="mt-4 space-y-4 border-t border-[#f4ece8] pt-4">
                  {/* Roll */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#59413a] mb-2">The roll</p>
                    {openDetail.loading && <p className="text-xs text-[#8d7168]">Opening the roll…</p>}
                    {!openDetail.loading && (openGroup?.members ?? []).length === 0 && <p className="text-xs text-[#8d7168]">Nobody belongs yet.</p>}
                    <ul className="space-y-1.5">
                      {(openGroup?.members ?? []).map((row) => (
                        <li key={row.id} className="flex items-center justify-between text-xs gap-2">
                          <span className="text-[#1e1b19] font-medium truncate">
                            {row.member.firstName} {row.member.lastName}
                            <span className="text-[#8d7168] font-normal"> · {row.roleTitle}</span>
                          </span>
                          {canEdit('groups') && (
                            <button
                              type="button"
                              onClick={() => void leaveGroup(row.id)}
                              className="text-[#9b2f00] hover:underline shrink-0 cursor-pointer"
                              aria-label={`Take ${row.member.firstName} ${row.member.lastName} off the roll of ${group.name}`}
                            >
                              remove
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {canEdit('groups') && leaders.members.length > 0 && (
                      <div className="mt-2 flex flex-col sm:flex-row gap-2">
                        <select
                          aria-label={`Add a member to ${group.name}`}
                          onChange={(e) => void joinGroup(group.id, e.target.value, newRole)}
                          value=""
                          className="flex-1 h-9 rounded-xl bg-white text-xs border border-[#EAE1D7] px-2 text-[#1e1b19]"
                        >
                          <option value="" disabled>Add someone to the roll…</option>
                          {leaders.members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.firstName} {m.lastName}
                            </option>
                          ))}
                        </select>
                        <input
                          aria-label={`Role for the next person added to ${group.name}`}
                          type="text"
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          placeholder="Role (optional)"
                          className="sm:w-32 h-9 rounded-xl bg-white text-xs border border-[#EAE1D7] px-2 text-[#1e1b19]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Meetings */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#59413a] mb-2">Recent gatherings</p>
                    {(openGroup?.meetings ?? []).length === 0 && !openDetail.loading && <p className="text-xs text-[#8d7168]">No gathering recorded yet.</p>}
                    <ul className="space-y-1">
                      {(openGroup?.meetings ?? []).map((meeting) => (
                        <li key={meeting.id} className="flex items-center justify-between text-xs text-[#59413a]">
                          <span>{new Date(meeting.metAt).toLocaleDateString()} {meeting.hostName ? `· at ${meeting.hostName}` : ''}</span>
                          <span className="font-semibold text-[#1e1b19]">{meeting.attendedCount} present</span>
                        </li>
                      ))}
                    </ul>
                    {canEdit('groups') && (
                      <div className="mt-2 space-y-2">
                        {meetingError && <p className="text-xs text-red-700">{meetingError}</p>}
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            aria-label={`Date ${group.name} met`}
                            type="date"
                            value={meetingForm.metAt}
                            onChange={(e) => setMeetingForm({ ...meetingForm, metAt: e.target.value })}
                            className="h-9 rounded-xl bg-white text-xs border border-[#EAE1D7] px-2 text-[#1e1b19]"
                          />
                          <input
                            aria-label={`How many came to ${group.name}`}
                            type="number"
                            min={0}
                            value={meetingForm.attendedCount}
                            onChange={(e) => setMeetingForm({ ...meetingForm, attendedCount: e.target.value })}
                            placeholder="Attended"
                            className="h-9 rounded-xl bg-white text-xs border border-[#EAE1D7] px-2 text-[#1e1b19]"
                          />
                        </div>
                        <input
                          aria-label={`Who hosted ${group.name}'s meeting`}
                          type="text"
                          value={meetingForm.hostName}
                          onChange={(e) => setMeetingForm({ ...meetingForm, hostName: e.target.value })}
                          placeholder="Hosted at / by (optional)"
                          className="w-full h-9 rounded-xl bg-white text-xs border border-[#EAE1D7] px-2 text-[#1e1b19]"
                        />
                        <button
                          type="button"
                          onClick={() => void recordMeeting(group.id)}
                          className="h-9 px-3 rounded-xl bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold flex items-center justify-center gap-1.5 w-full cursor-pointer"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">event_available</span>
                          Record the gathering
                        </button>
                      </div>
                    )}
                  </div>

                  {canEdit('groups') && group.isActive && (
                    <button
                      type="button"
                      onClick={() => void retireGroup(group.id)}
                      className="text-xs text-[#59413a] hover:text-[#9b2f00] hover:underline cursor-pointer"
                    >
                      Retire this fellowship…
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Convene drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs" {...drawerOpenDialog}>
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <h2 className="font-headline text-lg font-bold text-[#1e1b19]">Convene a New Fellowship</h2>
            <p className="text-xs text-[#59413a] mt-1">A circle that gathers through the week — a cell group, a fellowship, a chapter.</p>
            <form onSubmit={createGroup} className="mt-4 space-y-3">
              {formError && <p className="text-xs text-red-700" role="alert">{formError}</p>}
              <div>
                <label htmlFor="group-name" className="block text-xs font-semibold text-[#59413a] mb-1">Name</label>
                <input
                  id="group-name"
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  required
                  minLength={2}
                  maxLength={120}
                  className="w-full h-10 rounded-xl bg-white text-xs border border-[#EAE1D7] px-3 text-[#1e1b19]"
                />
              </div>
              <div>
                <label htmlFor="group-description" className="block text-xs font-semibold text-[#59413a] mb-1">What it is (optional)</label>
                <input
                  id="group-description"
                  type="text"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  maxLength={2000}
                  className="w-full h-10 rounded-xl bg-white text-xs border border-[#EAE1D7] px-3 text-[#1e1b19]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="group-day" className="block text-xs font-semibold text-[#59413a] mb-1">Meeting day</label>
                  <select
                    id="group-day"
                    value={draft.meetingDay}
                    onChange={(e) => setDraft({ ...draft, meetingDay: e.target.value })}
                    className="w-full h-10 rounded-xl bg-white text-xs border border-[#EAE1D7] px-2 text-[#1e1b19]"
                  >
                    <option value="">Unfixed</option>
                    {MEETING_DAYS.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="group-leader" className="block text-xs font-semibold text-[#59413a] mb-1">Leader</label>
                  <select
                    id="group-leader"
                    value={draft.leaderId}
                    onChange={(e) => setDraft({ ...draft, leaderId: e.target.value })}
                    className="w-full h-10 rounded-xl bg-white text-xs border border-[#EAE1D7] px-2 text-[#1e1b19]"
                  >
                    <option value="">Not named yet</option>
                    {leaders.members.map((m) => (
                      <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="group-location" className="block text-xs font-semibold text-[#59413a] mb-1">Where it meets (optional)</label>
                <input
                  id="group-location"
                  type="text"
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  maxLength={160}
                  className="w-full h-10 rounded-xl bg-white text-xs border border-[#EAE1D7] px-3 text-[#1e1b19]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="h-10 px-4 rounded-xl bg-white border border-[#EAE1D7] text-xs font-semibold text-[#1e1b19] hover:bg-[#f4ece8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !draft.name.trim()}
                  className="h-10 px-4 rounded-xl bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold shadow-sm disabled:opacity-70 cursor-pointer"
                >
                  {saving ? 'Convening…' : 'Convene the fellowship'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
