import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDialog } from './dialog';

/** One thing the palette can do. The shell owns the action; the palette only presents it. */
export interface CommandAction {
  id: string;
  label: string;
  /** Where it takes you, printed beside the label and included in the search. */
  hint: string;
  /** Ligature name for the row's mark. */
  icon: string;
  run: () => void;
}

/**
 * The command palette (Cmd/Ctrl + K).
 *
 * It is a listbox with the keyboard on the *input*, not on the rows: the field keeps focus and
 * `aria-activedescendant` names the highlighted row. That is the standard combobox arrangement, and
 * it means arrowing through results never disturbs what the user is typing.
 *
 * Semantics come from the app's `useDialog`, so Escape closes it, focus moves in and back out, Tab
 * cannot leave, and everything behind it is `inert` — the same contract as every other dialog here.
 */
export const CommandPalette: React.FC<{ actions: CommandAction[]; onClose: () => void }> = ({ actions, onClose }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const dialog = useDialog(onClose, 'Command palette');
  const list = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return actions;
    return actions.filter((action) => `${action.label} ${action.hint}`.toLowerCase().includes(needle));
  }, [actions, query]);

  // A new query means a new first result, and the highlight must follow the list rather than the
  // row that used to be in that position.
  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    (list.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (action: CommandAction | undefined) => {
    if (!action) return;
    action.run();
    onClose();
  };

  const onFieldKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(matches[active]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#1C1917]/40 p-4 pt-24" {...dialog}>
      <div className="w-full max-w-xl overflow-hidden rounded-[14px] border border-border-default bg-warm-surface shadow-warm-card-hover">
        <div className="flex items-center gap-2.5 border-b border-border-default px-4 py-3">
          <span aria-hidden="true" className="material-symbols-outlined text-text-muted" style={{ fontSize: 20 }}>
            keyboard_command_key
          </span>
          <input
            type="text"
            aria-label="Search commands"
            aria-controls="command-palette-results"
            aria-activedescendant={matches.length ? `command-option-${active}` : undefined}
            placeholder="Where to? Type a screen or an action…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onFieldKeyDown}
            className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>

        {matches.length === 0 ? (
          <p role="status" className="px-4 py-8 text-center text-xs text-text-secondary">
            No command matches “{query.trim()}”.
          </p>
        ) : (
          <ul
            id="command-palette-results"
            role="listbox"
            aria-label="Commands"
            ref={list}
            className="max-h-80 overflow-y-auto py-1.5"
          >
            {matches.map((action, index) => (
              <li
                key={action.id}
                id={`command-option-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(action)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-xs ${
                  index === active ? 'bg-primary/10 text-primary' : 'text-text-primary'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {action.icon}
                </span>
                <span className="font-bold">{action.label}</span>
                <span className="ml-auto text-[11px] text-text-muted">{action.hint}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
