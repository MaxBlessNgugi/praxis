import React from 'react';

/**
 * The console's button.
 *
 * Colours come from the Warm Ember tokens in `src/index.css` (`bg-primary`, `bg-warm-surface`, …),
 * so the palette has one source. The keyboard focus indicator is the app-wide
 * `:focus-visible` rule in that same file, which is why no variant carries `outline-none`.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-[0_2px_8px_rgba(194,65,12,0.25)]',
  secondary:
    'bg-warm-surface text-text-secondary hover:bg-warm-surface-hover hover:text-text-primary border border-border-default hover:border-border-strong shadow-sm',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
  ghost: 'text-text-secondary hover:bg-warm-surface-hover hover:text-text-primary',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[11px]',
  md: 'h-9 px-3.5 text-xs',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  children,
  ...rest
}) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center gap-1.5 rounded-[9px] font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);
