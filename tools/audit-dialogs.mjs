/**
 * Dialog keyboard audit — can you use every modal without a mouse?
 *
 *   node audit-dialogs.mjs
 *
 * Drives headless Chrome over the DevTools Protocol like the other audit tools. On each screen
 * it clicks every plausible trigger, and for each one that opens an overlay it tests:
 *
 *   role       role="dialog" + aria-modal + an accessible name
 *   moved in   focus is inside the dialog when it opens
 *   contained  Tab and Shift+Tab never reach a control behind the dialog
 *   rings      every control focused inside draws a visible indicator
 *   named      every control inside has an accessible name
 *   escape     Escape closes it
 *   restored   focus returns to the trigger that opened it
 *
 * Triggers are found by clicking, not by a hardcoded list, so a new dialog is covered the moment
 * it is reachable. Clicks are restricted to non-destructive labels — the app is a live mockup and
 * "Restore" or "Delete" would mutate the data the later screens assert on.
 *
 * The screen walk in audit-focus.mjs only ever sees the closed state, so anything rendered inside
 * a dialog is invisible to it — including the 34 icon-only close buttons, which is how they went
 * unnoticed. This tool is the open-state half.
 *
 * Read-only apart from a temporary `data-dialog-probe` / `data-trigger-index` attribute.
 */
import { launchChrome, reportFailures, requireSignIn, sleep, waitForDevTools } from './lib/harness.mjs';

const APP_URL = process.env.APP_URL || 'http://127.0.0.1:3000/';
const PORT = Number(process.env.CDP_PORT || 9337);
const WIDTH = 1440;
const HEIGHT = 900;
const ONLY = process.env.ONLY || '';
/** Give up on a screen after this many clicks; it bounds a screen that navigates on every click. */
const MAX_CLICKS = Number(process.env.MAX_CLICKS || 45);
/** Clicks that mutate the mock's data are skipped — later screens assert on that data. */
const DESTRUCTIVE = /delete|remove|discard|permanently|restore|empty|reset|clear|sign out|undo|commit|save|enrol|enroll|confirm/i;
/** Every list the walk can fill; any of them populated fails the run. */
const FINDINGS = ['stalled', 'unreached', 'findings', 'notMoved', 'leaked', 'notEscaped', 'notRestored', 'notReached', 'noRing', 'unnamed'];

const ALL_SECTIONS = [
  { title: 'Home', screens: [] },
  { title: 'Members & Believers', screens: ['Add New Christian', 'Find Christian', 'Delete Christian', 'Family Unit'] },
  { title: 'Services & Worship', screens: ['Service Planner', 'Attendance & Census', 'Volunteer Roster', 'Service Reports'] },
  { title: 'Church Council', screens: [] },
  { title: 'Giving & Stewardship', screens: ['Tithes', 'Offerings', 'Project Funding', 'Welfare', 'Charity Activities'] },
  { title: 'Inventory & Assets', screens: [] },
  { title: 'Groups & Fellowships', screens: ['Departmental', 'Leadership Roles', 'Volunteer Roles'] },
  // Two, not four: the screen now offers the two ordinances the register actually records, so a
  // matrimony or discipleship certificate is not a form that exists to be reached.
  { title: 'Reports & Certs', screens: ['Baptism', 'Dedication'] },
  { title: 'Communications', screens: ['Announcements', 'Broadcasts', 'Events & Calendar', 'Prayer Requests', 'Birthdays & Milestones'] },
  { title: 'Settings & Profile', screens: ['Organization Profile', 'Subscription & Billing', 'Notifications & Alerts', 'Integrations & APIs', 'Data Sovereignty & Backup', 'Customization & Lexicon'] },
  { title: 'Admin Portal', screens: ['Users & rights', 'Trash', 'Audit log', 'Finance audit', 'Churches'] },
];

const chrome = launchChrome({ port: PORT, profile: 'praxis-dialogs', width: WIDTH, height: HEIGHT });
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
/** Native alert/confirm/prompt calls the walk trips over — they block the renderer until dismissed. */
const nativeDialogs = [];
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === 'Page.javascriptDialogOpening') {
    nativeDialogs.push({ type: msg.params.type, message: String(msg.params.message || '').slice(0, 70) });
    send('Page.handleJavaScriptDialog', { accept: true });
    return;
  }
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

