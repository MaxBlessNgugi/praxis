import { useDialog } from '../dialog';
import React, { useState } from 'react';

interface WelfareCase {
  id: string;
  caseNo: string;
  description: string;
  category: string;
  categoryColor: string;
  amount: number;
  caseworker: string;
  date: string;
  status: string;
  confidentialNotes: string;
  householdDetails: string;
}

const CASES: WelfareCase[] = [
  {
    id: 'w-1',
    caseNo: '#WEL-2412',
    description: 'Single Mother Eviction Stave',
    category: 'Emergency Rental',
    categoryColor: 'bg-[#ffdbd0] text-[#9b2f00]',
    amount: 1200.00,
    caseworker: 'Clara Wambui',
    date: 'Feb 05, 2025',
    status: 'Disbursed',
    confidentialNotes: 'Household faced a 3-day eviction notice after the breadwinner lost work. Direct payment remitted to Nyahururu Properties Ltd. Case worker scheduled a second pastoral check-in next week.',
    householdDetails: '3 Children (Ages 4, 7, 11) · Church Member since 2021',
  },
  {
    id: 'w-2',
    caseNo: '#WEL-2411',
    description: 'Household Utility Bill Relief',
    category: 'Fuel & Utility',
    categoryColor: 'bg-[#ffdcc3] text-[#2f1500]',
    amount: 650.00,
    caseworker: 'Elder Marcus Kamau',
    date: 'Feb 02, 2025',
    status: 'Disbursed',
    confidentialNotes: '200 litre LPG refill voucher issued to Valley Energy Services for an elderly widow’s home.',
    householdDetails: 'Senior Visitor · Living alone',
  },
  {
    id: 'w-3',
    caseNo: '#WEL-2410',
    description: 'Urgent Dental Care Extraction',
    category: 'Medical Grant',
    categoryColor: 'bg-[#85f8c4]/40 text-[#005137]',
    amount: 450.00,
    caseworker: 'Sarah Kimani',
    date: 'Feb 01, 2025',
    status: 'Disbursed',
    confidentialNotes: 'Emergency dental treatment bill, settled directly with the Laikipia County Dental Clinic.',
    householdDetails: 'College student & part-time nursery volunteer',
  },
  {
    id: 'w-4',
    caseNo: '#WEL-2409',
    description: 'Bereaved Family Grocery Aid',
    category: 'Food Voucher',
    categoryColor: 'bg-[#ffdad6] text-[#ba1a1a]',
    amount: 350.00,
    caseworker: 'Clara Wambui',
    date: 'Jan 29, 2025',
    status: 'Disbursed',
    confidentialNotes: 'Provided two weeks of grocery vouchers following the sudden loss of a spouse.',
    householdDetails: 'Family of 4 · Deacon meal train also organized',
  },
  {
    id: 'w-5',
    caseNo: '#WEL-2408',
    description: 'Senior Prescription Subsidy',
    category: 'Pharmacy Care',
    categoryColor: 'bg-[#e9e1dd] text-[#59413a]',
    amount: 280.00,
    caseworker: 'Arthur Wanjala',
    date: 'Jan 27, 2025',
    status: 'Disbursed',
    confidentialNotes: 'Assisted with the NHIF coverage gap shortfall for heart medication.',
    householdDetails: 'Elderly couple on a fixed pension',
  },
];

