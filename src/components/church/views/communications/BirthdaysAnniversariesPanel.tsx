import React, { useState } from 'react';
import { BirthdayAnniversaryItem } from '../../../../types';
import { useDialog } from '../../dialog';
import { INITIAL_MILESTONES } from '../../../../data/churchMockData'
;

type TimeRange = 'this-week' | 'this-month' | 'quarter';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** The mockup's clock: Sunday, Feb 09, 2025 (ChurchHeader shows the same day). */
const MOCK_TODAY = Date.UTC(2025, 1, 9);

/** Milestones carry a year-less date such as "Feb 11"; place it in the mock's year. */
const monthDay = (date: string): number | null => {
  const [month, day] = date.split(' ');
  const index = MONTHS.indexOf(month);
  return index < 0 ? null : Date.UTC(2025, index, Number(day));
};

const inTimeRange = (date: string, range: TimeRange): boolean => {
  const when = monthDay(date);
  if (when === null) return false;
  if (range === 'this-week') return when >= MOCK_TODAY && when < MOCK_TODAY + WEEK_MS;
  if (range === 'this-month') {
    return new Date(when).getUTCMonth() === new Date(MOCK_TODAY).getUTCMonth();
  }
  return Math.floor(new Date(when).getUTCMonth() / 3) === Math.floor(new Date(MOCK_TODAY).getUTCMonth() / 3);
};

