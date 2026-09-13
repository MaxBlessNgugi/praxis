import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';

/**
 * Dialog semantics for the app's hand-rolled overlays.
 *
 * Every modal here is a plain `<div className="fixed inset-0 …">` — 35 of them — with no role, no
 * way in, no way out and no boundary. Rendered they behave like a dialog; to a keyboard they are
 * just more page, so Tab walks the content hidden behind them and Escape does nothing at all. The
 * behaviour lives here and each overlay spreads it onto its own root:
 *
 *   const titheDialog = useDialog(() => setIsOpen(false), 'Record Tithe');
 *   …
 *   <div className="fixed inset-0 …" {...titheDialog}>
 *
 * What it supplies: `role="dialog"` + `aria-modal` + a name, focus moved to the first control
 * inside, everything outside the dialog made `inert` so Tab cannot reach it, Escape closing it,
 * Tab and Shift+Tab wrapping at the ends, and focus returned to the trigger on unmount.
 *
 * The returned `ref` is stable, so those steps run once per dialog instead of once per render. An
 * inline ref is detached and re-attached by React on every render, and re-running them there pulls
 * focus out of whatever the user is typing into — once per keystroke.
 *
 * The `onClose` argument is the same state setter the overlay's own close button already calls —
 * it is not a second source of truth.
 */
export function useDialog(onClose: () => void, label: string | DialogOptions) {
  const name = typeof label === 'string' ? label : label.label;
  const autoFocus = typeof label === 'string' ? true : label.noAutoFocus !== true;
  // Both handlers stay stable, so they read the current arguments through a ref rather than closing
  // over them.
  const latest = useRef({ onClose, autoFocus });
  useEffect(() => {
    latest.current = { onClose, autoFocus };
  });

  /** What the open dialog took from the page, so unmount can hand it back. */
  const open = useRef<{ restoreTarget: HTMLElement | null; marked: Element[] } | null>(null);

  const ref = useCallback((dialog: HTMLElement | null) => {
    const state = open.current;
    if (!dialog) {
      if (!state) return;
      open.current = null;
      releaseInert(state.marked);
      state.restoreTarget?.focus({ preventScroll: true });
      return;
    }
    open.current = { restoreTarget: (document.activeElement as HTMLElement) ?? null, marked: inertOutside(dialog) };
    if (latest.current.autoFocus) {
      firstFocusable(dialog).focus({ preventScroll: true });
    }
  }, []);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      // A dialog opened from a dialog would otherwise close both.
      event.stopPropagation();
      latest.current.onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    // Wrap at the ends: everything behind the dialog is inert, so the only thing past the last
    // control is the browser's own chrome — which reads as being thrown out of the dialog.
    const dialog = event.currentTarget;
    const controls = focusableIn(dialog);
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
  }, []);

  return { role: 'dialog' as const, 'aria-modal': true as const, 'aria-label': name, tabIndex: -1, ref, onKeyDown };
}

export interface DialogOptions {
  /** Name announced for the dialog — usually the visible heading. */
  label: string;
  /** Skip moving focus in; for an overlay that has nothing focusable to land on. */
  noAutoFocus?: boolean;
}

/** Marked while a dialog is open, with a count so overlapping dialogs release in the right order. */
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

const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])';

/** Every control the keyboard can reach inside the dialog, in document order. */
function focusableIn(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (control) => !control.hasAttribute('disabled') && control.offsetParent !== null,
  );
}

function firstFocusable(dialog: HTMLElement): HTMLElement {
  return focusableIn(dialog).find((control) => control.getAttribute('aria-hidden') !== 'true') ?? dialog;
}