/**
 * Evaluate in the page, but never wait forever: a renderer blocked by a native dialog or a render
 * loop leaves the CDP call unanswered, and an unanswered promise stalls the whole walk in silence.
 */
async function evaluate(expression, timeoutMs = 10000) {
  const res = await Promise.race([
    send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }),
    new Promise((resolve) => setTimeout(() => resolve({ __timedOut: true }), timeoutMs)),
  ]);
  if (res.__timedOut) throw new Error(`page stopped responding: ${String(expression).replace(/\s+/g, ' ').slice(0, 100)}`);
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
    // An empty label matches every button, and the sort below would then click the topmost one —
    // the header's own Reset button. Refuse instead of clicking something arbitrary.
    if (!wanted) return false;
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

/** The topmost element that covers the viewport — the app's overlay pattern, closed or open. */
const OVERLAY = `[...document.querySelectorAll('div')].filter((d) => {
  if (typeof d.className !== 'string' || !d.className.includes('fixed') || !d.className.includes('inset-0')) return false;
  const cs = getComputedStyle(d);
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  const r = d.getBoundingClientRect();
  return r.width > innerWidth * 0.9 && r.height > innerHeight * 0.9;
})`;

const OPEN_INFO = `(() => {
  const found = ${OVERLAY};
  if (!found.length) return null;
  const el = found[found.length - 1];
  el.setAttribute('data-dialog-probe', '1');
  const named = (n) => (n.getAttribute('aria-label') || n.getAttribute('aria-labelledby') || '').trim();
  const active = document.activeElement;
  return {
    role: el.getAttribute('role') || '',
    ariaModal: el.getAttribute('aria-modal') || '',
    label: (named(el) || (el.querySelector('h2,h3') ? el.querySelector('h2,h3').textContent.trim() : '')).slice(0, 70),
    labelAttr: !!named(el),
    focusInside: !!(active && el.contains(active)),
    activeDesc: active ? active.tagName.toLowerCase() + ' ' + (named(active) || active.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40) : '(none)',
  };
})()`;

/** Stamp the dialog's controls and remember their unfocused style. */
const PREP_DIALOG = `(async () => {
  const el = document.querySelector('[data-dialog-probe]');
  if (!el) return 0;
  const keys = ['outlineStyle','outlineWidth','outlineColor','boxShadow','borderTopColor','backgroundColor','color','textDecorationLine'];
  // Park focus on the dialog itself first (tabIndex=-1, so it draws no indicator of its own) —
  // otherwise the control the dialog auto-focuses on open has its *focused* style recorded as the
  // baseline and gets reported as having no ring when it is focused again.
  el.focus({ preventScroll: true });
  // Parking focus *blurs* the auto-focused control, which starts its transition back to the resting
  // style. Reading the baseline in the same tick would capture a frame of the focused look instead,
  // and the control would then be reported as having no ring when it is focused again.
  await new Promise((r) => setTimeout(r, 300));
  const nodeList = [...el.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')]
    .filter((x) => x.offsetParent !== null && !x.disabled);
  nodeList.forEach((x, i) => x.setAttribute('data-dialog-index', String(i)));
  window.__dlg = { keys, base: nodeList.map((x) => { const cs = getComputedStyle(x); return keys.map((k) => cs[k]).join('|'); }) };
  window.__dlg.count = nodeList.length;
  return nodeList.length;
})()`;