export const BirthdaysAnniversariesPanel: React.FC = () => {
  const [milestones, setMilestones] = useState<BirthdayAnniversaryItem[]>(INITIAL_MILESTONES);
  const [activeFilter, setActiveFilter] = useState<'all' | 'birthday' | 'anniversary'>('all');
  const [timeFilter, setTimeFilter] = useState<TimeRange>('this-month');
  const [sendingBlessing, setSendingBlessing] = useState<BirthdayAnniversaryItem | null>(null);
  const sendingBlessingDialog = useDialog(() => setSendingBlessing(null), "Send Pastoral Blessing Card");
  const [blessingMessage, setBlessingMessage] = useState<string>('');
  const [sentAlert, setSentAlert] = useState<string | null>(null);

  const filteredMilestones = milestones.filter((item) => {
    if (activeFilter !== 'all' && item.type !== activeFilter) return false;
    return inTimeRange(item.date, timeFilter);
  });

  const handleOpenBlessing = (item: BirthdayAnniversaryItem) => {
    setSendingBlessing(item);
    if (item.type === 'birthday') {
      setBlessingMessage(
        `Dear ${item.memberName}, Destiny Sanctuary wishes you a blessed and joyous Birthday! "The Lord bless you and keep you; the Lord make his face shine upon you." (Num 6:24) — Pastoral Staff`
      );
    } else {
      setBlessingMessage(
        `Dear ${item.memberName}, Happy Anniversary! We praise God for your ${item.yearsCount ? `${item.yearsCount} years of ` : ''}marriage and witness in our church family. — Destiny Sanctuary Council & Pastors`
      );
    }
  };

  const handleSendBlessing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendingBlessing) return;

    setMilestones(
      milestones.map((m) =>
        m.id === sendingBlessing.id ? { ...m, greetingSent: true } : m
      )
    );
    setSentAlert(sendingBlessing.memberName);
    setTimeout(() => setSentAlert(null), 4000);
    setSendingBlessing(null);
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Birthdays This Month</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">
              {milestones.filter((m) => m.type === 'birthday').length} Celebrations
            </div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">cake</span>
              Fellowship cards prepared
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">cake</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Wedding Anniversaries</span>
            <div className="text-2xl font-black text-[#D97706] mt-0.5">
              {milestones.filter((m) => m.type === 'anniversary').length} Marriages
            </div>
            <span className="text-xs text-[#57534E] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">favorite</span>
              Wedding milestones celebrated
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#D97706]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">favorite</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Greetings Dispatched</span>
            <div className="text-2xl font-black text-[#059669] mt-0.5">
              {milestones.filter((m) => m.greetingSent).length} Delivered
            </div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">mark_email_read</span>
              Pastoral care touchpoints
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#059669]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">send</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Upcoming (This Week)</span>
            <div className="text-2xl font-black text-[#C2410C] mt-0.5">3 Immediate</div>
            <span className="text-xs text-[#C2410C] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">notifications_active</span>
              Action recommended today
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">celebration</span>
          </div>
        </div>
      </div>

      {sentAlert && (
        <div className="p-3.5 rounded-[12px] bg-[#059669]/10 border border-[#059669]/30 text-[#059669] text-xs font-bold flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">check_circle</span>
          Pastoral blessing card & SMS successfully sent to {sentAlert}!
        </div>
      )}

      {/* Directory of Milestones */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4] mb-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">cake</span>
              Birthdays & Wedding Anniversaries
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Honor congregation milestones, track wedding anniversaries, and deliver pastoral blessings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#F8F1E9] rounded-[8px]">
              {(['all', 'birthday', 'anniversary'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`px-2 py-1 text-[11px] font-bold rounded-[6px] transition-all capitalize ${
                    activeFilter === type
                      ? 'bg-[#C2410C] text-white'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {type === 'all' ? 'All Milestones' : type === 'birthday' ? 'Birthdays' : 'Anniversaries'}
                </button>
              ))}
            </div>

            <select aria-label="Time range filter"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeRange)}
              className="px-3 py-1.5 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
            >
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="quarter">Full Quarter</option>
            </select>
          </div>
        </div>

        {/* Milestones Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMilestones.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-[12px] bg-[#FDF8F3] border border-[#E7E5E4] hover:border-[#C2410C]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.type === 'birthday'
                        ? 'bg-[#C2410C]/10 text-[#C2410C]'
                        : 'bg-[#D97706]/10 text-[#D97706]'
                    }`}
                  >
                    {item.type}
                  </span>

                  <span className="text-xs font-mono font-bold text-[#1C1917] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E7E5E4]">
                    {item.date}
                  </span>
                </div>

                <h4 className="font-headline text-sm font-bold text-[#1C1917] mb-0.5">
                  {item.memberName}
                </h4>

                <div className="text-xs text-[#57534E] mb-2">
                  Household: <strong className="text-[#1C1917]">{item.householdName}</strong>
                </div>

                {item.yearsCount && (
                  <div className="text-xs font-bold text-[#D97706] mb-2">
                    Celebrating {item.yearsCount} Years of Marriage
                  </div>
                )}

                <div className="text-[11px] text-[#A8A29E] space-y-0.5">
                  <div>Phone: {item.phone}</div>
                  <div>Email: {item.email}</div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#E7E5E4]/80 flex items-center justify-between">
                <div>
                  {item.greetingSent ? (
                    <span className="text-[11px] text-[#059669] font-bold flex items-center gap-1">
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">check_circle</span>
                      Blessing Sent
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#D97706] font-bold">Pending Blessing</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenBlessing(item)}
                  className="px-2.5 py-1 rounded-[6px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px]">send</span>
                  Send Blessing
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: Send Pastoral Blessing */}
      {sendingBlessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...sendingBlessingDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-md w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">
                Send Pastoral Blessing Card
              </h3>
              <button
                type="button"
                onClick={() => setSendingBlessing(null)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSendBlessing} className="mt-4 space-y-4">
              <div className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4]">
                <div className="text-[10px] font-bold text-[#A8A29E] uppercase">Recipient</div>
                <div className="font-bold text-sm text-[#1C1917] mt-0.5">
                  {sendingBlessing.memberName} ({sendingBlessing.date})
                </div>
                <div className="text-xs text-[#57534E]">{sendingBlessing.email} · {sendingBlessing.phone}</div>
              </div>

              <div>
                <label htmlFor="birthday-blessing" className="block text-xs font-bold text-[#1C1917] mb-1">
                  Pastoral Scripture & Blessing Copy
                </label>
                <textarea id="birthday-blessing" aria-label="Pastoral Scripture &amp; Blessing Copy"
                  rows={4}
                  required
                  value={blessingMessage}
                  onChange={(e) => setBlessingMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setSendingBlessing(null)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">send</span>
                  Dispatch Blessing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
