import React, { useState } from 'react';
import { BroadcastItem, BroadcastTemplate } from '../../../../types';
import { INITIAL_BROADCAST_HISTORY, INITIAL_BROADCAST_TEMPLATES } from '../../../../data/churchMockData';

export const BroadcastsPanel: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>(INITIAL_BROADCAST_HISTORY);
  const [templates, setTemplates] = useState<BroadcastTemplate[]>(INITIAL_BROADCAST_TEMPLATES);
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'sms' | 'email'>('all');

  // Broadcast Composer State
  const [channel, setChannel] = useState<'sms' | 'email'>('email');
  const [subject, setSubject] = useState<string>('');
  const [messageBody, setMessageBody] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('All Members & Regular Attenders (342 recipients)');
  const [senderName, setSenderName] = useState<string>('Church Office (Carolyn Wright)');

  const handleApplyTemplate = (tmpl: BroadcastTemplate) => {
    if (tmpl.channel === 'both') {
      setChannel('email');
    } else {
      setChannel(tmpl.channel);
    }
    if (tmpl.subject) setSubject(tmpl.subject);
    setMessageBody(tmpl.body);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim()) return;

    const newBroadcast: BroadcastItem = {
      id: `bc-${Date.now()}`,
      channel,
      subject: channel === 'email' ? subject || 'Church Dispatch' : undefined,
      messageBody,
      targetAudience,
      totalRecipients: 342,
      sentCount: 342,
      deliveredCount: 340,
      failedCount: 2,
      openRatePercent: channel === 'email' ? 76.5 : 98.2,
      clickRatePercent: channel === 'email' ? 38.0 : undefined,
      sentAt: 'Just now',
      senderName,
      status: 'sent',
    };

    setBroadcasts([newBroadcast, ...broadcasts]);
    setIsComposing(false);
    setSubject('');
    setMessageBody('');
  };

  const filteredBroadcasts = broadcasts.filter((b) => {
    if (selectedChannel === 'all') return true;
    return b.channel === selectedChannel;
  });

  return (
    <div className="flex flex-col space-y-6">
      {/* Broadcast Telemetry Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Dispatched Messages</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">
              {broadcasts.reduce((acc, b) => acc + b.totalRecipients, 0)} Total
            </div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">send</span>
              Gateway status: 100% Operational
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">forward_to_inbox</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Delivery Success Rate</span>
            <div className="text-2xl font-black text-[#059669] mt-0.5">99.2%</div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">done_all</span>
              Carrier TLS 1.3 encryption
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#059669]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">mark_email_read</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Email Open Rate</span>
            <div className="text-2xl font-black text-[#2563EB] mt-0.5">78.4%</div>
            <span className="text-xs text-[#57534E] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">visibility</span>
              2.4x higher than nonprofit average
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#2563EB]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">insights</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">SMS Instant Reach</span>
            <div className="text-2xl font-black text-[#D97706] mt-0.5">98.0% Read</div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">sms</span>
              &lt; 3 mins average open latency
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#D97706]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">chat</span>
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Template Library & Broadcast History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Quick Dispatch Templates */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#FFFFFF] rounded-[14px] p-4 border border-[#E7E5E4] shadow-warm-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline text-sm font-bold text-[#1C1917] flex items-center gap-1.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#C2410C]">bookmark</span>
                Message Templates
              </h3>
              <span className="text-[11px] font-bold text-[#A8A29E]">{templates.length} Ready</span>
            </div>

            <p className="text-xs text-[#57534E] mb-3">
              Pre-approved approved copy with dynamic variable interpolation.
            </p>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-3 rounded-[10px] bg-[#FDF8F3] hover:bg-[#F5EDE4]/60 border border-[#E7E5E4] transition-all"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-[#1C1917] line-clamp-1">{tmpl.title}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E7E5E4] text-[#1C1917]">
                      {tmpl.channel}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#57534E] line-clamp-2 italic mb-2">
                    {tmpl.body}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      handleApplyTemplate(tmpl);
                      setIsComposing(true);
                    }}
                    className="w-full py-1 rounded-[6px] bg-[#FFFFFF] hover:bg-[#C2410C] hover:text-white text-[#C2410C] text-[11px] font-bold border border-[#E7E5E4] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">edit_note</span>
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (8 cols): Broadcast History & Telemetry Log */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4] mb-4">
              <div>
                <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">outbox</span>
                  Broadcast Transmission Logs
                </h3>
                <p className="text-xs text-[#57534E] mt-0.5">
                  Audit logs of emails and SMS dispatches sent via church gateways.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-[#F8F1E9] rounded-[8px]">
                  {(['all', 'sms', 'email'] as const).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setSelectedChannel(ch)}
                      className={`px-2 py-1 text-[11px] font-bold rounded-[6px] transition-all uppercase ${
                        selectedChannel === ch
                          ? 'bg-[#C2410C] text-white'
                          : 'text-[#57534E] hover:text-[#1C1917]'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsComposing(true)}
                  className="px-3 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">send</span>
                  Compose Broadcast
                </button>
              </div>
            </div>

            {/* Broadcasts History List */}
            <div className="space-y-3">
              {filteredBroadcasts.map((bc) => (
                <div
                  key={bc.id}
                  className="p-4 rounded-[12px] bg-[#FDF8F3] border border-[#E7E5E4] hover:border-[#C2410C]/40 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E7E5E4]/60">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white ${
                          bc.channel === 'email' ? 'bg-[#2563EB]' : 'bg-[#D97706]'
                        }`}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                          {bc.channel === 'email' ? 'mail' : 'sms'}
                        </span>
                      </span>
                      <div>
                        <span className="font-bold text-xs text-[#1C1917]">
                          {bc.channel === 'email' ? bc.subject : 'SMS Direct Broadcast'}
                        </span>
                        <div className="text-[11px] text-[#57534E]">
                          Target: <strong className="text-[#1C1917]">{bc.targetAudience}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-mono font-bold text-[#A8A29E]">{bc.sentAt}</span>
                      <div className="text-[10px] text-[#059669] font-bold flex items-center justify-end gap-1">
                        <span aria-hidden="true" className="material-symbols-outlined text-[12px]">check</span>
                        {bc.deliveredCount} / {bc.totalRecipients} Delivered
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#57534E] mt-2.5 font-sans leading-relaxed line-clamp-2">
                    {bc.messageBody}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-[#E7E5E4]/60 flex items-center justify-between text-[11px] text-[#A8A29E]">
                    <div className="flex items-center gap-4">
                      {bc.openRatePercent && (
                        <span>
                          Open Rate: <strong className="text-[#2563EB]">{bc.openRatePercent}%</strong>
                        </span>
                      )}
                      {bc.clickRatePercent && (
                        <span>
                          Click-thru: <strong className="text-[#059669]">{bc.clickRatePercent}%</strong>
                        </span>
                      )}
                      <span>
                        Sender: <strong className="text-[#1C1917]">{bc.senderName}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Compose Broadcast */}
      {isComposing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-xl w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-[8px] bg-[#C2410C]/10 text-[#C2410C]">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">send</span>
                </span>
                <h3 className="font-headline text-base font-bold text-[#1C1917]">Compose Church Broadcast</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsComposing(false)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Transmission Channel</label>
                  <select aria-label="Transmission Channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  >
                    <option value="email">Email Gateway (SendGrid / SMTP)</option>
                    <option value="sms">SMS Text Alert (Twilio Carrier)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Target Recipient List</label>
                  <select aria-label="Target Recipient List"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  >
                    <option value="All Members & Regular Attenders (342 recipients)">
                      All Members & Attenders (342)
                    </option>
                    <option value="Worship Band & AV Volunteer Roster (24 recipients)">
                      Worship & Sound Team (24)
                    </option>
                    <option value="Elders & Deacons Prayer Intercessors (16 recipients)">
                      Elders & Deacons (16)
                    </option>
                    <option value="Youth Fellowship & Parents (58 recipients)">
                      Youth Fellowship & Parents (58)
                    </option>
                  </select>
                </div>
              </div>

              {channel === 'email' && (
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Email Subject *</label>
                  <input aria-label="Email Subject"
                    type="text"
                    required
                    placeholder="e.g. Destiny Sanctuary Herald: Sunday Service & Fellowship"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#1C1917]">Message Body *</label>
                  <span className="text-[10px] text-[#A8A29E] font-mono">
                    {channel === 'sms' ? `${messageBody.length} / 160 chars (1 SMS segment)` : `${messageBody.length} chars`}
                  </span>
                </div>
                <textarea aria-label="Message Body"
                  rows={channel === 'sms' ? 3 : 6}
                  required
                  placeholder={channel === 'sms' ? 'Enter SMS text (use {{FirstName}} for personalization)...' : 'Write email content in Markdown or plaintext...'}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Sender Signature / Identity</label>
                <input aria-label="Sender Signature / Identity"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">send</span>
                  Dispatch Broadcast Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
