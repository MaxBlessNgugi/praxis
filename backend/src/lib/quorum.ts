/**
 * How many have to be present for a sitting of the Session to count.
 *
 * **The calculation: a majority of the council roll, and the council roll is the church's leadership
 * roster — the members who hold a named office rather than the default "Member" in any ministry.** In
 * arithmetic that is `floor(roll / 2) + 1`, which is "more than half", the ordinary rule a constitution
 * states in words.
 *
 * Why that roll, and not something else:
 *
 * - The Session is a body of officers, not the congregation. A majority of the whole register (four
 *   hundred souls at Destiny Sanctuary) is not a quorum any council could meet under, so the register's
 *   active membership is the wrong denominator.
 * - The one marker of "holds an office" the data model already carries is `MinistryMember.roleTitle`:
 *   the Ministries screen calls rows whose title is not "Member" the leadership roster, and this is the
 *   same roll rather than a second definition of leadership invented for governance.
 * - Every faithful rule needs *a* number that the church's own papers state. Where a *constitution*
 *   fixes a different figure, the figure it fixes should be recorded as a per-church setting and read
 *   here; that setting does not exist yet, and until it does this is the rule rather than a number
 *   typed into a form and by implication trusted.
 *
 * A church that has recorded no offices at all has no roll to count against, and the answer is `null` —
 * the absence is reported rather than filled in with a made-up figure.
 *
 * Kept out of the service, in one small module, because the **seed** has to state the same rule when it
 * writes the demonstration church's sittings. Two copies of a quorum rule are two rules that disagree
 * the first time one is corrected.
 */
export function quorumRequired(roll: number): number | null {
  return roll === 0 ? null : Math.floor(roll / 2) + 1;
}

/**
 * Whether the attendance in the register meets the figure: a count against a number, never a judgement
 * somebody types. `null` when either side is unknown, so "not assessed" is distinguishable from "not
 * quorate".
 */
export function quorumMet(attendees: number | null | undefined, required: number | null): boolean | null {
  if (required === null || attendees === null || attendees === undefined) return null;
  return attendees >= required;
}
