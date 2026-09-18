import React, { useState } from 'react';
import { useDialog } from '../../dialog';
import { FIELD, LABEL } from './vocabulary';

/**
 * The three controls the council screens share: a notice bar, page controls, and the retirement
 * dialog.
 *
 * All three carry an argument that is the same on every screen they appear on — a refusal and a
 * confirmation should not look like different kinds of thing, a list longer than a page should say so,
 * and a retirement always needs a category (which the Trash counts) and a sentence (which a person
 * reads six months later). Written once so those arguments cannot drift screen by screen.
 */

export const Notice: React.FC<{ tone: 'ok' | 'bad'; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    role={tone === 'bad' ? 'alert' : 'status'}
    className={`rounded-[9px] border px-4 py-3 text-xs font-semibold ${
      tone === 'bad' ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]' : 'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]'
    }`}
  >
    {children}
  </div>
);

export interface PagerProps {
  page: number;
  pageSize: number;
  total: number;
  /** What is being counted, so the sentence reads "12 resolutions" rather than "12 records". */
  noun: string;
  onPage: (page: number) => void;
}

export const Pager: React.FC<PagerProps> = ({ page, pageSize, total, noun, onPage }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  return (
    <div className="flex flex-col items-start justify-between gap-3 border-t border-[#E7E5E4] px-1 pt-3 text-xs text-[#57534E] sm:flex-row sm:items-center">
      <span>
        Showing{' '}
        <strong className="text-[#1C1917]">
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
        </strong>{' '}
        of <strong className="text-[#1C1917]">{total}</strong> {noun}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-1.5 font-headline">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-2.5 py-1 font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] disabled:opacity-40 cursor-pointer"
          >
            Previous
          </button>
          <span className="px-1">
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
            className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-2.5 py-1 font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] disabled:opacity-40 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export interface RetireDialogProps {
  /** What is being retired, named in the question. */
  what: string;
  /** The line under it — the record's own label, and where it goes. */
  caption: string;
  reasons: ReadonlyArray<{ id: string; label: string; detail: string }>;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string, reasonLabel: string) => void;
}

export const RetireDialog: React.FC<RetireDialogProps> = ({ what, caption, reasons, busy, onClose, onConfirm }) => {
  const dialog = useDialog(onClose, 'Retire this record');
  const [reason, setReason] = useState(reasons[0].id);
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...dialog}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(reason, note.trim());
        }}
        className="w-full max-w-[460px] rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover"
      >
        <h3 className="font-headline text-base font-bold text-[#1C1917]">Retire {what}?</h3>
        <p className="mt-1.5 text-xs text-[#57534E]">
          {caption} It goes to the Trash with the reason below, where an administrator can put it back.
        </p>

        <fieldset className="mt-4">
          <legend className={LABEL}>Why is it coming off?</legend>
          <div className="space-y-1.5">
            {reasons.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-2.5 transition-colors ${
                  reason === option.id ? 'border-[#C2410C] bg-[#FDF8F3]' : 'border-[#E7E5E4] hover:bg-[#FDF8F3]'
                }`}
              >
                <input
                  type="radio"
                  name="retire-reason"
                  value={option.id}
                  checked={reason === option.id}
                  onChange={() => setReason(option.id)}
                  className="mt-0.5 h-4 w-4 accent-[#C2410C]"
                />
                <span>
                  <span className="block text-xs font-bold text-[#1C1917]">{option.label}</span>
                  <span className="block text-[11px] text-[#57534E]">{option.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-3">
          <label className={LABEL} htmlFor="retire-note">
            In your own words
          </label>
          <input
            id="retire-note"
            required
            minLength={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What the Trash should say about it"
            className={FIELD}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
          >
            Keep it
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-[9px] bg-[#B91C1C] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#991B1B] disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Retiring…' : 'Retire it'}
          </button>
        </div>
      </form>
    </div>
  );
};