export const FinancesWelfarePanel: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<WelfareCase | null>(null);
  const selectedCaseDialog = useDialog(() => setSelectedCase(null), "Welfare Case Detail");
  const [isDisbursementModalOpen, setIsDisbursementModalOpen] = useState(false);
  const disbursementModalOpenDialog = useDialog(() => setIsDisbursementModalOpen(false), "New Welfare Relief Disbursement");

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* 4 Welfare Reserve KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Deacon Welfare Reserve
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#9b2f00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">health_and_safety</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">KSh 48,320</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">verified_user</span>
              <span>Designated Alms Treasury</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Restricted for emergency charity
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Disbursed MTD
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#c2410c] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">outbox</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#9b2f00]">KSh 8,650</div>
            <div className="flex items-center gap-1 mt-1 text-[#59413a] text-xs">
              <span>Across 14 emergency cases</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            100% confidential alms
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Avg Assistance / Case
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#904d00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">family_restroom</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">KSh 617.85</div>
            <div className="flex items-center gap-1 mt-1 text-[#59413a] text-xs">
              <span>Direct vendor remitted</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Zero cash handed to individuals
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Monthly Inflow
            </span>
            <span className="p-2 rounded-xl bg-[#85f8c4]/40 text-[#002114] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">move_to_inbox</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#006243]">KSh 11,200</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>1st Sunday Alms offering</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Net Surplus: +KSh 2,550 MTD
          </div>
        </div>
      </div>

      {/* Category Distribution Bar & Pastoral Casework Network */}
      <div className="p-5 bg-white rounded-2xl shadow-sm border border-[#EAE1D7] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1e1b19]">
              February Benevolence Disbursement by Need
            </h3>
            <p className="text-xs text-[#59413a]">Distribution of relief funds approved by the Missions, Mercy & Church Planting ministry</p>
          </div>
          <button
            onClick={() => setIsDisbursementModalOpen(true)}
            className="px-4 py-2 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_moderator</span>
            <span>+ New Disbursement</span>
          </button>
        </div>

        {/* Multi-Segment Need Bar */}
        <div className="space-y-2">
          <div className="w-full bg-[#EAE1D7] h-3.5 rounded-full overflow-hidden flex">
            <div className="bg-[#9b2f00] h-full" style={{ width: '45%' }} title="Housing 45%"></div>
            <div className="bg-[#fe932c] h-full" style={{ width: '22%' }} title="Utilities 22%"></div>
            <div className="bg-[#007d57] h-full" style={{ width: '18%' }} title="Medical 18%"></div>
            <div className="bg-[#904d00] h-full" style={{ width: '15%' }} title="Grocery 15%"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#9b2f00]"></span>
              <span className="text-[#1e1b19]">Housing & Rent: <strong>45% (KSh 3,892)</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#fe932c]"></span>
              <span className="text-[#1e1b19]">Utilities & Fuel: <strong>22% (KSh 1,903)</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#007d57]"></span>
              <span className="text-[#1e1b19]">Medical & Rx: <strong>18% (KSh 1,557)</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#904d00]"></span>
              <span className="text-[#1e1b19]">Food & Grocery: <strong>15% (KSh 1,298)</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Welfare Disbursement History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
        <div className="p-4 border-b border-[#EAE1D7] bg-[#faf2ee]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[20px]">folder_shared</span>
            <h3 className="font-headline text-sm font-bold text-[#1e1b19]">
              Confidential Welfare Casework Ledger
            </h3>
          </div>
          <span className="text-xs text-[#59413a]">
            Encrypted Deacon & Clergy Access Only
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#faf2ee] text-[#59413a] font-semibold uppercase tracking-wider border-b border-[#EAE1D7]">
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Intervention Summary</th>
                <th className="py-3 px-4">Relief Category</th>
                <th className="py-3 px-4">Assigned Deacon</th>
                <th className="py-3 px-4 text-right">Disbursed</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE1D7] text-[#1e1b19]">
              {CASES.map((c) => (
                <tr key={c.id} className="hover:bg-[#faf2ee]/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#9b2f00]">
                    {c.caseNo}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#1e1b19]">
                    {c.description}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.categoryColor}`}>
                      {c.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#59413a]">
                    {c.caseworker}
                  </td>
                  <td className="py-3.5 px-4 text-right font-headline font-bold text-sm text-[#1e1b19]">
                    KSh {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-[#59413a] font-mono text-[11px]">
                    {c.date}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedCase(c)}
                      className="px-2.5 py-1 rounded-lg bg-[#faf2ee] hover:bg-[#f4ece8] text-[#9b2f00] font-bold text-xs border border-[#EAE1D7] transition-colors cursor-pointer"
                    >
                      View Notes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confidential Notes Slide-Out Drawer */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs" {...selectedCaseDialog}>
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EAE1D7]">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[22px]">lock</span>
                  <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                    Case Notes ({selectedCase.caseNo})
                  </h3>
                </div>
                <button onClick={() => setSelectedCase(null)} className="text-[#59413a] hover:text-[#1e1b19]" aria-label="Close">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <span className="text-[#59413a] block mb-0.5">Intervention Case Title</span>
                  <p className="font-bold text-sm text-[#1e1b19]">{selectedCase.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-[#faf2ee] rounded-xl border border-[#EAE1D7]">
                  <div>
                    <span className="text-[#59413a] block">Disbursed Amount</span>
                    <span className="font-headline font-bold text-base text-[#9b2f00]">
                      KSh {selectedCase.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#59413a] block">Category</span>
                    <span className="font-semibold text-[#1e1b19]">{selectedCase.category}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[#59413a] block mb-0.5">Household Demographics</span>
                  <p className="text-[#1e1b19] p-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]">
                    {selectedCase.householdDetails}
                  </p>
                </div>

                <div>
                  <span className="text-[#59413a] block mb-0.5">Assigned Almoner / Caseworker</span>
                  <p className="font-semibold text-[#1e1b19]">{selectedCase.caseworker}</p>
                </div>

                <div>
                  <span className="text-[#59413a] block mb-0.5">Confidential Pastoral Notes</span>
                  <div className="p-3.5 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] leading-relaxed">
                    {selectedCase.confidentialNotes}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAE1D7] flex items-center justify-end">
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 rounded-xl bg-[#9b2f00] text-white text-xs font-bold shadow-xs hover:bg-[#c2410c]"
              >
                Close File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Disbursement Modal */}
      {isDisbursementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" {...disbursementModalOpenDialog}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAE1D7] pb-3">
              <h3 className="font-headline text-base font-bold text-[#1e1b19]">New Welfare Relief Disbursement</h3>
              <button onClick={() => setIsDisbursementModalOpen(false)} className="text-[#59413a] hover:text-[#1e1b19]" aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="welfare-beneficiary" className="block font-semibold mb-1">Beneficiary Family / Case Subject</label>
                <input id="welfare-beneficiary" aria-label="Beneficiary Family / Case Subject" type="text" placeholder="e.g. Wanjala Family" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="welfare-amount" className="block font-semibold mb-1">Amount (KSh)</label>
                  <input id="welfare-amount" aria-label="Amount (KSh)" type="number" placeholder="600.00" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]" />
                </div>
                <div>
                  <label htmlFor="welfare-category" className="block font-semibold mb-1">Category</label>
                  <select id="welfare-category" aria-label="Category" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]">
                    <option>Emergency Rental</option>
                    <option>Fuel & Utility</option>
                    <option>Medical Grant</option>
                    <option>Food Security</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="welfare-payee" className="block font-semibold mb-1">Direct Payee / Vendor</label>
                <input id="welfare-payee" aria-label="Direct Payee / Vendor" type="text" placeholder="e.g. Valley Power Authority" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]" />
              </div>
              <div>
                <label htmlFor="welfare-notes" className="block font-semibold mb-1">Deacon Assessment Notes</label>
                <textarea id="welfare-notes" aria-label="Deacon Assessment Notes" rows={3} placeholder="Provide concise justification..." className="w-full p-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"></textarea>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE1D7]">
              <button onClick={() => setIsDisbursementModalOpen(false)} className="px-3.5 py-1.5 text-xs text-[#59413a]">Cancel</button>
              <button onClick={() => setIsDisbursementModalOpen(false)} className="px-4 py-2 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs">
                Authorize Disbursement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
