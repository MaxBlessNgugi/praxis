/**
 * What every browser audit needs in common: find a browser, wait for its DevTools endpoint, and
 * turn a report into an exit code the CI job can trust.
 *
 * The exit code is the point. An audit that prints a report full of failures and still exits 0 is
 * worse than no audit at all, because CI shows a green check and nobody opens the log.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Credentials the audits sign in with.
 *
 * CI seeds its own database, so it can set these to whatever it seeded; the fallback is the seed's own
 * demo account, which is what a developer running this against a local database will have.
 */
export const AUDIT_EMAIL = process.env.AUDIT_EMAIL || process.env.SMOKE_EMAIL || 'bishop@destinysanctuary.co.ke';
export const AUDIT_PASSWORD =
  process.env.AUDIT_PASSWORD || process.env.SMOKE_PASSWORD || 'praxis-demo-2025';

/**
 * The expression an audit evaluates to get past the sign-in gate.
 *
 * The console is behind a real login now, so an audit that navigates straight to a section lands on
 * the gate, reaches no screens, and `reportFailures` fails the run for having measured nothing. That
 * verdict is correct — which is why every audit has to get through the gate first, and why the two
 * audits share this rather than each growing its own version.
 *
 * Two details are doing real work. The values go in through the native setter plus an `input` event,
 * because React holds the field's state and a plain `el.value = …` never reaches it. And the result is
 * a short word rather than a boolean, so a CI log says *which* way it failed: no form at all (the app
 * never loaded), a refusal (wrong credentials), or a timeout (the API was not there to answer).
 */
export function signInScript() {
  return `(async () => {
    const waitFor = async (test, ms) => {
      for (let i = 0; i < Math.ceil(ms / 100); i++) {
        if (test()) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    };
    // A nav inside the aside, not the aside itself: the sign-in screen has an aside too — its
    // branding panel — so testing for the element alone reports "already signed in" while still
    // standing on the gate.
    const shell = () => document.querySelector('aside nav');
    if (shell()) return 'already-signed-in';

    const email = document.querySelector('#auth-email');
    const password = document.querySelector('#auth-password');
    const submit = document.querySelector('form button[type="submit"]');
    if (!email || !password || !submit) return 'no-sign-in-form';

    const setValue = (el, value) => {
      const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setValue(email, ${JSON.stringify(AUDIT_EMAIL)});
    setValue(password, ${JSON.stringify(AUDIT_PASSWORD)});
    submit.click();

    if (await waitFor(() => shell() || document.querySelector('[role="alert"]'), 20000)) {
      return shell() ? 'signed-in' : 'sign-in-refused';
    }
    return 'timed-out';
  })()`;
}

/**
 * Signs in, or explains why the audit cannot continue.
 *
 * A failed sign-in is not a finding about the console, so it is reported as a harness failure (exit 2)
 * rather than being counted as screens that failed to render — the distinction is what stops a broken
 * API from looking like an accessibility regression.
 */
export async function requireSignIn(evaluate) {
  const outcome = await evaluate(signInScript());
  if (outcome === 'signed-in' || outcome === 'already-signed-in') return;
  console.error(`could not sign in (${outcome}) — is the API running, seeded, and allowing this origin?`);
  process.exit(2);
}

/**
 * Where Chrome lives. CI images install it as `google-chrome`; Windows and macOS devs have it under
 * the vendor path. `CHROME` overrides everything, and the last fallback is a bare name so a PATH
 * lookup can still find it.
 */
const CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

export function chromeExecutable() {
  if (process.env.CHROME) return process.env.CHROME;
  return CANDIDATES.find((candidate) => fs.existsSync(candidate)) || 'google-chrome';
}

/** A throwaway profile per run: a cached copy from an earlier run must never answer a navigation. */
export function launchChrome({ port, profile, width = 1440, height = 900 }) {
  const executable = chromeExecutable();
  const chrome = spawn(
    executable,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--window-size=${width},${height}`,
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${path.join(os.tmpdir(), `${profile}-${port}`)}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  chrome.on('error', (err) => {
    console.error(`could not start a browser at ${executable}: ${err.message}`);
    console.error('set CHROME=/path/to/chrome to point at one');
    process.exit(2);
  });
  return chrome;
}

export async function waitForDevTools(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

/**
 * Print a summary a CI log can be read from, and answer whether this run should fail.
 *
 * Every failure list is named explicitly — a list nobody checks is a list that never fails. And a
 * run that measured nothing fails too: a typo in a section title would otherwise reach no screens
 * and read as a clean pass, which is exactly the failure mode this file exists to prevent.
 */
export function reportFailures(label, report, keys) {
  const measured = report.screens ?? 0;
  const failing = keys.filter((key) => (report[key]?.length ?? 0) > 0);
  const dialogs = report.dialogs === undefined ? '' : `, ${report.dialogs} dialogs opened`;
  const lines = [`${label}: ${measured} screens audited${dialogs}`];

  if (measured === 0) {
    lines.push(`${label}: NOTHING MEASURED — no screen was reached, so this run cannot pass`);
  }
  for (const key of failing) {
    const entries = report[key];
    lines.push(`${label}: ${key} — ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`);
    for (const entry of entries.slice(0, 3)) {
      const where = entry.screen || entry.trigger || '(unknown screen)';
      const detail = entry.issue || entry.html || entry.item?.html || entry.item?.note || '';
      lines.push(`    ${where}${detail ? ` — ${String(detail).replace(/\s+/g, ' ').slice(0, 140)}` : ''}`);
    }
    if (entries.length > 3) lines.push(`    …and ${entries.length - 3} more (see the uploaded report)`);
  }
  console.error(lines.join('\n'));
  return measured === 0 || failing.length > 0;
}
