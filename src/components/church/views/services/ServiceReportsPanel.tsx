import React, { useState } from 'react';
import { ServiceReportItem, WorshipService } from '../../../../types';
import { INITIAL_SERVICE_REPORTS, INITIAL_SERVICES } from '../../../../data/churchMockData';
import { useDialog } from '../../dialog';
import { interactiveCard } from '../../interactiveCard';

export const ServiceReportsPanel: React.FC = () => {
  const [reports, setReports] = useState<ServiceReportItem[]>(INITIAL_SERVICE_REPORTS);
  const [selectedReportId, setSelectedReportId] = useState<string>(INITIAL_SERVICE_REPORTS[0].id);
  const [isFilingReport, setIsFilingReport] = useState<boolean>(false);
  const filingReportDialog = useDialog(() => setIsFilingReport(false), "File Post-Service Summary Report");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const printModalOpenDialog = useDialog(() => setIsPrintModalOpen(false), "Lord’s Day Service Dossier");

  // Form State for New Service Report
  const [targetServiceId, setTargetServiceId] = useState<string>(INITIAL_SERVICES[0].id);
  const [preacherName, setPreacherName] = useState<string>('Bishop Sammy');
  const [sermonTopic, setSermonTopic] = useState<string>('The Sovereign Shepherd of Israel (John 10:11-18)');
  const [attendance, setAttendance] = useState<number>(340);
  const [visitors, setVisitors] = useState<number>(12);
  const [salvations, setSalvations] = useState<number>(3);
  const [offering, setOffering] = useState<number>(8920.0);
  const [testimonies, setTestimonies] = useState<string>('Two families expressed desire to begin member membership classes.\nElder Wanjala celebrated milestone anniversary with thanksgiving.');
  const [incidents, setIncidents] = useState<string>('Entrance speaker channel 2 crackle observed during prelude; volume balanced.');
  const [pastoralNotes, setPastoralNotes] = useState<string>('Bishop Sammy to conduct hospital visit for Sister Otieno on Tuesday.\nClara Wambui to deliver new visitor packages to 4 families.');
  const [submittedBy, setSubmittedBy] = useState<string>('Elder Marcus Kamau (Clerk Pro-Tem)');

  const currentReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    const serviceObj = INITIAL_SERVICES.find((s) => s.id === targetServiceId) || INITIAL_SERVICES[0];

    const newReport: ServiceReportItem = {
      id: `rep-${Date.now()}`,
      serviceId: serviceObj.id,
      serviceTitle: serviceObj.title,
      date: serviceObj.date,
      preacher: preacherName,
      sermonTopic,
      attendanceTotal: Number(attendance),
      firstTimeVisitors: Number(visitors),
      salvationsAndDecisions: Number(salvations),
      offeringCollected: Number(offering),
      testimoniesHighlights: testimonies.split('\n').filter((t) => t.trim().length > 0),
      equipmentIncidents: incidents.split('\n').filter((i) => i.trim().length > 0),
      pastoralFollowUpNotes: pastoralNotes.split('\n').filter((p) => p.trim().length > 0),
      submittedBy,
      submissionDate: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };

    setReports([newReport, ...reports]);
    setSelectedReportId(newReport.id);
    setIsFilingReport(false);
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Top Banner & Fast Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Archived Reports</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">{reports.length} Sealed</div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">verified</span>
              Official Docket
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">summarize</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Avg Offering / Lord's Day</span>
            <div className="text-2xl font-black text-[#059669] mt-0.5">
              KSh {(reports.reduce((acc, r) => acc + r.offeringCollected, 0) / (reports.length || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-[#57534E] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
              Diaconal verified
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#059669]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">paid</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Salvation & Decisions</span>
            <div className="text-2xl font-black text-[#C2410C] mt-0.5">
              {reports.reduce((acc, r) => acc + r.salvationsAndDecisions, 0)} Total
            </div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">favorite</span>
              Catechism inquiries active
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">volunteer_activism</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Active Pastoral Tasks</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">
              {currentReport.pastoralFollowUpNotes.length} Action Items
            </div>
            <span className="text-xs text-[#D97706] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">assignment_turned_in</span>
              Assigned to Pastoral Staff
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#D97706]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">elderly</span>
          </div>
        </div>
      </div>

      {/* Main Dual View: Reports Index (Left) & Detailed Report View (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Report History Index (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#FFFFFF] rounded-[14px] p-4 border border-[#E7E5E4] shadow-warm-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline text-sm font-bold text-[#1C1917] flex items-center gap-1.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#C2410C]">history_edu</span>
                Past Service Records
              </h3>
              <button
                type="button"
                onClick={() => setIsFilingReport(true)}
                className="px-2.5 py-1.5 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add</span>
                File Report
              </button>
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {reports.map((rep) => {
                const isSelected = rep.id === currentReport.id;
                return (
                  <div
                    key={rep.id}
                    {...interactiveCard(() => setSelectedReportId(rep.id))}
                    className={`p-3.5 rounded-[12px] border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FDF8F3] border-[#C2410C] ring-2 ring-[#C2410C]/20 shadow-sm'
                        : 'bg-[#FFFFFF] border-[#E7E5E4] hover:bg-[#F8F1E9]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#C2410C]">{rep.date}</span>
                      <span className="text-[10px] font-mono text-[#A8A29E]">{rep.submissionDate}</span>
                    </div>

                    <h4 className="font-headline text-xs font-bold text-[#1C1917] mt-1 line-clamp-1">
                      {rep.serviceTitle}
                    </h4>

                    <div className="text-[11px] text-[#57534E] line-clamp-1 mt-0.5">
                      Preacher: {rep.preacher}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#A8A29E] mt-2 pt-2 border-t border-[#E7E5E4]/80">
                      <span className="text-[#059669] font-bold">${rep.offeringCollected.toLocaleString()}</span>
                      <span className="font-semibold text-[#1C1917]">{rep.attendanceTotal} Worshippers</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Detailed Report Dossier (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E7E5E4]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-[#059669]/10 text-[#059669] text-[11px] font-bold uppercase tracking-wider">
                    Official Council Record
                  </span>
                  <span className="text-xs font-mono text-[#A8A29E]">Filed on {currentReport.submissionDate}</span>
                </div>
                <h2 className="font-headline text-xl font-extrabold text-[#1C1917]">
                  {currentReport.serviceTitle}
                </h2>
                <div className="text-xs text-[#57534E] mt-1">
                  Exposition: <strong className="text-[#1C1917]">{currentReport.sermonTopic}</strong> · Preacher: <strong className="text-[#C2410C]">{currentReport.preacher}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3 py-2 rounded-[9px] bg-[#F8F1E9] hover:bg-[#F5EDE4] text-[#C2410C] text-xs font-bold border border-[#E7E5E4] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">print</span>
                  Print Dossier
                </button>
              </div>
            </div>

            {/* Key Service Numbers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-5 border-b border-[#E7E5E4]">
              <div className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] text-center">
                <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Total Attendance</span>
                <div className="text-xl font-black text-[#1C1917] mt-0.5">{currentReport.attendanceTotal}</div>
              </div>

              <div className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] text-center">
                <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">First-Time Guests</span>
                <div className="text-xl font-black text-[#C2410C] mt-0.5">{currentReport.firstTimeVisitors}</div>
              </div>

              <div className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] text-center">
                <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Decisions / Vows</span>
                <div className="text-xl font-black text-[#059669] mt-0.5">{currentReport.salvationsAndDecisions}</div>
              </div>

              <div className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] text-center">
                <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Offering Harvest</span>
                <div className="text-xl font-black text-[#059669] mt-0.5">${currentReport.offeringCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* 3 Detail Blocks: Testimonies, Technical Incidents, Pastoral Follow-up */}
            <div className="py-5 space-y-5">
              {/* Testimonies & Highlights */}
              <div>
                <h4 className="font-headline text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#059669]">campaign</span>
                  Praise Testimonies & Service Highlights
                </h4>
                <div className="space-y-1.5">
                  {currentReport.testimoniesHighlights.map((testimony, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] text-xs text-[#1C1917] flex items-start gap-2"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#059669] shrink-0 mt-0.5">check_circle</span>
                      <span>{testimony}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical / Facility Incidents */}
              <div>
                <h4 className="font-headline text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#D97706]">build</span>
                  Technical, Sound & Sanctuary Operations
                </h4>
                <div className="space-y-1.5">
                  {currentReport.equipmentIncidents.map((incident, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] text-xs text-[#1C1917] flex items-start gap-2"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#D97706] shrink-0 mt-0.5">warning</span>
                      <span>{incident}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pastoral Follow-up Action Items */}
              <div>
                <h4 className="font-headline text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#C2410C]">assignment_ind</span>
                  Pastoral Care & Diaconal Follow-Up Action Items
                </h4>
                <div className="space-y-1.5">
                  {currentReport.pastoralFollowUpNotes.map((note, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#C2410C]/30 text-xs text-[#1C1917] flex items-start gap-2"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#C2410C] shrink-0 mt-0.5">task_alt</span>
                      <span className="font-medium">{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Signature */}
            <div className="pt-4 border-t border-[#E7E5E4] flex flex-col sm:flex-row items-center justify-between text-xs text-[#57534E] gap-2">
              <div>
                Submitted by: <strong className="text-[#1C1917]">{currentReport.submittedBy}</strong>
              </div>
              <div className="text-[11px] text-[#A8A29E] font-mono">
                Official Report Archive Ref: #{currentReport.id.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: File New Post-Service Report */}
      {isFilingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...filingReportDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-xl w-full p-6 shadow-2xl border border-[#E7E5E4] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-[8px] bg-[#C2410C]/10 text-[#C2410C]">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">summarize</span>
                </span>
                <h3 className="font-headline text-base font-bold text-[#1C1917]">File Post-Service Summary Report</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilingReport(false)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="mt-4 space-y-4">
              <div>
                <label htmlFor="report-service" className="block text-xs font-bold text-[#1C1917] mb-1">Target Service</label>
                <select id="report-service" aria-label="Target Service"
                  value={targetServiceId}
                  onChange={(e) => setTargetServiceId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                >
                  {INITIAL_SERVICES.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.title} ({srv.date})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="report-preacher" className="block text-xs font-bold text-[#1C1917] mb-1">Preacher</label>
                  <input id="report-preacher" aria-label="Preacher"
                    type="text"
                    required
                    value={preacherName}
                    onChange={(e) => setPreacherName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
                <div>
                  <label htmlFor="report-sermon" className="block text-xs font-bold text-[#1C1917] mb-1">Sermon Topic & Scripture</label>
                  <input id="report-sermon" aria-label="Sermon Topic &amp; Scripture"
                    type="text"
                    required
                    value={sermonTopic}
                    onChange={(e) => setSermonTopic(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="report-attendance" className="block text-xs font-bold text-[#1C1917] mb-1">Attendance</label>
                  <input id="report-attendance" aria-label="Attendance"
                    type="number"
                    min={0}
                    value={attendance}
                    onChange={(e) => setAttendance(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="report-visitors" className="block text-xs font-bold text-[#1C1917] mb-1">Visitors</label>
                  <input id="report-visitors" aria-label="Visitors"
                    type="number"
                    min={0}
                    value={visitors}
                    onChange={(e) => setVisitors(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="report-decisions" className="block text-xs font-bold text-[#1C1917] mb-1">Decisions</label>
                  <input id="report-decisions" aria-label="Decisions"
                    type="number"
                    min={0}
                    value={salvations}
                    onChange={(e) => setSalvations(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="report-offering" className="block text-xs font-bold text-[#1C1917] mb-1">Offering (KSh)</label>
                  <input id="report-offering" aria-label="Offering (KSh)"
                    type="number"
                    min={0}
                    step="0.01"
                    value={offering}
                    onChange={(e) => setOffering(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="report-testimonies" className="block text-xs font-bold text-[#1C1917] mb-1">Testimonies & Highlights (One per line)</label>
                <textarea id="report-testimonies" aria-label="Testimonies &amp; Highlights (One per line)"
                  rows={2}
                  value={testimonies}
                  onChange={(e) => setTestimonies(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div>
                <label htmlFor="report-incidents" className="block text-xs font-bold text-[#1C1917] mb-1">Technical / Sound / Facility Incidents</label>
                <textarea id="report-incidents" aria-label="Technical / Sound / Facility Incidents"
                  rows={2}
                  value={incidents}
                  onChange={(e) => setIncidents(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div>
                <label htmlFor="report-pastoral-notes" className="block text-xs font-bold text-[#1C1917] mb-1">Pastoral Follow-Up Notes (One per line)</label>
                <textarea id="report-pastoral-notes" aria-label="Pastoral Follow-Up Notes (One per line)"
                  rows={2}
                  value={pastoralNotes}
                  onChange={(e) => setPastoralNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div>
                <label htmlFor="report-submitted-by" className="block text-xs font-bold text-[#1C1917] mb-1">Submitted By</label>
                <input id="report-submitted-by" aria-label="Submitted By"
                  type="text"
                  required
                  value={submittedBy}
                  onChange={(e) => setSubmittedBy(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsFilingReport(false)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Seal & Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Print Dossier View */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...printModalOpenDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-2xl w-full p-8 shadow-2xl border border-[#E7E5E4] max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in duration-150 font-serif">
            <div className="flex items-center justify-between pb-4 border-b-2 border-[#1C1917]">
              <div>
                <span className="text-xs uppercase tracking-widest font-sans font-bold text-[#C2410C]">
                  Destiny Sanctuary Council Records
                </span>
                <h2 className="text-2xl font-bold text-[#1C1917] mt-0.5">Lord’s Day Service Dossier</h2>
                <div className="text-xs font-sans text-[#57534E] mt-1">
                  Service Date: {currentReport.date} · Recorded by {currentReport.submittedBy}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="font-sans text-[#57534E] hover:text-[#1C1917] p-1.5 rounded-md border border-[#E7E5E4]"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-6 space-y-4 font-sans text-xs">
              <div className="grid grid-cols-4 gap-3 text-center border p-3 rounded-lg bg-[#F8F1E9]">
                <div>
                  <div className="text-[#A8A29E] uppercase font-bold text-[10px]">Attendance</div>
                  <div className="text-lg font-bold text-[#1C1917]">{currentReport.attendanceTotal}</div>
                </div>
                <div>
                  <div className="text-[#A8A29E] uppercase font-bold text-[10px]">Visitors</div>
                  <div className="text-lg font-bold text-[#C2410C]">{currentReport.firstTimeVisitors}</div>
                </div>
                <div>
                  <div className="text-[#A8A29E] uppercase font-bold text-[10px]">Decisions</div>
                  <div className="text-lg font-bold text-[#059669]">{currentReport.salvationsAndDecisions}</div>
                </div>
                <div>
                  <div className="text-[#A8A29E] uppercase font-bold text-[10px]">Offering</div>
                  <div className="text-lg font-bold text-[#059669]">${currentReport.offeringCollected.toLocaleString()}</div>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-sm text-[#1C1917] border-b pb-1 mb-2">Pastoral Notes</h5>
                <ul className="list-disc pl-5 space-y-1 text-[#57534E]">
                  {currentReport.pastoralFollowUpNotes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E7E5E4] flex justify-end">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-[8px] bg-[#C2410C] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">print</span>
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
