/**
 * Audit the assistive-tech baseline of every screen of the running Praxis mockup.
 *
 *   node audit-a11y.mjs
 *
 * Drives headless Chrome over the DevTools Protocol exactly like audit-controls.mjs
 * (throwaway profile, so the service worker left on this origin cannot interfere) and
 * reports, per screen:
 *
 *   icons      — Material Symbols spans not hidden from the accessibility tree
 *   svg        — inline <svg> not hidden and not named
 *   controls   — input/select/textarea with no accessible name
 *   labels     — <label> bound to nothing (no htmlFor, or htmlFor points at no id)
 *   buttons    — button/a with no accessible name
 *
 * Read-only: it never clicks a control, only navigates the sidebar and sub-tabs.
 */
import { launchChrome, reportFailures, requireSignIn, sleep, waitForDevTools } from './lib/harness.mjs';

const APP_URL = process.env.APP_URL || 'http://127.0.0.1:3000/';
const PORT = Number(process.env.CDP_PORT || 9335);
const WIDTH = 1440;
const HEIGHT = 900;
const FINDINGS = ['icons', 'svgs', 'controls', 'labels', 'buttons', 'nameMismatch'];

/** Same list as capture-screens.mjs: sidebar title + that section's sub-tab labels. */
const ALL_SECTIONS = [
  { title: 'Home', screens: [] },
  { title: 'Members & Believers', screens: ['Add New Christian', 'Find Christian', 'Delete Christian', 'Family Unit'] },
  { title: 'Services & Worship', screens: ['Service Planner', 'Attendance & Census', 'Volunteer Roster', 'Service Reports'] },
  { title: 'Church Council', screens: [] },
  { title: 'Giving & Stewardship', screens: ['Tithes', 'Offerings', 'Project Funding', 'Welfare', 'Charity Activities'] },
  { title: 'Inventory & Assets', screens: [] },
  { title: 'Groups & Fellowships', screens: ['Departmental', 'Leadership Roles', 'Volunteer Roles'] },
  { title: 'Reports & Certs', screens: ['Baptism Certificate', 'Dedication', 'Matrimony', 'Discipleship'] },
  { title: 'Communications', screens: ['Announcements', 'Broadcasts', 'Events & Calendar', 'Prayer Requests', 'Birthdays & Milestones'] },
  { title: 'Settings & Profile', screens: ['Organization Profile', 'Notifications & Alerts', 'Integrations & APIs', 'Data Sovereignty & Backup', 'Customization & Lexicon'] },
  { title: 'Admin Portal', screens: ['Users & Rights', 'Trash', 'Finance Audit'] },
];

const chrome = launchChrome({ port: PORT, profile: 'praxis-a11y', width: WIDTH, height: HEIGHT });
await waitForDevTools(PORT);
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
if (!page) throw new Error('no page target');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let nextId = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails));
  return res.result?.result?.value;
}

const clickSection = (title) =>
  evaluate(`(() => {
    const btn = [...document.querySelectorAll('aside button')].find(
      (b) => (b.getAttribute('title') || '').trim() === ${JSON.stringify(title)},
    );
    if (!btn) return false;
    btn.click();
    return true;
  })()`);

const clickTab = (label) =>
  evaluate(`(() => {
    const wanted = ${JSON.stringify(label)}.toLowerCase();
    const aside = document.querySelector('aside');
    const content = (aside && aside.nextElementSibling) || document.body;
    const hits = [...content.querySelectorAll('button')].filter(
      (b) => b.textContent.toLowerCase().includes(wanted) && b.offsetParent !== null,
    );
    if (!hits.length) return false;
    hits.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    hits[0].click();
    return true;
  })()`);

/**
 * Everything the accessibility tree needs, read straight off the rendered DOM.
 * Accessible-name order follows the spec: aria-labelledby, aria-label, <label>, title.
 */
