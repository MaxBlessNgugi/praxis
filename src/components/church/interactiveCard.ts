import React from 'react';

/**
 * Makes a clickable card behave like a button.
 *
 * These cards are selection targets: the whole surface is the control, and the
 * content inside them is block-level (headings, figures, columns), so they
 * cannot become real `<button>` elements — `<button>` may only contain phrasing
 * content. Spreading these props gives the element the button role, keyboard
 * focus, and Enter/Space activation: the same contract, valid markup.
 *
 * The focus indicator comes from the `[role='button']:focus-visible` rule in
 * src/index.css, so callers only pass the action.
 */
export function interactiveCard(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate();
      }
    },
  };
}
