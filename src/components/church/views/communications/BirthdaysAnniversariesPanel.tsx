import React, { useMemo, useState } from 'react';
import { toBirthdayAnniversaryItem } from '../../../../lib/adapters';
import { useCelebrations } from '../../../../hooks/useApi';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';

type TimeRange = 'this-week' | 'this-month' | 'quarter';

/** The API's celebration window is a number of days, so the three ranges are three windows. */
const RANGE_DAYS: Record<TimeRange, number> = { 'this-week': 7, 'this-month': 31, quarter: 92 };
const WEEK_DAYS = 7;

export const BirthdaysAnniversariesPanel: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'birthday' | 'anniversary'>('all');
  const [timeFilter, setTimeFilter] = useState<TimeRange>('this-month');

  const { items, loading, error, refetch } = useCelebrations({ days: RANGE_DAYS[timeFilter] });
  const milestones = useMemo(() => items.map(toBirthdayAnniversaryItem), [items]);

  const filteredMilestones = milestones.filter((item) => {
    if (activeFilter !== 'all' && item.type !== activeFilter) return false;
    return true;
  });

  /** How soon a milestone falls is the API's `inDays`, so the card counts the rows directly. */
  const dueThisWeek = items.filter((item) => item.inDays <= WEEK_DAYS).length;

  return (
    <div className="flex flex-col space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Birthdays Ahead</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">
              {milestones.filter((m) => m.type === 'birthday').length} Celebrations
            </div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">cake</span>
              In the selected window
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
              In the selected window
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#D97706]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">favorite</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Due Within Seven Days</span>
            <div className="text-2xl font-black text-[#059669] mt-0.5">
              {dueThisWeek} Immediate
            </div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">mark_email_read</span>
              Worth a call this week
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#059669]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">send</span>
          </div>
        </div>
      </div>

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
        {loading && items.length === 0 ? (
          <LoadingBlock label="Loading church milestones…" />
        ) : error ? (
          <ErrorBlock message={error} onRetry={() => void refetch()} />
        ) : filteredMilestones.length === 0 ? (
          <EmptyBlock
            icon="cake"
            title="No milestones in this window"
            hint="Widen the time range, or add dates of birth and weddings to the register."
          />
        ) : (
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

                {item.yearsCount && (
                  <div className="text-xs font-bold text-[#D97706] mb-2">
                    Celebrating {item.yearsCount} Years of Marriage
                  </div>
                )}

                <div className="text-[11px] text-[#A8A29E]">
                  Phone: {item.phone || 'Not on file'}
                </div>
              </div>

            </div>
          ))}
        </div>
        )}
      </div>

    </div>
  );
};
