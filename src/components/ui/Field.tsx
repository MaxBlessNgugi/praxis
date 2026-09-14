import React from 'react';

/**
 * The three text-entry controls, on one shared style.
 *
 * They live in a single file because they are the same field with a different element: one place
 * to change the border, the radius or the placeholder colour, so a select cannot quietly drift
 * away from the input beside it.
 *
 * Every one of these must be given an accessible name — pass `id` and render a `<label htmlFor>`,
 * or pass `aria-label`. `tools/audit-a11y.mjs` fails the build on an unnamed control.
 */
const FIELD =
  'w-full rounded-[9px] bg-warm-surface border border-border-default hover:border-border-strong text-text-primary font-medium placeholder:text-text-muted transition-all focus:border-primary';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Input: React.FC<InputProps> = ({ className = '', ...rest }) => (
  <input className={`${FIELD} h-9 px-3 text-xs ${className}`} {...rest} />
);

export const Textarea: React.FC<TextareaProps> = ({ className = '', rows = 3, ...rest }) => (
  <textarea className={`${FIELD} px-3 py-2 text-xs resize-none ${className}`} rows={rows} {...rest} />
);

export const Select: React.FC<SelectProps> = ({ className = '', children, ...rest }) => (
  <select className={`${FIELD} h-9 px-2.5 text-xs cursor-pointer ${className}`} {...rest}>
    {children}
  </select>
);
