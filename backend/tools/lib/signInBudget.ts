/**
 * Waiting for room to sign in.
 *
 * Every check in this directory signs in somewhere, and `/api/auth/login` is rate-limited **per client
 * address** at ten a minute. Run several of them one after another from one machine — which is exactly
 * what CI does — and a later suite reads the address's `429` instead of the thing it was testing: a
 * lockout check sees a throttle, or a probe church's administrator simply "cannot sign in". Neither is
 * a defect in the product, and a suite that fails for a reason nobody is testing stops being read.
 *
 * So each suite asks the limiter how much room is left before it starts. The count comes from the
 * limiter's own headers — the `429` carries them too — so the wait is read rather than guessed. The
 * probe costs one attempt, which is why the budget asked for is on top of it. The loop is bounded: if
 * four windows in a row do not free up room, something other than a spent window is wrong, and the
 * suite's own failure messages will say what.
 */
export async function waitForSignInBudget(
  api: string,
  needed: number,
  announce: (line: string) => void = console.log,
): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
    const response = await fetch(`${api}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `budget-check+${Date.now()}@praxis.test`, password: 'wrong-password' }),
    });
    const remaining = Number(response.headers.get('ratelimit-remaining') ?? 0);
    if (response.status !== 429 && remaining >= needed) return;

    const resetSeconds = Math.min(Number(response.headers.get('ratelimit-reset') ?? 60) || 60, 70);
    announce(`  .. ${remaining} sign-in attempt(s) left on this address; waiting ${resetSeconds}s for the window`);
    await new Promise((resolve) => setTimeout(resolve, resetSeconds * 1000 + 200));
  }
}
