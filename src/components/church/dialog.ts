/**
 * Dialog semantics for the app's hand-rolled overlays.
 *
 * Every modal here is a plain `<div className="fixed inset-0 …">` — 35 of them — with no role, no
 * way in, no way out and no boundary. Rendered they behave like a dialog; to a keyboard they are
 * just more page, so Tab walks the content hidden behind them and Escape does nothing at all.
 * Fixing that one overlay at a time is 35 chances to differ, so the behaviour lives here and each
 * overlay spreads it onto its own root:
 *
 *   <div className="fixed inset-0 …" {...dialogProps(() => setIsOpen(false), 'Record Tithe')}>
 *
 * What it supplies: `role="dialog"` + `aria-modal` + a name, focus moved to the first control
 * inside, everything outside the dialog made `inert` so Tab cannot reach it, Escape closing it,
 * and focus returned to the trigger on unmount. Focus moves only when the dialog opens or closes —
 * React re-attaches this ref on every render, and the re-attach is deliberately a no-op.
 *
 * The `onClose` argument is the same state setter the overlay's own close button already calls —
 * it is not a second source of truth.
 */

/** Marked while a dialog is open, with a count so stacked dialogs release in the right order. */
const inertCounts = new WeakMap<Element, number>();

function markInert(element: Element) {
  inertCounts.set(element, (inertCounts.get(element) ?? 0) + 1);
  element.setAttribute('inert', '');
}

function releaseInert(elements: Iterable<Element>) {
  for (const element of elements) {
    const remaining = (inertCounts.get(element) ?? 1) - 1;
    if (remaining <= 0) {
      element.removeAttribute('inert');
      inertCounts.delete(element);
    } else {
      inertCounts.set(element, remaining);
    }
  }
}

/**
 * Make everything outside the dialog inert by walking up from it and disabling each sibling along
 * the way. Sibling-of-body does not work here: the overlays are rendered inside the view tree, so
 * the single body child contains both the dialog and the whole page.
 */
function inertOutside(dialog: Element): Element[] {
  const marked: Element[] = [];
  let node: Element | null = dialog;
  while (node && node.parentElement) {
    const parent = node.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== node) {
        markInert(sibling);
        marked.push(sibling);
      }
    }
    if (parent === document.body) break;
    node = parent;
  }
  return marked;
}

/** One dialog is open at a time in this app, so the open state lives here rather than per-node. */
let openDialog: HTMLElement | null = null;
/** Where focus returns to. */
let restoreTarget: HTMLElement | null = null;
let markedElements: Element[] = [];
let reattached = false;

const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])';

function firstFocusable(dialog: HTMLElement): HTMLElement | null {
  const candidates = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
  return (
    candidates.find(
      (candidate) => !candidate.hasAttribute('disabled') && candidate.getAttribute('aria-hidden') !== 'true' && candidate.offsetParent !== null,
    ) ?? null
  );
}

/** Close the open dialog's bookkeeping: give the page back and put focus where it came from. */
function release() {
  openDialog = null;
  releaseInert(markedElements);
  markedElements = [];
  restoreTarget?.focus({ preventScroll: true });
  restoreTarget = null;
}

export interface DialogOptions {
  /** Name announced for the dialog — usually the visible heading. */
  label: string;
  /** Skip moving focus in; for an overlay that has nothing focusable to land on. */
  noAutoFocus?: boolean;
}

export function dialogProps(onClose: () => void, label: string | DialogOptions) {
  const name = typeof label === 'string' ? label : label.label;
  const autoFocus = typeof label === 'string' ? true : label.noAutoFocus !== true;

  const onMount = (dialog: HTMLElement | null) => {
    if (dialog) {
      if (dialog === openDialog) {
        // React detaches and re-attaches a ref whose identity changed on every render, so each
        // re-render hands back the very same node. That is not a new dialog: repeating the steps
        // below would drag focus out of whatever the user is typing into, once per keystroke.
        reattached = true;
        return;
      }
      if (openDialog) release();
      openDialog = dialog;
      restoreTarget = (document.activeElement as HTMLElement) ?? null;
      markedElements = inertOutside(dialog);
      if (autoFocus) {
        const target = firstFocusable(dialog) ?? dialog;
        target.focus({ preventScroll: true });
      }
      return;
    }
    // The node is gone — either the dialog closed, or React is about to hand back the same one.
    // Decide once the current commit has settled, so only a real close releases and restores.
    const node = openDialog;
    if (!node) return;
    reattached = false;
    queueMicrotask(() => {
      if (!reattached && openDialog === node) release();
    });
  };

  const onKeyDown = (event: KeyboardEvent & { currentTarget: HTMLElement }) => {
    if (event.key === 'Escape') {
      // Nested overlays would otherwise close twice.
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    // Wrap at the ends: everything behind the dialog is inert, so the only thing past the last
    // control is the browser's own chrome — which reads as being thrown out of the dialog.
    const dialog = event.currentTarget;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (control) => !control.hasAttribute('disabled') && control.offsetParent !== null,
    );
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = document.activeElement;
    const outside = !active || !dialog.contains(active);
    if (event.shiftKey && (outside || active === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (outside || active === last)) {
      event.preventDefault();
      first.focus();
    }
  };

  return {
    role: 'dialog' as const,
    'aria-modal': true,
    'aria-label': name,
    tabIndex: -1,
    ref: onMount,
    onKeyDown,
  };
}
