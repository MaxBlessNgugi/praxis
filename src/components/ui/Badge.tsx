import React from 'react';

/** The small status pill used beside figures and in list rows. */
export type BadgeTone = 'neutral' | 'primary' | 'success' | 'action' | 'danger';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-warm-sidebar text-text-secondary border-border-default',
  primary: 'bg-primary/10 text-primary border-primary/30',
  success: 'bg-success/10 text-success border-success/30',
  action: 'bg-action/10 text-action border-action/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Ligature name rendered before the label. */
  icon?: string;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', icon, className = '', children, ...rest }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-[9px] border px-2 py-0.5 text-[11px] font-bold ${TONES[tone]} ${className}`}
    {...rest}
  >
    {icon && (
      <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: 13 }}>
        {icon}
      </span>
    )}
    {children}
  </span>
);
