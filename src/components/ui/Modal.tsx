import React from 'react';
import { useDialog } from '../church/dialog';

/**
 * The console's dialog, built on the existing `useDialog` hook.
 *
 * That hook is already what supplies the semantics for all 87 dialogs the sweep opens — the dialog
 * role and name, focus moved inside, everything behind it made `inert`, Escape to close, Tab
 * wrapping at the ends, and focus handed back to the trigger. Wrapping it here means a kit dialog
 * cannot be missing any of that, and there is still only one implementation of it.
 */
export interface ModalProps {
  /** Called by Escape and by anything the caller wires to a close button. */
  onClose: () => void;
  /** The dialog's accessible name. */
  label: string;
  /** Width class for the panel, e.g. `max-w-2xl`. */
  width?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ onClose, label, width = 'max-w-lg', children }) => {
  const dialog = useDialog(onClose, label);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/40 p-4" {...dialog}>
      <div className={`w-full ${width} rounded-[14px] bg-warm-surface border border-border-default shadow-warm-card-hover`}>
        {children}
      </div>
    </div>
  );
};
