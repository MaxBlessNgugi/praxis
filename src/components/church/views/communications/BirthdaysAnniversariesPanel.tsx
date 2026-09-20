import React, { useState } from 'react';
import type { CelebrationDto } from '../../../../lib/api';
import { useCelebrations } from '../../../../hooks/useApi';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';

type TimeRange = 'this-week' | 'this-month' | 'quarter';

/** The API's celebration window is a number of days, so the three ranges are three windows. */
const RANGE_DAYS: Record<TimeRange, number> = { 'this-week': 7, 'this-month': 31, quarter: 92 };
const WEEK_DAYS = 7;

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`));

export const BirthdaysAnniversariesPanel: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'birthday' | 'anniversary'>('all');
  const [timeFilter, setTimeFilter] = useState<TimeRange>('this-month');

  const { items, meta, loading, error, refetch } = useCelebrations({ days: RANGE_DAYS[timeFilter] });

  const shown = activeFilter === 'all' ? items : items.filter((item) => item.type === activeFilter);
  const dueThisWeek = items.filter((item) => item.inDays <= WEEK_DAYS).length;

  /** The window's own counts, so the figures do not change with the filter above them. */
  const windowCount = (kind: CelebrationDto['type']) =>
    meta ? (kind === 'birthday' ? meta.birthdays : meta.anniversaries) : items.filter((item) => item.type === kind).length;

  const cards = [
    { label: 'Birthdays ahead', value: `${windowCount('birthday')} Celebrations`, hint: 'In the selected window', colour: '#C2410C' },
    { label: 'Wedding anniversaries', value: `${windowCount('anniversary')} Marriages`, hint: 'In the selected window', colour: '#D97706' },
    { label: 'Due within seven days', value: `${dueThisWeek} Immediate`, hint: 'Worth a call this week', colour: '#059669' },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">{card.label}</span>
            <div className="text-2xl font-black mt-0.5" style={{ color: card.colour }}>
              {card.value}
            </div>
            <span className="text-xs text-[#57534E]">{card.hint}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4] mb-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">cake</span>
              Birthdays & Wedding Anniversaries
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Read from the register&rsquo;s own dates of birth and weddings, so a card is never sent to a
              household whose details were never entered.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#F8F1E9] rounded-[8px]">
              {(['all', 'birthday', 'anniversary'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveFilter(type)}
                  className={`px-2 py-1 text-[11px] font-bold rounded-[6px] transition-all ${
                    activeFilter === type ? 'bg-[#C2410C] text-white' : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {type === 'all' ? 'All milestones' : type === 'birthday' ? 'Birthdays' : 'Anniversaries'}
                </button>
              ))}
            </div>

            <select
              aria-label="Time range filter"
              value={timeFilter}
              onChange={(event) => setTimeFilter(event.target.value as TimeRange)}
              className="px-3 py-1.5 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
            >
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
              <option value="quarter">Full quarter</option>
            </select>
          </div>
        </div>

        {loading && items.length === 0 ? (
          <LoadingBlock label="Reading the church's milestones…" />
        ) : error ? (
          <ErrorBlock message={error} onRetry={() => void refetch()} />
        ) : shown.length === 0 ? (
          <EmptyBlock
            icon="cake"
            title="No milestones in this window"
            hint="Widen the time range, or add dates of birth and weddings to the register."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shown.map((item) => (
              <div
                key={`${item.type}-${item.memberId}-${item.date}`}
                className="p-4 rounded-[12px] bg-[#FDF8F3] border border-[#E7E5E4] hover:border-[#C2410C]/40 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.type === 'birthday' ? 'bg-[#C2410C]/10 text-[#C2410C]' : 'bg-[#D97706]/10 text-[#D97706]'
                    }`}
                  >
                    {item.type}
                  </span>

                  <span className="text-xs font-mono font-bold text-[#1C1917] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E7E5E4]">
                    {dayLabel(item.date)}
                  </span>
                </div>

                <h4 className="font-headline text-sm font-bold text-[#1C1917] mb-0.5">{item.memberName}</h4>

                {item.yearsCount !== null && (
                  <div className="text-xs font-bold text-[#D97706] mb-2">
                    {item.yearsCount} {item.yearsCount === 1 ? 'year' : 'years'} of marriage
                  </div>
                )}

                <div className="text-[11px] text-[#A8A29E]">
                  {item.inDays === 0 ? 'Today' : `In ${item.inDays} ${item.inDays === 1 ? 'day' : 'days'}`}
                  {item.phone ? ` · ${item.phone}` : ' · No number on file'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
