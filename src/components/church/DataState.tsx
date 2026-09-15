import React from 'react';

/**
 * The three states every API-backed screen has and every screen used to forget.
 *
 * They live here rather than being re-written per panel so a table, a grid and a card list all
 * report "loading", "the server refused" and "nothing here yet" the same way — which is the
 * difference between a console that looks connected and one that looks broken.
 */

export const LoadingBlock: React.FC<{ label?: string; className?: string }> = ({
  label = 'Loading…',
  className = '',
}) => (
  <div
    role="status"
    aria-live="polite"
    className={`flex items-center justify-center gap-2 py-10 text-[#57534E] ${className}`}
  >
    <span aria-hidden="true" className="material-symbols-outlined animate-spin text-[20px] text-[#C2410C]">
      progress_activity
    </span>
    <span className="text-xs font-semibold">{label}</span>
  </div>
);

export const ErrorBlock: React.FC<{ message: string; onRetry?: () => void; className?: string }> = ({
  message,
  onRetry,
  className = '',
}) => (
  <div
    role="alert"
    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[#B91C1C] ${className}`}
  >
    <span className="flex items-center gap-2 text-xs font-semibold">
      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">cloud_off</span>
      {message}
    </span>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="self-start sm:self-auto rounded-[9px] bg-[#B91C1C] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#991B1B] transition-colors cursor-pointer"
      >
        Retry
      </button>
    )}
  </div>
);

export const EmptyBlock: React.FC<{
  title: string;
  hint?: string;
  icon?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, hint, icon = 'inbox', action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center gap-2 py-12 text-center ${className}`}>
    <span aria-hidden="true" className="material-symbols-outlined text-[36px] text-[#A8A29E]">
      {icon}
    </span>
    <p className="text-sm font-semibold text-[#1C1917]">{title}</p>
    {hint && <p className="max-w-md text-xs text-[#57534E]">{hint}</p>}
    {action}
  </div>
);
