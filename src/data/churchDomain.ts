/**
 * Formatting helpers shared by every screen.
 *
 * This file once carried the mock church's identity, campus list and Sunday schedule. Those facts
 * live on the server now — the organisation profile and the register itself — so what remains is
 * only what is genuinely presentation: the two formatters every screen reads.
 */

/**
 * The initials an avatar shows for a person's name — "Bishop Sammy" reads as "BS". Derived from
 * the name itself so an avatar can never disagree with the name printed beside it.
 */
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/**
 * Money as the console writes it — grouped thousands with the cents kept, so one gift reads alike
 * on the Home card, the ledger's KPI band and the ledger rows themselves.
 */
export const formatKes = (value: number) =>
  `KSh ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