const MEASURE_DIALOG = `(() => {
  const el = document.querySelector('[data-dialog-probe]');
  const active = document.activeElement;
  if (!el || !active) return { gone: true };
  // The accessible name a screen reader would use, in the spec's order: aria-labelledby, aria-label,
  // a <label> associated with the control, title. The label step is not optional — every form field
  // in this console is labelled with \`<label htmlFor>\`, so a name computed without it reads as
  // "unnamed" about a field a screen reader names perfectly well. An aria-hidden icon subtree
  // contributes nothing, so a ligature glyph cannot pass as a name.
  const accName = (node) => {
    const by = (node.getAttribute('aria-labelledby') || '').trim();
    if (by) {
      const text = by.split(/\\s+/).map((id) => { const t = document.getElementById(id); return t ? t.textContent : ''; }).join(' ').replace(/\\s+/g, ' ').trim();
      if (text) return text;
    }
    const direct = (node.getAttribute('aria-label') || '').trim();
    if (direct) return direct;
    const labels = node.labels ? [...node.labels] : [];
    const fromLabel = labels.map((l) => (l.textContent || '').trim()).join(' ').replace(/\\s+/g, ' ').trim();
    if (fromLabel) return fromLabel;
    const title = (node.getAttribute('title') || '').trim();
    if (title) return title;
    const clone = node.cloneNode(true);
    clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
    return (clone.textContent || '').replace(/\\s+/g, ' ').trim();
  };
  const index = active.getAttribute('data-dialog-index');
  const inside = el.contains(active);
  const cs = getComputedStyle(active);
  const changed = index === null ? null : window.__dlg.keys.map((k) => cs[k]).join('|') !== window.__dlg.base[Number(index)];
  return {
    inside,
    index: index === null ? null : Number(index),
    changed,
    focusVisible: active.matches(':focus-visible'),
    outline: getComputedStyle(active).outlineStyle + ' ' + getComputedStyle(active).outlineWidth,
    name: accName(active).slice(0, 50),
    html: (active.outerHTML || '').replace(/\\s+/g, ' ').slice(0, 110),
    // Stamped on first sight: seeing the same control twice means the tab order wrapped the whole
    // page without ever entering the dialog, which is a verdict rather than a press-count guess.
    repeated: (() => {
      if (active.hasAttribute('data-focus-seen')) return true;
      active.setAttribute('data-focus-seen', '1');
      return false;
    })(),
  };
})()`;

const CLEANUP_DIALOG = `(() => {
  document.querySelectorAll('[data-dialog-index]').forEach((el) => el.removeAttribute('data-dialog-index'));
  document.querySelectorAll('[data-focus-seen]').forEach((el) => el.removeAttribute('data-focus-seen'));
  delete window.__dlg;
  return true;
})()`;

const LIST_TRIGGERS = `(() => {
  // Index the current buttons from a clean slate: a surviving index from an earlier listing makes
  // the click match a node that is no longer the trigger we recorded.
  document.querySelectorAll('[data-trigger-index]').forEach((el) => el.removeAttribute('data-trigger-index'));
  const SIG = () => ${OVERLAY}.length + '|' + ((document.querySelector('h1') || {}).textContent || '');
  const aside = document.querySelector('aside');
  const content = (aside && aside.nextElementSibling) || document.body;
  const buttons = [...content.querySelectorAll('button')].filter(
    (b) => b.offsetParent !== null && !b.disabled,
  );
  const triggers = buttons.map((b, i) => {
    b.setAttribute('data-trigger-index', String(i));
    return {
      i,
      label: (b.getAttribute('aria-label') || b.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60),
    };
  });
  return { sig: SIG(), triggers };
})()`;

const clickTrigger = (i) =>
  evaluate(`(() => {
    const b = document.querySelector('[data-trigger-index="${i}"]');
    if (!b) return false;
    b.setAttribute('data-dialog-trigger', '1');
    // Focus first: a keyboard user tabs to the trigger and activates it, and focus restoration is
    // only meaningful when the trigger actually held focus. A synthetic click() does not focus.
    b.focus();
    b.click();
    return true;
  })()`);

const CLEAR_TRIGGER_MARK = `(() => {
  document.querySelectorAll('[data-dialog-trigger]').forEach((el) => el.removeAttribute('data-dialog-trigger'));
  return true;
})()`;

/** Close a dialog the app's own way — the fallback for a run where Escape does nothing. */
const FORCE_CLOSE = `(() => {
  const el = document.querySelector('[data-dialog-probe]');
  if (!el) return 'none';
  const close = [...el.querySelectorAll('button')].find((b) => {
    const t = (b.getAttribute('aria-label') || b.textContent || b.getAttribute('title') || '').trim();
    return /^(close|dismiss|x)$/i.test(t) || /close/i.test(t);
  });
  if (close) { close.click(); return 'close-button'; }
  el.click();
  return 'backdrop';
})()`;

const pressTab = async (shift = false) => {
  const common = { windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, code: 'Tab', key: 'Tab', modifiers: shift ? 8 : 0 };
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...common });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...common });
};

const pressEscape = async () => {
  const common = { windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27, code: 'Escape', key: 'Escape' };
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...common });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...common });
};

