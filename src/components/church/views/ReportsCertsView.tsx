import React, { useState } from 'react';

type CertificateType = 'baptism' | 'dedication' | 'matrimony' | 'confirmation';

export const ReportsCertsView: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeCertTab, setActiveCertTab] = useState<CertificateType>('baptism');

  // Certificate form states
  const [candidateName, setCandidateName] = useState('Caleb Timothy Vance (#091 • Member Youth)');
  const [candidateDisplayName, setCandidateDisplayName] = useState('Caleb Timothy Vance');
  const [officiatingMinister, setOfficiatingMinister] = useState('Bishop Sammy');
  const [ceremonyDate, setCeremonyDate] = useState('November 24, 2024 (Christ the King Sunday)');
  const [displayDate, setDisplayDate] = useState('Nov 24, 2024');
  const [scriptureVerse, setScriptureVerse] = useState(
    'Romans 6:4 — "We were buried therefore with him by baptism into death, in order that, just as Christ was raised..."'
  );
  const [pastoralSeal, setPastoralSeal] = useState('Embossed Gold Seal');
  const [parishRollNo] = useState('GVF-BAP-2024-042');
  const [witnesses, setWitnesses] = useState('Elder Marcus Jenkins & Deaconess Clara Oswald');

  // Financial report states
  const [departmentScope, setDepartmentScope] = useState('All Departments (7)');
  const [fiscalPeriod, setFiscalPeriod] = useState('Q4 2024 (Oct – Dec)');
  const [accountingBasis, setAccountingBasis] = useState('Cash vs Accrual (Dual Audit)');
  const [dossierOutput, setDossierOutput] = useState('PDF Audit Dossier (Sign-off Sheet)');
  const [lineItemReceipts, setLineItemReceipts] = useState(true);
  const [trusteeDualCustody, setTrusteeDualCustody] = useState(true);
  const [varianceCommentary, setVarianceCommentary] = useState(true);
  const [suppressDonorIds, setSuppressDonorIds] = useState(false);

  // AGM Dossier states
  const [coverArtwork, setCoverArtwork] = useState('Warm Ember Classical Sanctuary Engraving');
  const [autoToc, setAutoToc] = useState(true);
  const [governanceAppendix, setGovernanceAppendix] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleCertTabChange = (type: CertificateType) => {
    setActiveCertTab(type);
    if (type === 'baptism') {
      setCandidateName('Caleb Timothy Vance (#091 • Member Youth)');
      setCandidateDisplayName('Caleb Timothy Vance');
      setScriptureVerse('Romans 6:4 — "We were buried therefore with him by baptism into death, in order that, just as Christ was raised..."');
    } else if (type === 'dedication') {
      setCandidateName('Hannah Joy Miller (Infant • Child Presentation)');
      setCandidateDisplayName('Hannah Joy Miller');
      setScriptureVerse('1 Samuel 1:28 — "For this child I prayed, and the Lord has granted me my petition which I asked of Him."');
    } else if (type === 'matrimony') {
      setCandidateName('Jonathan & Martha Sterling');
      setCandidateDisplayName('Jonathan & Martha Sterling');
      setScriptureVerse('Colossians 3:14 — "And over all these virtues put on love, which binds them all together in perfect unity."');
    } else if (type === 'confirmation') {
      setCandidateName('Lucas Montgomery (#144 • New Believer)');
      setCandidateDisplayName('Lucas Montgomery');
      setScriptureVerse('2 Timothy 1:7 — "For God gave us a spirit not of fear but of power and love and self-control."');
    }
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-[#1e1b19] text-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <span aria-hidden="true" className="material-symbols-outlined text-[#85f8c4] text-[20px]">check_circle</span>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Actions Bar */}
      <div className="pt-2 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#f4ece8] text-[#59413a] text-[11px] font-semibold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c]"></span>
            Church Documentation & Archives • Q4 Audit Compliant
          </div>
          <h1 className="font-headline text-3xl sm:text-4xl text-[#1e1b19] font-bold tracking-tight">
            Reports & Certificates Hub
          </h1>
          <p className="text-sm text-[#59413a] max-w-2xl">
            Official church document generation, membership certificates registry, and Annual General Meeting (AGM) legislative compilations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => showToast("Opening Church Archive Vault: 142 historical dossiers indexed.")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#f4ece8] text-[#1e1b19] font-semibold text-xs hover:bg-[#eee7e3] transition-colors shadow-sm cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[19px] text-[#904d00]">inventory_2</span>
            <span>Archive Vault (142)</span>
          </button>
          <button 
            type="button"
            onClick={() => showToast("Launching Custom Document Wizard for church clerk...")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#c2410c] text-white font-semibold text-xs hover:bg-[#9b2f00] transition-all shadow-[0_2px_8px_rgba(194,65,12,0.25)] cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[19px]">add_circle</span>
            <span>+ Custom Document</span>
          </button>
        </div>
      </div>

      {/* Metric / Telemetry Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-2 mb-8">
        <div className="p-4 rounded-xl bg-white shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(194,65,12,0.02)] border border-[#e1bfb5]/40 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#f4ece8] flex items-center justify-center shrink-0 text-[#c2410c]">
            <span aria-hidden="true" className="material-symbols-outlined text-[22px]">description</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-[#59413a] truncate">Generated This Quarter</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-headline text-[#1e1b19] font-bold">328</span>
              <span className="text-xs text-[#006243] font-bold">+14.2%</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(194,65,12,0.02)] border border-[#e1bfb5]/40 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#ffdcc3]/40 flex items-center justify-center shrink-0 text-[#904d00]">
            <span aria-hidden="true" className="material-symbols-outlined text-[22px]">history_edu</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-[#59413a] truncate">Pending Sign-offs</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-headline text-[#904d00] font-bold">3 Seals</span>
              <span className="text-xs text-[#59413a]">Clergy Action</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(194,65,12,0.02)] border border-[#e1bfb5]/40 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#f4ece8] flex items-center justify-center shrink-0 text-[#9b2f00]">
            <span aria-hidden="true" className="material-symbols-outlined text-[22px]">verified</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-[#59413a] truncate">Active Cert Templates</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-headline text-[#1e1b19] font-bold">8</span>
              <span className="text-xs text-[#59413a]">Membership Formats</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(194,65,12,0.02)] border border-[#e1bfb5]/40 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#007d57]/15 flex items-center justify-center shrink-0 text-[#006243]">
            <span aria-hidden="true" className="material-symbols-outlined text-[22px]">menu_book</span>
          </div>
          <div className="flex flex-col min-w-0 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#59413a] truncate">AGM Dossier Status</span>
              <span className="text-xs text-[#006243] font-bold">85%</span>
            </div>
            <div className="w-full bg-[#f4ece8] h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-[#006243] h-full rounded-full w-[85%] transition-all duration-500"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-8">
        {/* SECTION 1: Departmental Finance Reports */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(194,65,12,0.02)] border border-[#e1bfb5]/40 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f4ece8] flex items-center justify-center text-[#c2410c] shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[26px]">account_balance_wallet</span>
              </div>
              <div>
                <h2 className="font-headline text-xl sm:text-2xl text-[#1e1b19] font-bold tracking-tight">
                  Departmental Finance & Stewardship Reports
                </h2>
                <p className="text-xs sm:text-sm text-[#59413a] mt-0.5">
                  Generate GAAP-compliant expense, tithe disbursement, and departmental budget execution dossiers.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4ece8] text-[#59413a] text-xs font-semibold self-start border border-[#e1bfb5]/50">
              <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#006243]">lock</span>
              <span>Church Council Ledger v4.2</span>
            </div>
          </div>

          {/* Filter Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-[#faf2ee] border border-[#e1bfb5]/30">
            <div className="space-y-1.5">
              <label className="text-[11px] font-headline text-[#59413a] font-bold uppercase tracking-wider block">
                Department Scope
              </label>
              <div className="relative">
                <select aria-label="Department Scope" 
                  value={departmentScope}
                  onChange={(e) => setDepartmentScope(e.target.value)}
                  className="w-full h-10 px-3 pr-8 rounded-lg bg-white text-xs font-medium text-[#1e1b19] appearance-none focus:outline-none shadow-sm cursor-pointer border border-[#e1bfb5]/50"
                >
                  <option>All Departments (7)</option>
                  <option>Men of Valor (Men's Fellowship)</option>
                  <option>Daughters of Grace (Women's Circle)</option>
                  <option>Apex Youth Ministry</option>
                  <option>Kingdom Kids Children's Dept</option>
                  <option>Mercy & Benevolence Fund</option>
                  <option>Berean Bible Academy</option>
                  <option>Church Council & Pastoral Secretariat</option>
                </select>
                <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#59413a] text-[18px]">expand_more</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-headline text-[#59413a] font-bold uppercase tracking-wider block">
                Fiscal Period
              </label>
              <div className="relative">
                <select aria-label="Fiscal Period" 
                  value={fiscalPeriod}
                  onChange={(e) => setFiscalPeriod(e.target.value)}
                  className="w-full h-10 px-3 pr-8 rounded-lg bg-white text-xs font-medium text-[#1e1b19] appearance-none focus:outline-none shadow-sm cursor-pointer border border-[#e1bfb5]/50"
                >
                  <option>Q4 2024 (Oct – Dec)</option>
                  <option>Q3 2024 (Jul – Sep)</option>
                  <option>Fiscal Year 2024 YTD</option>
                  <option>Custom Date Range…</option>
                </select>
                <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#59413a] text-[18px]">calendar_month</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-headline text-[#59413a] font-bold uppercase tracking-wider block">
                Accounting Basis
              </label>
              <div className="relative">
                <select aria-label="Accounting Basis" 
                  value={accountingBasis}
                  onChange={(e) => setAccountingBasis(e.target.value)}
                  className="w-full h-10 px-3 pr-8 rounded-lg bg-white text-xs font-medium text-[#1e1b19] appearance-none focus:outline-none shadow-sm cursor-pointer border border-[#e1bfb5]/50"
                >
                  <option>Cash vs Accrual (Dual Audit)</option>
                  <option>Strict Cash Basis</option>
                  <option>Modified Accrual (Fund Based)</option>
                </select>
                <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#59413a] text-[18px]">balance</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-headline text-[#59413a] font-bold uppercase tracking-wider block">
                Dossier Output
              </label>
              <div className="relative">
                <select aria-label="Dossier Output" 
                  value={dossierOutput}
                  onChange={(e) => setDossierOutput(e.target.value)}
                  className="w-full h-10 px-3 pr-8 rounded-lg bg-white text-xs font-medium text-[#1e1b19] appearance-none focus:outline-none shadow-sm cursor-pointer border border-[#e1bfb5]/50"
                >
                  <option>PDF Audit Dossier (Sign-off Sheet)</option>
                  <option>Excel Ledger Book (.xlsx)</option>
                  <option>Consolidated CSV Bundle</option>
                </select>
                <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#59413a] text-[18px]">file_download</span>
              </div>
            </div>
          </div>

          {/* Report Inclusions & Last Run Metadata */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-[#faf2ee]/70 border border-[#e1bfb5]/30">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[#1e1b19] select-none">
                <input 
                  type="checkbox" 
                  checked={lineItemReceipts} 
                  onChange={(e) => setLineItemReceipts(e.target.checked)}
                  className="w-4 h-4 rounded text-[#c2410c] cursor-pointer accent-[#c2410c]" 
                />
                <span>Line-item receipts ledger</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[#1e1b19] select-none">
                <input 
                  type="checkbox" 
                  checked={trusteeDualCustody}
                  onChange={(e) => setTrusteeDualCustody(e.target.checked)} 
                  className="w-4 h-4 rounded text-[#c2410c] cursor-pointer accent-[#c2410c]" 
                />
                <span>Trustee dual-custody hash</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[#1e1b19] select-none">
                <input 
                  type="checkbox" 
                  checked={varianceCommentary}
                  onChange={(e) => setVarianceCommentary(e.target.checked)} 
                  className="w-4 h-4 rounded text-[#c2410c] cursor-pointer accent-[#c2410c]" 
                />
                <span>Variance commentary & notes</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[#59413a] select-none">
                <input 
                  type="checkbox" 
                  checked={suppressDonorIds}
                  onChange={(e) => setSuppressDonorIds(e.target.checked)} 
                  className="w-4 h-4 rounded text-[#c2410c] cursor-pointer accent-[#c2410c]" 
                />
                <span>Suppress donor identities (Redacted)</span>
              </label>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#59413a]">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#006243]">check_circle</span>
              <span>Last generated: Nov 14, 2024 by Pastor Michael • <strong>Sealed • 44 pages</strong></span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                type="button"
                onClick={() => showToast(`Generating Financial Report for ${departmentScope} (${fiscalPeriod})... PDF compiled!`)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#c2410c] text-white font-semibold text-xs hover:bg-[#9b2f00] transition-all shadow-[0_2px_8px_rgba(194,65,12,0.25)] cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">receipt_long</span>
                <span>Generate Financial Report</span>
              </button>
              <button 
                type="button"
                onClick={() => showToast("Automated monthly schedule enabled for Church Council finance committee.")}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#f4ece8] text-[#1e1b19] font-semibold text-xs hover:bg-[#eee7e3] transition-colors cursor-pointer border border-[#e1bfb5]/40"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">schedule_send</span>
                <span>Schedule Monthly Automation</span>
              </button>
            </div>
            <button 
              type="button"
              onClick={() => showToast("Downloading Previous Q3 2024 Audit Report (PDF, 4.2 MB)...")}
              className="inline-flex items-center gap-1.5 text-[#c2410c] font-semibold text-xs hover:underline cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">download</span>
              <span>Previous Q3 2024 Audit Report (PDF, 4.2 MB)</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: Certificates Hub */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(194,65,12,0.02)] border border-[#e1bfb5]/40 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f4ece8] flex items-center justify-center text-[#904d00] shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[26px]">workspace_premium</span>
              </div>
              <div>
                <h2 className="font-headline text-xl sm:text-2xl text-[#1e1b19] font-bold tracking-tight">
                  Membership Certificates Hub
                </h2>
                <p className="text-xs sm:text-sm text-[#59413a] mt-0.5">
                  Issue, authenticate, and register formal church certificates with pastoral seals and watermarks.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-[#ffdcc3] text-[#2f1500] text-xs font-bold font-headline">
                Archival Grade Parchment
              </span>
            </div>
          </div>

          {/* Template Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => handleCertTabChange('baptism')}
              className={`px-4 py-2 rounded-lg font-headline text-xs font-bold whitespace-nowrap shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
                activeCertTab === 'baptism'
                  ? 'bg-[#c2410c] text-white'
                  : 'bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] hover:bg-[#eee7e3]'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">water_drop</span>
              <span>Baptism Certificate</span>
            </button>
            <button
              type="button"
              onClick={() => handleCertTabChange('dedication')}
              className={`px-4 py-2 rounded-lg font-headline text-xs font-bold whitespace-nowrap shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
                activeCertTab === 'dedication'
                  ? 'bg-[#c2410c] text-white'
                  : 'bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] hover:bg-[#eee7e3]'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">child_care</span>
              <span>Child Dedication</span>
            </button>
            <button
              type="button"
              onClick={() => handleCertTabChange('matrimony')}
              className={`px-4 py-2 rounded-lg font-headline text-xs font-bold whitespace-nowrap shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
                activeCertTab === 'matrimony'
                  ? 'bg-[#c2410c] text-white'
                  : 'bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] hover:bg-[#eee7e3]'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">favorite</span>
              <span>Holy Matrimony & Marriage Blessing</span>
            </button>
            <button
              type="button"
              onClick={() => handleCertTabChange('confirmation')}
              className={`px-4 py-2 rounded-lg font-headline text-xs font-bold whitespace-nowrap shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
                activeCertTab === 'confirmation'
                  ? 'bg-[#c2410c] text-white'
                  : 'bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] hover:bg-[#eee7e3]'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">school</span>
              <span>Confirmation & Discipleship Class</span>
            </button>
          </div>

          {/* Two-Column Interactive Workspace */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* Form / Customization Fields (5 cols) */}
            <div className="xl:col-span-5 space-y-4">
              <div className="p-5 rounded-xl bg-[#faf2ee] border border-[#e1bfb5]/40 space-y-4">
                <h3 className="text-sm font-headline text-[#1e1b19] font-bold flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#c2410c] text-[20px]">edit_document</span>
                  <span>Membership Record Details</span>
                </h3>

                {/* Candidate Lookup */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#59413a] font-headline">Candidate Lookup</label>
                  <div className="relative">
                    <input aria-label="Candidate Lookup" 
                      type="text" 
                      value={candidateName}
                      onChange={(e) => {
                        setCandidateName(e.target.value);
                        const parts = e.target.value.split('(');
                        setCandidateDisplayName(parts[0].trim());
                      }}
                      className="w-full h-10 px-3 pl-9 pr-8 rounded-lg bg-white text-xs font-medium text-[#1e1b19] shadow-sm border border-[#e1bfb5]/50 focus:outline-none focus:ring-1 focus:ring-[#c2410c]" 
                    />
                    <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#59413a] text-[18px]">person_search</span>
                    <span aria-hidden="true" className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#006243] text-[18px]">verified</span>
                  </div>
                </div>

                {/* Officiating Minister */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#59413a] font-headline">Officiating Minister</label>
                  <div className="relative">
                    <select aria-label="Officiating Minister" 
                      value={officiatingMinister}
                      onChange={(e) => setOfficiatingMinister(e.target.value)}
                      className="w-full h-10 px-3 pr-8 rounded-lg bg-white text-xs font-medium text-[#1e1b19] appearance-none shadow-sm border border-[#e1bfb5]/50 focus:outline-none cursor-pointer"
                    >
                      <option>Bishop Sammy</option>
                      <option>Rev. Sharon Miller (Associate Pastor)</option>
                      <option>Elder Marcus Jenkins (Church Secretary)</option>
                    </select>
                    <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#59413a] text-[18px]">expand_more</span>
                  </div>
                </div>

                {/* Date of Ceremony */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#59413a] font-headline">Date of Ordinance / Ceremony</label>
                  <div className="relative">
                    <input aria-label="Date of Ordinance / Ceremony" 
                      type="text" 
                      value={ceremonyDate}
                      onChange={(e) => {
                        setCeremonyDate(e.target.value);
                        setDisplayDate(e.target.value.split('(')[0].trim());
                      }}
                      className="w-full h-10 px-3 pr-9 rounded-lg bg-white text-xs font-medium text-[#1e1b19] shadow-sm border border-[#e1bfb5]/50 focus:outline-none focus:ring-1 focus:ring-[#c2410c]" 
                    />
                    <span aria-hidden="true" className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#59413a] text-[18px]">event</span>
                  </div>
                </div>

                {/* Scripture Dedication Verse */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#59413a] font-headline">Scripture Dedication Verse</label>
                  <textarea aria-label="Scripture Dedication Verse" 
                    rows={2}
                    value={scriptureVerse}
                    onChange={(e) => setScriptureVerse(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-white text-xs font-medium text-[#1e1b19] shadow-sm border border-[#e1bfb5]/50 focus:outline-none leading-relaxed resize-none" 
                  />
                </div>

                {/* Watermark & Seal Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#59413a] font-headline">Pastoral Seal</label>
                    <div className="relative">
                      <select aria-label="Pastoral Seal" 
                        value={pastoralSeal}
                        onChange={(e) => setPastoralSeal(e.target.value)}
                        className="w-full h-10 px-3 pr-7 rounded-lg bg-white text-xs font-medium text-[#1e1b19] appearance-none shadow-sm border border-[#e1bfb5]/50 focus:outline-none cursor-pointer"
                      >
                        <option>Embossed Gold Seal</option>
                        <option>Terracotta Church Stamp</option>
                        <option>Church Wax Mark</option>
                      </select>
                      <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#59413a] text-[18px]">expand_more</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#59413a] font-headline">Members Register No.</label>
                    <input aria-label="Members Register No." 
                      type="text" 
                      readOnly 
                      value={parishRollNo}
                      className="w-full h-10 px-3 rounded-lg bg-[#f4ece8] text-xs font-mono font-semibold text-[#59413a] cursor-not-allowed border border-[#e1bfb5]/40" 
                    />
                  </div>
                </div>

                {/* Witnesses / Sponsors */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#59413a] font-headline">Witnesses & Sponsors</label>
                  <input aria-label="Witnesses &amp; Sponsors" 
                    type="text" 
                    value={witnesses}
                    onChange={(e) => setWitnesses(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white text-xs font-medium text-[#1e1b19] shadow-sm border border-[#e1bfb5]/50 focus:outline-none" 
                  />
                </div>
              </div>
            </div>

            {/* Live High-Resolution Certificate Visual Preview (7 cols) */}
            <div className="xl:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#006243]"></span>
                  <span className="text-xs font-bold font-headline text-[#1e1b19] tracking-wide uppercase">
                    Live High-Res Render Preview
                  </span>
                </div>
                <span className="text-xs text-[#59413a]">Archival Paper • US Letter (Landscape)</span>
              </div>

              {/* The Parchment Card Canvas */}
              <div className="relative w-full rounded-2xl bg-[#faf6f0] p-6 sm:p-10 shadow-[0_8px_30px_rgba(28,25,23,0.08)] border border-[#d8c7b8] overflow-hidden">
                {/* Warm Ember Guilloche / Filigree Border Framing */}
                <div className="absolute inset-3.5 rounded-xl border border-[#d8c7b8] pointer-events-none opacity-60"></div>
                <div className="absolute inset-5 rounded-lg border border-[#c2410c]/30 pointer-events-none"></div>

                {/* Corner Accents */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-[#c2410c] pointer-events-none"></div>
                <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-[#c2410c] pointer-events-none"></div>
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-[#c2410c] pointer-events-none"></div>
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-[#c2410c] pointer-events-none"></div>

                {/* Certificate Content Layout */}
                <div className="relative z-10 flex flex-col items-center text-center space-y-4 my-2">
                  {/* Church Crest Header */}
                  <div className="flex items-center gap-2 text-[#c2410c]">
                    <span aria-hidden="true" className="material-symbols-outlined text-[28px]">church</span>
                    <span className="font-headline text-sm uppercase tracking-[0.25em] text-[#9b2f00] font-bold">
                      Destiny Sanctuary Int'L
                    </span>
                    <span aria-hidden="true" className="material-symbols-outlined text-[28px]">auto_stories</span>
                  </div>
                  <p className="text-[11px] font-headline uppercase tracking-widest text-[#786b62] -mt-2">
                    Destiny Sanctuary Int'L Nyahururu • Church Council Roll
                  </p>

                  {/* Main Title */}
                  <div className="py-1">
                    <h3 className="font-serif italic text-2xl sm:text-3xl text-[#2b1810] tracking-tight font-bold">
                      {activeCertTab === 'baptism' && 'Certificate of Christian Baptism'}
                      {activeCertTab === 'dedication' && 'Certificate of Child Presentation & Dedication'}
                      {activeCertTab === 'matrimony' && 'Certificate of Holy Matrimony'}
                      {activeCertTab === 'confirmation' && 'Certificate of Discipleship Class'}
                    </h3>
                    <div className="w-32 h-[1.5px] bg-[#c2410c]/40 mx-auto mt-2 rounded-full"></div>
                  </div>

                  {/* Declaration Paragraph */}
                  <p className="text-xs sm:text-sm text-[#59413a] max-w-lg leading-relaxed pt-1">
                    This certifies that
                    <span className="font-serif font-bold text-lg sm:text-xl text-[#1e1b19] block my-1">
                      {candidateDisplayName}
                    </span>
                    {activeCertTab === 'baptism' && 'having publicly confessed faith in the Lord and Savior Jesus Christ, was baptized with water in the Name of the Father, and of the Son, and of the Holy Spirit.'}
                    {activeCertTab === 'dedication' && 'was solemnly dedicated unto the Lord with prayer and member vows by faithful parents and church sponsors.'}
                    {activeCertTab === 'matrimony' && 'were united in the holy member of Christian marriage according to the ordinance of God and the official Book of Order.'}
                    {activeCertTab === 'confirmation' && 'having completed the Berean Discipleship Class and examined by the Council, is received as a full member.'}
                  </p>

                  {/* Scripture Dedication Quote Box */}
                  <div className="w-full max-w-md bg-[#f2ebd9]/60 rounded-lg p-3 my-2 border border-[#d8c7b8]/40">
                    <p className="text-xs italic text-[#6e5d53] leading-snug">
                      "{scriptureVerse.split('—')[1]?.trim() || scriptureVerse}"
                    </p>
                    <span className="text-[11px] font-bold text-[#c2410c] block mt-1">
                      — {scriptureVerse.split('—')[0]?.trim() || 'Holy Scripture'}
                    </span>
                  </div>

                  {/* Signatures & Official Embossed Gold Seal */}
                  <div className="w-full grid grid-cols-3 items-end pt-4 mt-2">
                    <div className="flex flex-col items-center">
                      <div className="font-serif italic text-sm text-[#c2410c] leading-tight font-bold">
                        {displayDate}
                      </div>
                      <div className="w-28 h-[1px] bg-[#a8998d] my-1"></div>
                      <span className="text-[10px] text-[#786b62] uppercase tracking-wider font-semibold">
                        Date of Ordinance
                      </span>
                    </div>

                    {/* Central Seal Stamp */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#904d00] via-[#fe932c] to-[#9b2f00] p-0.5 shadow-md flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-[#faf6f0] flex flex-col items-center justify-center text-[#c2410c] border border-dashed border-[#c2410c]">
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">verified</span>
                          <span className="text-[7px] font-bold uppercase tracking-tighter">SIGILLUM</span>
                        </div>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-[#904d00] font-bold mt-1">
                        {pastoralSeal}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="font-serif italic text-sm text-[#1e1b19] leading-tight font-bold">
                        {officiatingMinister.split('(')[0]?.trim() || 'Bishop Sammy'}
                      </div>
                      <div className="w-28 h-[1px] bg-[#a8998d] my-1"></div>
                      <span className="text-[10px] text-[#786b62] uppercase tracking-wider font-semibold">
                        Bishop Signature
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer for Certificates */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#e1bfb5]/30">
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => showToast(`Certificate of ${activeCertTab.toUpperCase()} generated and cryptographically sealed with pastoral signature.`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#c2410c] text-white font-semibold text-xs hover:bg-[#9b2f00] transition-all shadow-[0_2px_8px_rgba(194,65,12,0.25)] cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[19px]">verified_user</span>
                <span>Generate & Seal Certificate (PDF)</span>
              </button>
              <button 
                type="button"
                onClick={() => showToast("Sending print job to Archival Parchment Tray #2 (8.5x11)...")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#f4ece8] text-[#1e1b19] font-semibold text-xs hover:bg-[#eee7e3] transition-colors cursor-pointer border border-[#e1bfb5]/40"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">print</span>
                <span>Print Directly (Parchment 8.5x11)</span>
              </button>
            </div>
            <button 
              type="button"
              onClick={() => showToast(`Record lodged in Permanent Archival Roll under ID ${parishRollNo}.`)}
              className="inline-flex items-center gap-1.5 text-[#59413a] hover:text-[#c2410c] font-semibold text-xs transition-colors cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">bookmark_add</span>
              <span>Register in Permanent Church Archives</span>
            </button>
          </div>
        </div>

        {/* SECTION 3: AGM Summaries (Annual General Meeting) */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(194,65,12,0.02)] border border-[#e1bfb5]/40 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f4ece8] flex items-center justify-center text-[#9b2f00] shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[26px]">gavel</span>
              </div>
              <div>
                <h2 className="font-headline text-xl sm:text-2xl text-[#1e1b19] font-bold tracking-tight">
                  Annual General Meeting (AGM) Comprehensive Summary Dossier
                </h2>
                <p className="text-xs sm:text-sm text-[#59413a] mt-0.5">
                  One-click automated compilation of all annual metrics, secretarial minutes, ministry digests, and audited balance sheets.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#007d57]/10 text-[#006243] text-xs font-bold font-headline border border-[#007d57]/20">
              <span className="w-2 h-2 rounded-full bg-[#006243]"></span>
              <span>Target Assembly: Dec 15, 2024</span>
            </div>
          </div>

          {/* Compilation Progress Banner */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-[#f4ece8] to-[#faf2ee] border border-[#e1bfb5]/40 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center text-[#c2410c] shadow-sm shrink-0 border border-[#e1bfb5]/40">
                <span aria-hidden="true" className="material-symbols-outlined text-[30px]">auto_stories</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold font-headline text-[#1e1b19]">2024 AGM Annual Report Book</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#007d57]/20 text-[#006243] text-[11px] font-bold">
                    Ready to Compile
                  </span>
                </div>
                <p className="text-xs text-[#59413a] mt-0.5">
                  5 of 6 constituent chapters fully ratified by Church Council Executive Committee.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
              <div className="flex flex-col items-end">
                <span className="text-xl font-bold font-headline text-[#1e1b19]">85%</span>
                <span className="text-[10px] text-[#59413a] uppercase tracking-wider font-semibold">
                  Compilation Index
                </span>
              </div>
              <div className="w-32 bg-[#e9e1dd] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#c2410c] h-full rounded-full w-[85%] transition-all"></div>
              </div>
            </div>
          </div>

          {/* Modules Checklist Grid (6 Chapters) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Chapter 1 */}
            <div className="p-4 rounded-xl bg-[#faf2ee]/80 border border-[#e1bfb5]/30 flex flex-col justify-between gap-3 hover:bg-[#faf2ee] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-[#f4ece8] flex items-center justify-center text-xs font-bold text-[#1e1b19]">1</span>
                  <span className="text-xs font-bold font-headline text-[#1e1b19]">Pastoral Address & Vision 2025</span>
                </div>
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#006243]">check_circle</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#59413a] pt-1 border-t border-[#e1bfb5]/20">
                <span>Approved by Lead Pastor</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#007d57]/15 text-[#006243] font-bold">Ready</span>
              </div>
            </div>

            {/* Chapter 2 */}
            <div className="p-4 rounded-xl bg-[#faf2ee]/80 border border-[#e1bfb5]/30 flex flex-col justify-between gap-3 hover:bg-[#faf2ee] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-[#f4ece8] flex items-center justify-center text-xs font-bold text-[#1e1b19]">2</span>
                  <span className="text-xs font-bold font-headline text-[#1e1b19]">Census & Demographics</span>
                </div>
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#006243]">check_circle</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#59413a] pt-1 border-t border-[#e1bfb5]/20">
                <span>1,248 Members Synced</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#007d57]/15 text-[#006243] font-bold">Ready</span>
              </div>
            </div>

            {/* Chapter 3 */}
            <div className="p-4 rounded-xl bg-[#faf2ee]/80 border border-[#e1bfb5]/30 flex flex-col justify-between gap-3 hover:bg-[#faf2ee] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-[#f4ece8] flex items-center justify-center text-xs font-bold text-[#1e1b19]">3</span>
                  <span className="text-xs font-bold font-headline text-[#1e1b19]">Ministries & Highlights</span>
                </div>
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#006243]">check_circle</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#59413a] pt-1 border-t border-[#e1bfb5]/20">
                <span>7 Departments Submitted</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#007d57]/15 text-[#006243] font-bold">Ready</span>
              </div>
            </div>

            {/* Chapter 4 */}
            <div className="p-4 rounded-xl bg-[#faf2ee]/80 border border-[#e1bfb5]/30 flex flex-col justify-between gap-3 hover:bg-[#faf2ee] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-[#f4ece8] flex items-center justify-center text-xs font-bold text-[#1e1b19]">4</span>
                  <span className="text-xs font-bold font-headline text-[#1e1b19]">Audited Financial Statements</span>
                </div>
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#006243]">check_circle</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#59413a] pt-1 border-t border-[#e1bfb5]/20">
                <span>Trustee Certified Balance</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#007d57]/15 text-[#006243] font-bold">Ready</span>
              </div>
            </div>

            {/* Chapter 5 (Draft) */}
            <div className="p-4 rounded-xl bg-[#ffdcc3]/20 border border-[#ffdcc3]/60 flex flex-col justify-between gap-3 hover:bg-[#ffdcc3]/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-[#ffdcc3] flex items-center justify-center text-xs font-bold text-[#6e3900]">5</span>
                  <span className="text-xs font-bold font-headline text-[#1e1b19]">2025 Budget & Resolutions</span>
                </div>
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#904d00]">pending</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#59413a] pt-1 border-t border-[#ffdcc3]/40">
                <span>Pending Church Council Vote</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#ffdcc3] text-[#6e3900] font-bold">Draft</span>
              </div>
            </div>

            {/* Chapter 6 */}
            <div className="p-4 rounded-xl bg-[#faf2ee]/80 border border-[#e1bfb5]/30 flex flex-col justify-between gap-3 hover:bg-[#faf2ee] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-[#f4ece8] flex items-center justify-center text-xs font-bold text-[#1e1b19]">6</span>
                  <span className="text-xs font-bold font-headline text-[#1e1b19]">Trustee & Deacon Elections</span>
                </div>
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#006243]">check_circle</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#59413a] pt-1 border-t border-[#e1bfb5]/20">
                <span>Official Ballot Slate Confirmed</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#007d57]/15 text-[#006243] font-bold">Ready</span>
              </div>
            </div>
          </div>

          {/* Dossier Configuration Bar */}
          <div className="p-4 rounded-xl bg-[#faf2ee] border border-[#e1bfb5]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#59413a]">palette</span>
                <span className="text-xs text-[#59413a] font-medium">Cover Artwork:</span>
                <select aria-label="Certificate cover artwork" 
                  value={coverArtwork}
                  onChange={(e) => setCoverArtwork(e.target.value)}
                  className="px-2.5 py-1 rounded-md bg-white text-xs font-medium text-[#1e1b19] border border-[#e1bfb5]/50 focus:outline-none shadow-sm cursor-pointer"
                >
                  <option>Warm Ember Classical Sanctuary Engraving</option>
                  <option>Modern Monogram</option>
                  <option>Destiny Sanctuary Architectural Elevation</option>
                </select>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-[#1e1b19]">
                <input 
                  type="checkbox" 
                  checked={autoToc}
                  onChange={(e) => setAutoToc(e.target.checked)}
                  className="w-4 h-4 rounded text-[#c2410c] accent-[#c2410c]" 
                />
                <span>Auto-numbered Table of Contents</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-[#1e1b19]">
                <input 
                  type="checkbox" 
                  checked={governanceAppendix}
                  onChange={(e) => setGovernanceAppendix(e.target.checked)}
                  className="w-4 h-4 rounded text-[#c2410c] accent-[#c2410c]" 
                />
                <span>Church Council Appendix & By-laws</span>
              </label>
            </div>

            <div className="text-xs text-[#59413a] text-right">
              Estimated 72 Pages • Includes Vector Analytics
            </div>
          </div>

          {/* High Visibility Action Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <button 
                type="button"
                onClick={() => showToast("Compiling full 72-page 2024 AGM Annual Report Dossier (PDF)...")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#c2410c] text-white font-bold text-xs hover:bg-[#9b2f00] transition-all shadow-[0_4px_16px_rgba(194,65,12,0.3)] cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">file_download</span>
                <span>Compile & Export Full AGM Dossier (PDF)</span>
              </button>
              <button 
                type="button"
                onClick={() => showToast("Exporting 8-page Executive Summary pamphlet...")}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#f4ece8] text-[#1e1b19] font-bold text-xs hover:bg-[#eee7e3] transition-colors cursor-pointer border border-[#e1bfb5]/40"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">menu_book</span>
                <span>Export Executive Summary (8 Pages)</span>
              </button>
            </div>

            <button 
              type="button"
              onClick={() => showToast("Digital proof securely dispatched to the Church Council email ledger.")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#faf2ee] text-[#59413a] hover:text-[#1e1b19] hover:bg-[#f4ece8] transition-colors text-xs font-semibold cursor-pointer border border-[#e1bfb5]/30"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">send</span>
              <span>Send Digital Proof to Church Council</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