const AUDIT_A11Y = `(() => {
  const visible = (el) => el.offsetParent !== null;
  const short = (el) => (el.outerHTML || '').replace(/\\s+/g, ' ').slice(0, 130);

  const allControlsForName = [...document.querySelectorAll('input,select,textarea')].filter(
    (el) => visible(el) && el.type !== 'hidden',
  );

  const accessibleName = (el) => {
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const text = labelledby
        .split(/\\s+/)
        .map((id) => (document.getElementById(id) || {}).textContent || '')
        .join(' ')
        .trim();
      if (text) return text;
    }
    const aria = (el.getAttribute('aria-label') || '').trim();
    if (aria) return aria;
    const labels = el.labels ? [...el.labels] : [];
    const fromLabel = labels.map((l) => (l.textContent || '').trim()).join(' ').trim();
    if (fromLabel) return fromLabel;
    if (el.tagName === 'BUTTON' && el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    const title = (el.getAttribute('title') || '').trim();
    if (title) return title;
    const text = (el.textContent || '').trim();
    if (text) return text;
    return '';
  };

  const hiddenFromAt = (el) => {
    if (el.getAttribute('aria-hidden') === 'true') return true;
    if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')) return false;
    if (el.getAttribute('role') === 'img') return false;
    if (el.closest('[aria-hidden="true"]')) return true;
    if (el.tagName === 'svg' || el.tagName === 'SVG') {
      // lucide and friends hide their own svg; a bare one is decoration too
      return true;
    }
    return false;
  };

  const icons = [...document.querySelectorAll('[class*="material-symbols"], .material-symbols-outlined')]
    .filter(visible)
    .filter((el) => !hiddenFromAt(el))
    .map(short);

  // A chart may be exposed, but only with a name of its own: role="img" alone describes nothing.
  const svgs = [...document.querySelectorAll('svg')]
    .filter(visible)
    .filter((el) => !el.closest('[aria-hidden="true"]') && el.getAttribute('aria-hidden') !== 'true')
    .filter((el) => !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.getAttribute('title'))
    .map(short);

  const controls = [...document.querySelectorAll('input,select,textarea')]
    .filter(visible)
    .filter((el) => el.type !== 'hidden')
    .map((el) => ({ el, name: accessibleName(el), placeholder: el.getAttribute('placeholder') || '' }))
    .filter((c) => !c.name)
    .map((c) => ({ tag: c.el.tagName.toLowerCase(), type: c.el.type || '', placeholder: c.placeholder, html: short(c.el) }));

  const labels = [...document.querySelectorAll('label')]
    .filter(visible)
    .map((el) => {
      const target = el.getAttribute('for');
      const wrapped = el.querySelector('input,select,textarea');
      if (wrapped) return null;
      if (!target) {
        // A label can also head a group (radiogroup, button group) by carrying an id
        // that the container points at with aria-labelledby.
        const own = el.getAttribute('id');
        if (own && document.querySelector('[aria-labelledby~="' + own + '"]')) return null;
        return { text: (el.textContent || '').trim().slice(0, 50), why: 'no htmlFor, wraps no control, names no group' };
      }
      if (!document.getElementById(target)) return { text: (el.textContent || '').trim().slice(0, 50), why: 'htmlFor=' + target + ' matches no id' };
      return null;
    })
    .filter(Boolean);

  // WCAG 2.5.3 Label in Name: a control's accessible name must contain its visible label.
  const flatten = (text) => (text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const nameMismatch = allControlsForName
    .filter((el) => el.labels && el.labels.length > 0 && el.getAttribute('aria-label'))
    .filter((el) => {
      const visibleLabel = flatten([...el.labels].map((l) => l.textContent).join(' '));
      return visibleLabel && !flatten(el.getAttribute('aria-label')).includes(visibleLabel);
    })
    .map(short);

  const buttons = [...document.querySelectorAll('button,a[href]')]
    .filter(visible)
    .filter((el) => !accessibleName(el))
    .map(short);

  // Positive side of the label check: controls whose <label> really resolves to them.
  const allControls = allControlsForName;
  const labelled = allControls.filter((el) => el.labels && el.labels.length > 0).length;

  return { icons, svgs, controls, labels, buttons, nameMismatch, totalControls: allControls.length, labelled };
})()`;

/**
 * NEGATIVE_TEST=1 strips every svg's name in-page, so a green `svgs` count is provably a check that
 * can fail rather than a blind pass.
 */
const NEGATIVE_TEST = process.env.NEGATIVE_TEST === '1';
const AUDIT_NAMES_STRIPPED = AUDIT_A11Y.replace(
  '(() => {',
  `(() => {\n  document.querySelectorAll('svg').forEach((s) => { s.removeAttribute('aria-label'); s.removeAttribute('title'); });`,
);

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: APP_URL });
await sleep(4000);

const title = await evaluate('document.title');
if (!/Praxis Church OS/.test(title || '')) throw new Error(`unexpected app at ${APP_URL}: ${JSON.stringify(title)}`);

// The console is behind a real login; without this the walk below would reach no screen at all and
// the run would fail for having measured nothing.
await requireSignIn(evaluate);
await sleep(1200);

const report = { screens: 0, icons: [], svgs: [], controls: [], labels: [], buttons: [], nameMismatch: [], controlsWithRealLabel: 0, controlsSeen: 0 };
for (const section of ALL_SECTIONS) {
  const clicked = await clickSection(section.title);
  if (!clicked) {
    report.controls.push({ screen: section.title, missing: true });
    continue;
  }
  await sleep(500);
  for (const tab of section.screens.length ? section.screens : [null]) {
    if (tab && !(await clickTab(tab))) {
      report.controls.push({ screen: `${section.title} / ${tab}`, missingTab: true });
      continue;
    }
    await sleep(650);
    const screen = tab ? `${section.title} / ${tab}` : section.title;
    report.screens++;
    const audit = await evaluate(NEGATIVE_TEST ? AUDIT_NAMES_STRIPPED : AUDIT_A11Y);
    report.controlsWithRealLabel += audit?.labelled || 0;
    report.controlsSeen += audit?.totalControls || 0;
    for (const key of ['icons', 'svgs', 'controls', 'labels', 'buttons', 'nameMismatch']) {
      for (const item of audit?.[key] || []) report[key].push({ screen, item });
    }
  }
}

console.log(JSON.stringify(report, null, 2));
ws.close();
chrome.kill();
process.exit(reportFailures('a11y', report, FINDINGS) ? 1 : 0);
