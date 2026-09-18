import React, { useMemo, useState } from 'react';
import {
  broadcastsApi,
  type BroadcastDeliveryDto,
  type BroadcastDto,
} from '../../../../lib/api';
import { errorMessage, useBroadcasts, useChannels } from '../../../../hooks/useApi';
import { usePermissions } from '../../../../lib/permissions';
import { useDialog } from '../../dialog';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';

/**
 * Messages the church sends out to its own people, and what the gateway did with them.
 *
 * The screen is built around one honesty rule: **the delivery figures are the provider's, not ours.**
 * A campaign that was composed is a draft; a campaign that went out carries the per-recipient outcome
 * the gateway reported, failures and their reasons included. The old screen showed a delivery rate it
 * had made up, and the danger of that is not the wrong number — it is that a funeral notice which
 * reached nobody looked exactly like one that reached everybody.
 *
 * Two consequences follow. Sending is refused up front when no provider is configured, in the words of
 * the thing that has to be set, rather than quietly marking a campaign sent. And an audience that
 * resolves to no addresses is an error from the server, not a cheerful zero on a card.
 */

/** The audience labels the server knows how to resolve. A label it does not recognise goes to everyone. */
const AUDIENCES: Array<{ label: string; hint: string }> = [
  { label: 'Members & Baptized Believers', hint: 'The whole register' },
  { label: 'Ministry Leaders', hint: 'Anyone leading a ministry' },
  { label: 'Youth Roll', hint: 'Members tagged youth' },
  { label: 'Church Council', hint: 'Administrator logins' },
];

const CHANNELS: Array<{ value: BroadcastDto['channel']; label: string; icon: string }> = [
  { value: 'email', label: 'Email', icon: 'mail' },
  { value: 'sms', label: 'SMS', icon: 'sms' },
  { value: 'notice_sheet', label: 'Printed notice', icon: 'print' },
];

const FIELD =
  'w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1';

const when = (value: string | null) => (value ? new Date(value).toLocaleString('en-GB') : 'not yet');

/** Sent campaigns carry when they went; the others carry when they are due or when they were written. */
const stampOf = (row: BroadcastDto) =>
  row.status === 'sent' ? row.sentAt : row.status === 'scheduled' ? row.scheduledFor : row.createdAt;

const channelLabel = (channel: BroadcastDto['channel']) =>
  CHANNELS.find((entry) => entry.value === channel)?.label ?? channel;

/** The one-line verdict for a campaign: what went out, and what did not. */
function outcome(broadcast: BroadcastDto): string {
  if (broadcast.status === 'scheduled') return `Goes out ${when(broadcast.scheduledFor)}`;
  if (broadcast.status !== 'sent') return 'Held as a draft';
  const report = broadcast.lastReport;
  if (!report) return `${broadcast.recipients.toLocaleString()} copies distributed`;
  if (report.failed === 0) return `${report.delivered.toLocaleString()} delivered of ${report.attempted.toLocaleString()}`;
  return `${report.delivered.toLocaleString()} delivered · ${report.failed.toLocaleString()} failed of ${report.attempted.toLocaleString()}`;
}