await send('Page.enable');
await send('Runtime.enable');
// Four triggers call window.print(), and a native print dialog blocks the renderer — every later
// CDP evaluate would hang and the walk would stall on that screen forever. Stub it and count calls.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__printCalls = 0; window.print = function () { window.__printCalls++; };`,
});
await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: APP_URL });
await sleep(4000);

const title = await evaluate('document.title');
if (!/Praxis Church OS/.test(title || '')) throw new Error(`unexpected app at ${APP_URL}: ${JSON.stringify(title)}`);

// Every dialog this audit opens lives behind the sign-in gate, so it has to be past it first.
await requireSignIn(evaluate);
await sleep(1200);

const report = { dialogs: 0, screens: 0, stalled: [], unreached: [], findings: [], noRing: [], leaked: [], notEscaped: [], notRestored: [], notMoved: [], notReached: [], unnamed: [] };

/** Run every check against the dialog that is currently open. */
async function testDialog(screen, trigger) {
  report.dialogs++;
  const info = (await evaluate(OPEN_INFO)) || {};
  const entry = { screen, trigger, label: info.label || '(none)', role: info.role, ariaModal: info.ariaModal };
  if (info.role !== 'dialog' || info.ariaModal !== 'true') report.findings.push({ ...entry, issue: 'not a dialog: role/aria-modal missing' });
  if (!info.label) report.findings.push({ ...entry, issue: 'no accessible name on the dialog' });
  if (!info.focusInside) report.notMoved.push({ ...entry, issue: `focus stayed outside on ${info.activeDesc}` });

  const count = await evaluate(PREP_DIALOG);
  const visited = new Set();
  let entered = false;
  // Tab toward the dialog first: with focus left on the trigger, the controls inside are still
  // ahead in the tab order. Only focus that leaves *after* entering is a leak — otherwise the
  // rings and names inside would never be measured at all, and the report would say "0 problems"
  // about controls it never reached.
  for (let i = 0; i < 130; i++) {
    await pressTab();
    // 90ms, not a frame's worth: the ring these controls draw is a `transition-all` effect, so the
    // computed style changes a frame or two after focus lands. Reading sooner races that transition
    // and reports a visibly-ringed control as having no ring — on a loaded runner, every time.
    await sleep(90);
    const m = await evaluate(MEASURE_DIALOG);
    if (!m || m.gone) break;
    if (!m.inside) {
      if (entered) {
        report.leaked.push({ ...entry, issue: 'Tab left the dialog for the page behind it', html: m.html });
        break;
      }
      if (m.repeated) {
        report.notReached.push({ ...entry, issue: 'a full tab cycle never reaches a control inside the dialog' });
        break;
      }
      continue;
    }
    entered = true;
    if (m.index !== null) visited.add(m.index);
    if (m.changed === false) report.noRing.push({ ...entry, html: m.html, focusVisible: m.focusVisible, outline: m.outline });
    if (!m.name) report.unnamed.push({ ...entry, html: m.html });
  }
  // Shift+Tab must stay in as well, or the first control is a one-way door.
  if (entered) {
    for (let i = 0; i < 3; i++) {
      await pressTab(true);
      await sleep(14);
      const m = await evaluate(MEASURE_DIALOG);
      if (!m || m.gone) break;
      if (!m.inside) {
        report.leaked.push({ ...entry, issue: 'Shift+Tab reached behind the dialog', html: m.html });
        break;
      }
    }
  }
  entry.entered = entered;
  entry.controls = count;
  entry.reached = visited.size;
  await evaluate(CLEANUP_DIALOG);

  // Escape, then focus restoration.
  await pressEscape();
  await sleep(160);
  const stillOpen = !!(await evaluate(OPEN_INFO));
  if (stillOpen) {
    report.notEscaped.push(entry);
    await evaluate(FORCE_CLOSE);
    await sleep(250);
    if (await evaluate(OPEN_INFO)) {
      await evaluate(`document.querySelectorAll('[data-dialog-probe]').forEach((el) => el.removeAttribute('data-dialog-probe')); true`);
      entry.stuck = true;
    }
  }
  const restored = await evaluate(`(() => {
    const a = document.activeElement;
    return {
      ok: !!(a && a.getAttribute && a.getAttribute('data-dialog-trigger') === '1'),
      landedOn: a ? a.tagName.toLowerCase() + ' ' + (a.getAttribute('aria-label') || a.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40) : '(none)',
      triggerStillThere: !!document.querySelector('[data-dialog-trigger="1"]'),
    };
  })()`);
  // A verdict needs the node this walk marked. React is free to replace a button while a dialog is
  // open, which drops the marker and leaves focus on body with the app doing nothing wrong.
  if (!stillOpen && !restored.ok && restored.triggerStillThere) {
    report.notRestored.push({ ...entry, issue: `focus not returned to the trigger (landed on ${restored.landedOn})` });
  }
  return entry;
}

