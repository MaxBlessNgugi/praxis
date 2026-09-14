import React from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  /** Ligature name rendered before the label. */
  icon?: string;
}

export interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  /** Names the strip, e.g. "Giving & Stewardship sections". */
  label: string;
}

/**
 * The horizontal sub-tab strip.
 *
 * Deliberately a labelled `<nav>` of buttons rather than `role="tablist"`: the panels these switch
 * are whole screens living in the app shell, not markup this component can attach a `tabpanel` to.
 * Claiming the tab semantics without the panels would leave screen-reader users with controls that
 * point nowhere, so the active item is marked `aria-current` instead — which is true as written.
 */
export function Tabs<T extends string>({ items, active, onChange, label }: TabsProps<T>) {
  return (
    <nav aria-label={label} className="flex items-center gap-1 overflow-x-auto border-b border-border-default px-1">
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={selected ? 'page' : undefined}
            onClick={() => onChange(item.id)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-t-[9px] px-3 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${
              selected
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-warm-surface-hover'
            }`}
          >
            {item.icon && (
              <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: 17 }}>
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