export const BroadcastsPanel: React.FC = () => {
  const broadcasts = useBroadcasts({ pageSize: 100 });
  const { channels } = useChannels();
  const { canEdit, canDelete } = usePermissions();

  const [selectedChannel, setSelectedChannel] = useState<'all' | BroadcastDto['channel']>('all');
  const [isComposing, setIsComposing] = useState(false);
  const composingDialog = useDialog(() => setIsComposing(false), 'Compose Church Broadcast');

  const [channel, setChannel] = useState<BroadcastDto['channel']>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState(AUDIENCES[0].label);
  /** Empty means "do not send yet": a campaign can be written now and sent from the log later. */
  const [goesOutAt, setGoesOutAt] = useState('');
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<{ broadcast: BroadcastDto; delivery: BroadcastDeliveryDto } | null>(null);
  /** Only a printed notice sheet has no gateway to count for it, so the office supplies the number. */
  const [copies, setCopies] = useState('');

  const rows = broadcasts.items;
  const filtered = selectedChannel === 'all' ? rows : rows.filter((row) => row.channel === selectedChannel);

  const totals = useMemo(() => {
    const sent = rows.filter((row) => row.status === 'sent');
    return sent.reduce(
      (acc, row) => ({
        campaigns: acc.campaigns + 1,
        delivered: acc.delivered + (row.lastReport?.delivered ?? row.recipients),
        failed: acc.failed + (row.lastReport?.failed ?? 0),
      }),
      { campaigns: 0, delivered: 0, failed: 0 },
    );
  }, [rows]);

  const readiness = (value: BroadcastDto['channel']): { ready: boolean; note: string } => {
    if (value === 'notice_sheet') return { ready: true, note: 'Printed in the office' };
    if (!channels) return { ready: false, note: 'Reading the gateway…' };
    const status = value === 'email' ? channels.email : channels.sms;
    if (status.configured) {
      return { ready: true, note: `${status.driver}${status.from ? ` · ${status.from}` : ''}` };
    }
    return {
      ready: false,
      note:
        value === 'email'
          ? 'No email provider configured — set EMAIL_DRIVER and RESEND_API_KEY'
          : 'No SMS provider configured — set SMS_DRIVER and its credentials',
    };
  };

  const openComposer = () => {
    setSubject('');
    setBody('');
    setAudience(AUDIENCES[0].label);
    setGoesOutAt('');
    setCopies('');
    setProblem(null);
    setResult(null);
    setIsComposing(true);
  };

  /** `draft` writes the campaign down and stops; the log sends it when the office is ready. */
  const compose = async (event: React.FormEvent, mode: 'send' | 'draft') => {
    event.preventDefault();
    if (!body.trim() || sending) return;

    setSending(true);
    setProblem(null);
    try {
      const created = await broadcastsApi.create({
        channel,
        subject: channel === 'email' ? subject.trim() || undefined : undefined,
        body: body.trim(),
        audience,
        scheduledFor: goesOutAt ? new Date(goesOutAt).toISOString() : undefined,
      });

      if (mode === 'draft') {
        broadcasts.setItems((list) => [created.data, ...list]);
        setIsComposing(false);
        return;
      }

      const sent = await broadcastsApi.send(created.data.id, {
        recipients: channel === 'notice_sheet' ? Number(copies) || 0 : undefined,
      });
      setResult({ broadcast: sent.data, delivery: sent.data.delivery });
      broadcasts.setItems((list) => [sent.data, ...list]);
    } catch (error) {
      setProblem(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  /** Sending a campaign the office wrote earlier, from the log rather than the composer. */
  const sendRow = async (row: BroadcastDto) => {
    setBusyId(row.id);
    setProblem(null);
    try {
      const sent = await broadcastsApi.send(row.id, {
        recipients: row.channel === 'notice_sheet' ? row.recipients : undefined,
      });
      broadcasts.setItems((list) => list.map((entry) => (entry.id === row.id ? sent.data : entry)));
    } catch (error) {
      setProblem(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const retireRow = async (row: BroadcastDto) => {
    setBusyId(row.id);
    setProblem(null);
    try {
      await broadcastsApi.retire(row.id, {
        reason: 'other',
        reasonLabel: 'Withdrawn by the church office',
      });
      await broadcasts.refetch();
    } catch (error) {
      setProblem(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const publishing = readiness(channel);

  return (
    <div className="flex flex-col space-y-6">
      {/* What the gateways will actually do, before anybody composes anything. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Campaigns sent</span>
          <div className="text-2xl font-black text-[#1C1917] mt-0.5">{totals.campaigns}</div>
          <span className="text-xs text-[#57534E]">
            {rows.filter((row) => row.status !== 'sent').length} still unsent of {rows.length} composed
          </span>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Delivered</span>
          <div className="text-2xl font-black text-[#059669] mt-0.5">{totals.delivered.toLocaleString()}</div>
          <span className="text-xs text-[#57534E]">Counted by the gateway, not by us</span>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Failed</span>
          <div className="text-2xl font-black text-[#B91C1C] mt-0.5">{totals.failed.toLocaleString()}</div>
          <span className="text-xs text-[#57534E]">Reasons are kept with each campaign</span>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Gateways</span>
          <div className="mt-1 space-y-1">
            {(['email', 'sms'] as const).map((value) => {
              const state = readiness(value);
              return (
                <div key={value} className="flex items-center gap-1.5 text-xs">
                  <span
                    aria-hidden="true"
                    className={`w-1.5 h-1.5 rounded-full ${state.ready ? 'bg-[#059669]' : 'bg-[#D97706]'}`}
                  ></span>
                  <span className="font-bold text-[#1C1917] capitalize">{value}</span>
                  <span className="text-[#57534E] truncate">{state.ready ? 'ready' : 'not configured'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4] mb-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">
                outbox
              </span>
              Broadcast log
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Every campaign the church has composed, with what the email or SMS gateway reported back.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#F8F1E9] rounded-[8px]">
              {(['all', 'email', 'sms', 'notice_sheet'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedChannel(value)}
                  className={`px-2 py-1 text-[11px] font-bold rounded-[6px] transition-all uppercase cursor-pointer ${
                    selectedChannel === value ? 'bg-[#C2410C] text-white' : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {value === 'notice_sheet' ? 'print' : value}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={openComposer}
              className="px-3 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                send
              </span>
              Compose
            </button>
          </div>
        </div>

        {broadcasts.loading && <LoadingBlock label="Reading the broadcast log…" />}
        {broadcasts.error && <ErrorBlock message={broadcasts.error} onRetry={() => void broadcasts.refetch()} />}

        {!broadcasts.loading && !broadcasts.error && filtered.length === 0 && (
          <EmptyBlock
            icon="campaign"
            title={rows.length === 0 ? 'Nothing sent yet' : 'No campaigns on that channel'}
            hint={
              rows.length === 0
                ? 'Compose a message and the gateway’s own delivery report lands here.'
                : 'Switch the filter, or compose on this channel.'
            }
          />
        )}

        <div className="space-y-3">
          {filtered.map((row) => (
            <div key={row.id} className="p-4 rounded-[12px] bg-[#FDF8F3] border border-[#E7E5E4]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E7E5E4]/60">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white ${
                      row.channel === 'email' ? 'bg-[#2563EB]' : row.channel === 'sms' ? 'bg-[#D97706]' : 'bg-[#57534E]'
                    }`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                      {row.channel === 'email' ? 'mail' : row.channel === 'sms' ? 'sms' : 'print'}
                    </span>
                  </span>
                  <div>
                    <span className="font-bold text-xs text-[#1C1917]">{row.subject ?? `${channelLabel(row.channel)} notice`}</span>
                    <div className="text-[11px] text-[#57534E]">
                      To <strong className="text-[#1C1917]">{row.lastReport?.audienceLabel ?? row.audience}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono font-bold text-[#A8A29E]">
                    {row.status === 'draft' ? 'Written ' : ''}
                    {when(stampOf(row))}
                  </span>
                  <div
                    className={`text-[10px] font-bold flex items-center justify-end gap-1 ${
                      row.status === 'sent' ? 'text-[#059669]' : 'text-[#57534E]'
                    }`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[12px]">
                      {row.status === 'sent' ? 'done_all' : 'schedule'}
                    </span>
                    {outcome(row)}
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#57534E] mt-2.5 leading-relaxed whitespace-pre-line">{row.body}</p>

              {canEdit && row.status !== 'sent' && (
                <div className="mt-3 pt-2.5 border-t border-[#E7E5E4]/60 flex flex-wrap items-center justify-end gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => void sendRow(row)}
                    disabled={busyId === row.id || !readiness(row.channel).ready}
                    title={readiness(row.channel).ready ? undefined : readiness(row.channel).note}
                    className="px-2.5 py-1 rounded-[6px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold cursor-pointer"
                  >
                    {busyId === row.id ? 'Sending…' : 'Send now'}
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void retireRow(row)}
                      disabled={busyId === row.id}
                      className="px-2.5 py-1 rounded-[6px] font-bold text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              )}

              {row.lastReport && row.lastReport.failures.length > 0 && (
                <div className="mt-3 p-2.5 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">Not delivered</span>
                  <ul className="mt-1 space-y-0.5">
                    {row.lastReport.failures.map((failure) => (
                      <li key={`${row.id}-${failure.recipient}`} className="text-[11px] text-[#7F1D1D]">
                        {failure.recipient} — {failure.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: COMPOSE */}
      {isComposing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...composingDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-xl w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Compose church broadcast</h3>
              <button
                type="button"
                onClick={() => setIsComposing(false)}
                aria-label="Close"
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            {result ? (
              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-[12px] bg-[#ECFDF5] border border-[#059669]/30">
                  <p className="text-xs font-bold text-[#047857]">
                    {result.delivery.recordedOnly
                      ? `Recorded ${result.broadcast.recipients.toLocaleString()} copies of the notice sheet.`
                      : `Sent to ${result.delivery.audienceLabel} — ${result.delivery.delivered} delivered, ${result.delivery.failed} failed.`}
                  </p>
                  {result.delivery.failures.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {result.delivery.failures.map((failure) => (
                        <li key={failure.recipient} className="text-[11px] text-[#7F1D1D]">
                          {failure.recipient} — {failure.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                  <button
                    type="button"
                    onClick={openComposer}
                    className="px-4 py-2 rounded-[8px] border border-[#E7E5E4] text-xs font-bold text-[#1C1917] hover:bg-[#F5EDE4] cursor-pointer"
                  >
                    Compose another
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsComposing(false)}
                    className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(event) => void compose(event, 'send')} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="broadcast-channel" className={LABEL}>
                      Channel
                    </label>
                    <select
                      id="broadcast-channel"
                      aria-label="Channel"
                      value={channel}
                      onChange={(event) => setChannel(event.target.value as BroadcastDto['channel'])}
                      className={`${FIELD} cursor-pointer`}
                    >
                      {CHANNELS.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="broadcast-recipients" className={LABEL}>
                      Audience
                    </label>
                    <select
                      id="broadcast-recipients"
                      aria-label="Audience"
                      value={audience}
                      onChange={(event) => setAudience(event.target.value)}
                      className={`${FIELD} cursor-pointer`}
                    >
                      {AUDIENCES.map((entry) => (
                        <option key={entry.label} value={entry.label}>
                          {entry.label} — {entry.hint}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!publishing.ready && (
                  <div className="p-3 rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A]">
                    <p className="text-[11px] text-[#B45309] font-semibold">{publishing.note}</p>
                    <p className="text-[11px] text-[#B45309] mt-0.5">
                      Sending is refused rather than recorded as sent, so nothing is lost silently.
                    </p>
                  </div>
                )}

                {channel === 'email' && (
                  <div>
                    <label htmlFor="broadcast-subject" className={LABEL}>
                      Subject
                    </label>
                    <input
                      id="broadcast-subject"
                      aria-label="Subject"
                      type="text"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="Sunday service and fellowship"
                      className={FIELD}
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="broadcast-body" className={LABEL}>
                      Message
                    </label>
                    {channel === 'sms' && (
                      <span className="text-[10px] text-[#A8A29E] font-mono">
                        {body.length} chars · {Math.max(1, Math.ceil(body.length / 160))} SMS segment(s)
                      </span>
                    )}
                  </div>
                  <textarea
                    id="broadcast-body"
                    aria-label="Message"
                    rows={channel === 'sms' ? 3 : 6}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder={channel === 'sms' ? 'Short and specific — this lands on a phone.' : 'What the church needs to know.'}
                    className={FIELD}
                  />
                </div>

                <div>
                  <label htmlFor="broadcast-schedule" className={LABEL}>
                    Send at (optional)
                  </label>
                  <input
                    id="broadcast-schedule"
                    type="datetime-local"
                    value={goesOutAt}
                    onChange={(event) => setGoesOutAt(event.target.value)}
                    className={FIELD}
                  />
                  <p className="text-[11px] text-[#57534E] mt-1">
                    Leave it empty to send when you press Send, or save the campaign as a draft and come back to it.
                  </p>
                </div>

                {channel === 'notice_sheet' && (
                  <div>
                    <label htmlFor="broadcast-copies" className={LABEL}>
                      Copies printed
                    </label>
                    <input
                      id="broadcast-copies"
                      aria-label="Copies printed"
                      type="number"
                      min={0}
                      value={copies}
                      onChange={(event) => setCopies(event.target.value)}
                      placeholder="120"
                      className={FIELD}
                    />
                    <p className="text-[11px] text-[#57534E] mt-1">
                      A notice sheet has no gateway to count for it, so the record keeps your number.
                    </p>
                  </div>
                )}

                {problem && <ErrorBlock message={problem} />}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                  <button
                    type="button"
                    onClick={() => setIsComposing(false)}
                    className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(event) => void compose(event, 'draft')}
                    disabled={sending || !body.trim()}
                    className="px-4 py-2 rounded-[8px] border border-[#E7E5E4] hover:bg-[#F5EDE4] disabled:opacity-60 disabled:cursor-not-allowed text-xs font-bold text-[#1C1917] cursor-pointer"
                  >
                    {goesOutAt ? 'Save for later' : 'Save draft'}
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !body.trim() || !publishing.ready || Boolean(goesOutAt)}
                    title={goesOutAt ? 'Saved as a draft until its time comes' : undefined}
                    className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                      send
                    </span>
                    {sending ? 'Sending…' : 'Send now'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