async function walkScreen(section, tab) {
  const screen = tab ? `${section} / ${tab}` : section;
  report.screens++;
  const seenLabels = new Set();
  let clicks = 0;
  while (clicks < MAX_CLICKS) {
    const listed = (await evaluate(LIST_TRIGGERS)) || { sig: '', triggers: [] };
    const next = listed.triggers.find((t) => !seenLabels.has(t.label) && !DESTRUCTIVE.test(t.label));
    if (!next) break;
    seenLabels.add(next.label);
    clicks++;
    await evaluate(CLEAR_TRIGGER_MARK);
    if (!(await clickTrigger(next.i))) continue;
    await sleep(140);
    const open = await evaluate(OPEN_INFO);
    if (process.env.TRACE) console.error(`${screen} #${clicks} ${open ? 'DIALOG' : '     '} ${next.label}`);
    if (!open) {
      // A trigger that did not open a dialog may have navigated; if the screen changed, the
      // stale button list is meaningless, so re-enter the screen and re-collect.
      const after = await evaluate(`${OVERLAY}.length + '|' + ((document.querySelector('h1') || {}).textContent || '')`);
      if (after !== listed.sig) {
        await clickSection(section);
        await sleep(450);
        if (tab) {
          await clickTab(tab);
          await sleep(450);
        }
      }
      await evaluate(`document.querySelectorAll('[data-trigger-index]').forEach((el) => el.removeAttribute('data-trigger-index')); true`);
      continue;
    }
    await testDialog(screen, next.label);
    await evaluate(`document.querySelectorAll('[data-trigger-index]').forEach((el) => el.removeAttribute('data-trigger-index')); true`);
    await sleep(160);
  }
  if (process.env.TRACE) console.error(`${screen} :: done, ${clicks} clicks`);
}

const signedIn = await evaluate(`(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => /Sign In to Praxis/.test(b.textContent || ''));
  if (btn) { btn.click(); return true; }
  return false;
})()`);
await sleep(signedIn ? 2200 : 400);

for (const section of ALL_SECTIONS) {
  if (ONLY && section.title !== ONLY) continue;
  if (!(await clickSection(section.title))) {
    report.unreached.push({ screen: section.title, issue: 'no sidebar button carries this title' });
    continue;
  }
  await sleep(500);
  for (const tab of section.screens.length ? section.screens : [null]) {
    if (tab && !(await clickTab(tab))) {
      report.unreached.push({ screen: `${section.title} / ${tab}`, issue: 'no tab control carries this label' });
      continue;
    }
    await sleep(650);
    try {
      await walkScreen(section.title, tab);
    } catch (err) {
      report.stalled.push({ screen: tab ? `${section.title} / ${tab}` : section.title, error: String(err.message || err) });
      if (process.env.TRACE) console.error(`!! stalled: ${err.message || err}`);
      await send('Page.navigate', { url: APP_URL });
      await sleep(2500);
    }
  }
}

/** The report CI reads: the counts plus every list the walk can fill. */
const dialogsReport = {
  screens: report.screens,
  dialogs: report.dialogs,
  stalled: report.stalled,
  unreached: report.unreached,
  nativeDialogs,
  findings: report.findings,
  notMoved: report.notMoved,
  leaked: report.leaked,
  notEscaped: report.notEscaped,
  notRestored: report.notRestored,
  notReached: report.notReached,
  noRing: report.noRing,
  unnamed: report.unnamed,
};

console.log(JSON.stringify(dialogsReport, null, 2));
ws.close();
chrome.kill();
process.exit(reportFailures('dialogs', dialogsReport, FINDINGS) ? 1 : 0);
