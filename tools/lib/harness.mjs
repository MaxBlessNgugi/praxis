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
