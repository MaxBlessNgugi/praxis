import React from 'react';

/**
 * What a list shows when it has nothing to show.
 *
 * A screen with no rows is a normal state, not an error — so this says what is missing and, where
 * the caller can offer one, what to do about it.
 */
export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Ligature name for the illustration mark. */
  icon?: string;
  /** A button or link for the obvious next step. */
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon = 'inbox', action }) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
    <span
      aria-hidden="true"
      className="material-symbols-outlined text-text-muted"
      style={{ fontSize: 40 }}
    >
      {icon}
    </span>
    <div className="flex flex-col gap-1">
      <p className="text-sm font-bold text-text-primary">{title}</p>
      {description && <p className="max-w-sm text-xs text-text-secondary">{description}</p>}
    </div>
    {action}
  </div>
);

/**
 * The placeholder shape shown while data is still arriving. Hidden from assistive tech, because a
 * screen reader gains nothing from being told about boxes that are about to be replaced.
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span aria-hidden="true" className={`block animate-pulse rounded-[9px] bg-warm-surface-hover ${className}`} />
);
