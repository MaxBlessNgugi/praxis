import { dialogProps } from '../dialog';
import React, { useState } from 'react'
;

export const FinancesProjectFundingPanel: React.FC = () => {
  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false);

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Major Capital Campaign Hero Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#EAE1D7] flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ffdcc3] text-[#2f1500] text-xs font-bold">
                Active Capital Project
              </span>
              <span className="text-xs font-mono text-[#59413a]">Campaign Code: #CAP-2025-SN</span>
            </div>
            <h2 className="font-headline text-2xl font-bold text-[#1e1b19]">
              Destiny Sanctuary Renovation & Youth Annex Expansion
            </h2>
            <p className="text-xs text-[#59413a] max-w-2xl leading-relaxed">
              Comprehensive structural refurbishment of the 1954 sanctuary hall, acoustic isolation, state-of-the-art audiovisual loft, and two-story next-gen educational wing.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end shrink-0 bg-[#faf2ee] p-4 rounded-xl border border-[#EAE1D7]">
            <span className="text-xs font-semibold text-[#59413a]">Total Campaign Target</span>
            <span className="font-headline text-2xl font-extrabold text-[#1e1b19]">KSh 850,000</span>
            <span className="text-xs text-[#006243] font-bold mt-0.5">
              KSh 637,500 Raised & Pledged (75.0%)
            </span>
          </div>
        </div>

        {/* Multi-Tiered Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-[#EAE1D7] h-3.5 rounded-full overflow-hidden flex">
            {/* Cash in escrow: 61.2% */}
            <div className="bg-[#9b2f00] h-full" style={{ width: '61.2%' }} title="Cash in Escrow: KSh 520,200"></div>
            {/* Signed Pledges: 13.8% */}
            <div className="bg-[#fe932c] h-full" style={{ width: '13.8%' }} title="Signed Pledges: KSh 117,300"></div>
          </div>
          <div className="flex flex-wrap items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[#1e1b19]">
                <span className="w-3 h-3 rounded-full bg-[#9b2f00]"></span>
                <strong>KSh 520,200</strong> Cash in Escrow (61.2%)
              </span>
              <span className="flex items-center gap-1.5 text-[#59413a]">
                <span className="w-3 h-3 rounded-full bg-[#fe932c]"></span>
                <strong>KSh 117,300</strong> Signed Pledges (13.8%)
              </span>
            </div>
            <span className="font-mono text-[#ba1a1a] font-bold">
              KSh 212,500 Unpledged Balance (25.0%)
            </span>
          </div>
        </div>

        {/* 5-Stage Milestone Roadmap */}
        <div className="pt-4 border-t border-[#f4ece8]">
          <h4 className="font-headline text-xs font-bold text-[#1e1b19] uppercase tracking-wider mb-3">
            Construction Milestones & Disbursement Stages
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Stage 1 */}
            <div className="p-3 bg-[#faf2ee] rounded-xl border border-[#EAE1D7] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-[#006243]">Phase 1</span>
                <span className="px-1.5 py-0.2 rounded bg-[#85f8c4]/40 text-[#005137] text-[10px] font-bold">
                  Completed
                </span>
              </div>
              <div className="font-semibold text-xs text-[#1e1b19] mt-2">
                Drawings & City Permits
              </div>
              <div className="text-[11px] text-[#59413a] font-mono mt-1">KSh 45,000 Settled</div>
            </div>

            {/* Stage 2 */}
            <div className="p-3 bg-[#faf2ee] rounded-xl border border-[#EAE1D7] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-[#006243]">Phase 2</span>
                <span className="px-1.5 py-0.2 rounded bg-[#85f8c4]/40 text-[#005137] text-[10px] font-bold">
                  Completed
                </span>
              </div>
              <div className="font-semibold text-xs text-[#1e1b19] mt-2">
                HVAC & Foundation
              </div>
              <div className="text-[11px] text-[#59413a] font-mono mt-1">KSh 180,000 Settled</div>
            </div>

            {/* Stage 3 */}
            <div className="p-3 bg-[#ffdcc3]/30 rounded-xl border border-[#fe932c]/40 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-[#904d00]">Phase 3</span>
                <span className="px-1.5 py-0.2 rounded bg-[#ffdcc3] text-[#2f1500] text-[10px] font-bold">
                  In Progress
                </span>
              </div>
              <div className="font-semibold text-xs text-[#1e1b19] mt-2">
                Acoustics & Tech Loft
              </div>
              <div className="text-[11px] text-[#904d00] font-mono mt-1">65% (KSh 220,000)</div>
            </div>

            {/* Stage 4 */}
            <div className="p-3 bg-[#faf2ee] rounded-xl border border-[#EAE1D7] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-[#59413a]">Phase 4</span>
                <span className="px-1.5 py-0.2 rounded bg-[#f4ece8] text-[#59413a] text-[10px] font-semibold">
                  Upcoming
                </span>
              </div>
              <div className="font-semibold text-xs text-[#1e1b19] mt-2">
                Youth Center Classrooms
              </div>
              <div className="text-[11px] text-[#59413a] font-mono mt-1">KSh 260,000 Budgeted</div>
            </div>

            {/* Stage 5 */}
            <div className="p-3 bg-[#faf2ee] rounded-xl border border-[#EAE1D7] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-[#59413a]">Phase 5</span>
                <span className="px-1.5 py-0.2 rounded bg-[#f4ece8] text-[#59413a] text-[10px] font-semibold">
                  Easter 2025
                </span>
              </div>
              <div className="font-semibold text-xs text-[#1e1b19] mt-2">
                Dedication & Commission
              </div>
              <div className="text-[11px] text-[#59413a] font-mono mt-1">KSh 145,000 Final</div>
            </div>
          </div>
        </div>
      </div>

      {/* Auxiliary Endowments & Pledges Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Auxiliary Endowments */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-base font-bold text-[#1e1b19]">
              Auxiliary Capital Endowments
            </h3>
            <span className="text-xs text-[#59413a]">2 Designated Funds</span>
          </div>

          <div className="space-y-3">
            {/* Fund 1 */}
            <div className="p-3.5 bg-[#faf2ee] rounded-xl border border-[#EAE1D7] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[20px]">directions_bus</span>
                  <span className="font-semibold text-xs text-[#1e1b19]">Church Van Transport Fund</span>
                </div>
                <span className="font-headline font-bold text-xs text-[#1e1b19]">KSh 42,000 / KSh 55,000</span>
              </div>
              <div className="w-full bg-[#EAE1D7] h-2 rounded-full overflow-hidden">
                <div className="bg-[#9b2f00] h-full" style={{ width: '76.3%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#59413a]">
                <span>76% Funded</span>
                <span>KSh 13,000 to purchase 15-passenger van</span>
              </div>
            </div>

            {/* Fund 2 */}
            <div className="p-3.5 bg-[#faf2ee] rounded-xl border border-[#EAE1D7] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#904d00] text-[20px]">music_note</span>
                  <span className="font-semibold text-xs text-[#1e1b19]">Pipe Organ Restoration Fund</span>
                </div>
                <span className="font-headline font-bold text-xs text-[#1e1b19]">KSh 18,500 / KSh 25,000</span>
              </div>
              <div className="w-full bg-[#EAE1D7] h-2 rounded-full overflow-hidden">
                <div className="bg-[#fe932c] h-full" style={{ width: '74%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#59413a]">
                <span>74% Funded</span>
                <span>Reed valve & bellows overhaul slated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Capital Ledger Table Snippet */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                Pledge Fulfillment Tracker
              </h3>
              <button
                onClick={() => setIsPledgeModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                + Record Pledge
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { name: 'Elder Marcus Kamau Family', pledged: 25000, fulfilled: 20000, pct: 80 },
                { name: 'Mwangi Heritage Trust', pledged: 50000, fulfilled: 50000, pct: 100 },
                { name: 'Dr. Jonathan & Martha Mwaura', pledged: 12000, fulfilled: 9000, pct: 75 },
                { name: 'Destiny Youth Car Wash & Bake Drive', pledged: 6500, fulfilled: 6500, pct: 100 },
              ].map((p, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[#1e1b19]">{p.name}</div>
                    <div className="text-[11px] text-[#59413a]">
                      KSh {p.fulfilled.toLocaleString()} fulfilled of KSh {p.pledged.toLocaleString()}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    p.pct === 100 ? 'bg-[#85f8c4]/40 text-[#005137]' : 'bg-[#ffdcc3] text-[#2f1500]'
                  }`}>
                    {p.pct}% Complete
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-[#f4ece8] text-xs text-[#59413a] flex items-center justify-between">
            <span>Showing top 4 of 42 capital pledgers</span>
            <button className="text-[#9b2f00] font-bold hover:underline">Download Master Roll</button>
          </div>
        </div>
      </div>

      {/* Pledge Modal */}
      {isPledgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" {...dialogProps(() => setIsPledgeModalOpen(false), "New Capital Campaign Pledge")}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAE1D7] pb-3">
              <h3 className="font-headline text-base font-bold text-[#1e1b19]">New Capital Campaign Pledge</h3>
              <button onClick={() => setIsPledgeModalOpen(false)} className="text-[#59413a] hover:text-[#1e1b19]" aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="pledge-donor" className="block font-semibold mb-1">Donor Name / Family Trust</label>
                <input id="pledge-donor" aria-label="Donor Name / Family Trust" type="text" placeholder="e.g. Clara Wambui" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pledge-amount" className="block font-semibold mb-1">Pledge Amount (KSh)</label>
                  <input id="pledge-amount" aria-label="Pledge Amount (KSh)" type="number" placeholder="10,000" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]" />
                </div>
                <div>
                  <label htmlFor="pledge-term" className="block font-semibold mb-1">Pledge Term</label>
                  <select id="pledge-term" aria-label="Pledge Term" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]">
                    <option>12 Months</option>
                    <option>24 Months</option>
                    <option>Immediate Gift</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE1D7]">
              <button onClick={() => setIsPledgeModalOpen(false)} className="px-3.5 py-1.5 text-xs text-[#59413a]">Cancel</button>
              <button onClick={() => setIsPledgeModalOpen(false)} className="px-4 py-2 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs">
                Log Pledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
