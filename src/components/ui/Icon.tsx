import React from 'react';

/**
 * The app's one icon primitive.
 *
 * Icons are Material Symbols ligatures today — self-hosted, and inlined into the single-file build
 * by `src/index.css`. Every call site renders them through here, so moving to a different icon
 * library (or to inline SVG) is one file rather than 41.
 *
 * Pass `label` only when the icon is the sole thing naming a control; otherwise it is hidden from
 * assistive tech, because a nearby visible label already says the same thing and announcing both is
 * noise.
 */
export interface IconProps {
  /** The ligature name, e.g. `diversity_1`. */
  name: string;
  /** Pixel size. Applied as a style, not a class, so arbitrary sizes work. */
  size?: number;
  /** Accessible name. Omit when adjacent text already names the control. */
  label?: string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, label, className = '' }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontSize: size }}
    {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
  >
    {name}
  </span>
);
