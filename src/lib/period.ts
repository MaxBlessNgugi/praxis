/**
 * The date windows a treasurer actually asks for.
 *
 * The backend totals by an explicit `from`/`to`, and this is the one place that turns "this month" into
 * the two dates it means — so the giving screens, the dashboard and their printed summaries all pick
 * the same window for the same words. The bounds are local calendar days, inclusive at both ends.
 */
export type PeriodPreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
export type RangePreset = PeriodPreset | 'custom';

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  quarter: 'This quarter',
  year: 'This year',
  all: 'All time',
};

/** `YYYY-MM-DD`, which is what a date input and the API's `z.coerce.date()` both take. */
export const day = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** The start of the week, in the Kenyan week that begins on Monday. */
function startOfWeek(now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  return start;
}

export interface DateWindow {
  from?: string;
  to?: string;
}

export function rangeFor(preset: PeriodPreset, now = new Date()): DateWindow {
  const today = day(now);
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: day(startOfWeek(now)), to: today };
    case 'month':
      return { from: day(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case 'quarter': {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      return { from: day(new Date(now.getFullYear(), quarterStart, 1)), to: today };
    }
    case 'year':
      return { from: day(new Date(now.getFullYear(), 0, 1)), to: today };
    case 'all':
      return {};
  }
}

/** The heading a window wears on screen and on paper, so both say the same days. */
export function describeWindow(window: DateWindow, preset: RangePreset): string {
  if (preset !== 'custom') return PERIOD_LABELS[preset];
  if (window.from && window.to) return `${window.from} — ${window.to}`;
  if (window.from) return `From ${window.from}`;
  if (window.to) return `Up to ${window.to}`;
  return PERIOD_LABELS.all;
}
