import React from 'react';
import { interactiveCard } from '../church/interactiveCard';

/**
 * The Warm Ember card: rounded 14px, white, soft warm shadow.
 *
 * Pass `onActivate` to make the whole surface a control. That reuses `interactiveCard`, which gives
 * the element the button role, keyboard focus and Enter/Space activation — the card's contents are
 * block-level, so it cannot literally be a `<button>` (that element may only hold phrasing content).
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Makes the whole card a control that runs this action. */
  onActivate?: () => void;
  /** `none` when the card is a bare container, `md` for the standard 20px inset. */
  padding?: 'none' | 'md';
}

export const Card: React.FC<CardProps> = ({ onActivate, padding = 'md', className = '', children, ...rest }) => (
  <div
    {...(onActivate ? interactiveCard(onActivate) : {})}
    className={`rounded-[14px] bg-warm-surface border border-border-default shadow-warm-card transition-all ${
      onActivate ? 'group cursor-pointer hover:shadow-warm-card-hover hover:border-border-strong' : ''
    } ${padding === 'md' ? 'p-5' : ''} ${className}`}
    {...rest}
  >
    {children}
  </div>
);
