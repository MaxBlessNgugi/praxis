import { useDialog } from '../dialog';
import React, { useState } from 'react';

interface CharityExp {
  id: string;
  code: string;
  item: string;
  initiative: string;
  amount: number;
  date: string;
  vendor: string;
  status: string;
}

const EXPENSES: CharityExp[] = [
  {
    id: 'ch-1',
    code: '#CH-882',
    item: 'Fresh Produce Wholesale Pallets (3 Tons)',
    initiative: 'Community Food Drive',
    amount: 1840.00,
    date: 'Feb 06, 2025',
    vendor: 'Valley Harvest Co-Op',
    status: 'Audited & Cleared',
  },
  {
    id: 'ch-2',
    code: '#CH-881',
    item: 'Solar Submersible Well Pump & Rig',
    initiative: 'Kenya Water Borehole Project',
    amount: 3200.00,
    date: 'Feb 03, 2025',
    vendor: 'Nairobi Water Works Ltd',
    status: 'Audited & Cleared',
  },
  {
    id: 'ch-3',
    code: '#CH-880',
    item: 'Blood Glucose Testing Strips & Cuffs',
    initiative: 'Free Medical Screening Clinic',
    amount: 950.00,
    date: 'Jan 30, 2025',
    vendor: 'MedSupply Kenya Ltd',
    status: 'Audited & Cleared',
  },
  {
    id: 'ch-4',
    code: '#CH-879',
    item: '80 Festive Food Hampers',
    initiative: 'Festive Season Outreach Drive',
    amount: 1440.00,
    date: 'Jan 27, 2025',
    vendor: 'Nyahururu Grocers Ltd',
    status: 'Audited & Cleared',
  },
];

export const FinancesCharityPanel: React.FC = () => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const expenseModalOpenDialog = useDialog(() => setIsExpenseModalOpen(false), "Record Charity Disbursement");

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Bento Metrics Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Direct Aid Delivered
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#9b2f00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">diversity_1</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">1,420</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>+18% families served y/y</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Across county outreach zones
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Active Missions & Drives
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#904d00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">flag</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">12</div>
            <div className="flex items-center gap-1 mt-1 text-[#59413a] text-xs">
              <span>Community & Global Charters</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            100% Council sanctioned
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Nutritional Relief
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#c2410c] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">nutrition</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">3,920 kg</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">eco</span>
              <span>Distributed via Food Drive</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            52 weekly volunteers engaged
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Global Outreach
            </span>
            <span className="p-2 rounded-xl bg-[#85f8c4]/40 text-[#002114] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">public</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#006243]">5 Stations</div>
            <div className="flex items-center gap-1 mt-1 text-[#59413a] text-xs">
              <span>Kenya, Peru, India, Japan, Egypt</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Direct missionary stipends
          </div>
        </div>
      </div>

      {/* Annual Charity Budget Utilization & Initiative Meters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Donut Gauge (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7] flex flex-col justify-between items-center text-center">
          <div className="w-full text-left">
            <h3 className="font-headline text-base font-bold text-[#1e1b19]">
              Annual Charity Budget Utilization
            </h3>
            <p className="text-xs text-[#59413a]">Stewardship allocation for benevolence & mercy</p>
          </div>

          {/* SVG Donut Chart */}
          <div className="relative w-44 h-44 my-4 flex items-center justify-center">
            <svg
              role="img"
              aria-label="Annual charity budget utilization: 72.1% disbursed — KSh 118,965 released year to date of the KSh 165,000 total allocation."
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="40" stroke="#f4ece8" strokeWidth="12" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#c2410c"
                strokeWidth="12"
                strokeDasharray="251.2"
                strokeDashoffset="70"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="font-headline text-2xl font-bold text-[#1e1b19]">72.1%</span>
              <span className="text-[10px] text-[#59413a] uppercase tracking-wider font-semibold">Disbursed</span>
            </div>
          </div>

          <div className="w-full p-3.5 bg-[#faf2ee] rounded-xl flex items-center justify-between text-xs border border-[#EAE1D7]">
            <div>
              <span className="text-[#59413a] block">Released YTD</span>
              <strong className="text-sm font-headline text-[#9b2f00]">KSh 118,965</strong>
            </div>
            <div className="h-6 w-px bg-[#EAE1D7]"></div>
            <div>
              <span className="text-[#59413a] block">Total Allocation</span>
              <strong className="text-sm font-headline text-[#1e1b19]">KSh 165,000</strong>
            </div>
          </div>
        </div>

        {/* Right: 4 Initiative Progress Meters (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-base font-bold text-[#1e1b19]">
              Active Charity Operations Progress
            </h3>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              + Record Expense
            </button>
          </div>

          <div className="space-y-3.5">
            {/* Initiative 1 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#1e1b19]">Community Food Drive Annex</span>
                <span className="font-mono text-[#9b2f00] font-bold">KSh 42,000 / KSh 48,000 (87.5%)</span>
              </div>
              <div className="w-full bg-[#EAE1D7] h-2 rounded-full overflow-hidden">
                <div className="bg-[#9b2f00] h-full" style={{ width: '87.5%' }}></div>
              </div>
            </div>

            {/* Initiative 2 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#1e1b19]">Regional Free Medical Clinic</span>
                <span className="font-mono text-[#904d00] font-bold">KSh 28,500 / KSh 35,000 (81.4%)</span>
              </div>
              <div className="w-full bg-[#EAE1D7] h-2 rounded-full overflow-hidden">
                <div className="bg-[#fe932c] h-full" style={{ width: '81.4%' }}></div>
              </div>
            </div>

            {/* Initiative 3 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#1e1b19]">Kenya Clean Water Borehole Mission</span>
                <span className="font-mono text-[#007d57] font-bold">KSh 24,000 / KSh 30,000 (80.0%)</span>
              </div>
              <div className="w-full bg-[#EAE1D7] h-2 rounded-full overflow-hidden">
                <div className="bg-[#007d57] h-full" style={{ width: '80%' }}></div>
              </div>
            </div>

            {/* Initiative 4 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#1e1b19]">Festive Food & Grocery Drive</span>
                <span className="font-mono text-[#c2410c] font-bold">KSh 8,465 / KSh 12,000 (70.5%)</span>
              </div>
              <div className="w-full bg-[#EAE1D7] h-2 rounded-full overflow-hidden">
                <div className="bg-[#c2410c] h-full" style={{ width: '70.5%' }}></div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#f4ece8] flex items-center justify-between text-xs text-[#59413a]">
            <span>Next review: Annual Congregational Meeting</span>
            <span className="font-bold text-[#006243] flex items-center gap-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">verified</span> Fully Funded
            </span>
          </div>
        </div>
      </div>

      {/* Field Activity Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#EAE1D7] shadow-xs flex flex-col justify-between">
          <div>
            <span className="px-2 py-0.5 rounded-md bg-[#ffdbd0] text-[#9b2f00] text-[10px] font-bold uppercase">
              Food Security
            </span>
            <h4 className="font-headline text-sm font-bold text-[#1e1b19] mt-2">
              Saturday Food Distribution Drive
            </h4>
            <p className="text-xs text-[#59413a] mt-1 leading-relaxed">
              140 families served with fresh produce, dry goods and pastoral prayer at the church grounds.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-[11px] font-mono text-[#59413a]">
            Rhythm: Every 2nd & 4th Saturday
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#EAE1D7] shadow-xs flex flex-col justify-between">
          <div>
            <span className="px-2 py-0.5 rounded-md bg-[#ffdcc3] text-[#2f1500] text-[10px] font-bold uppercase">
              Community Health
            </span>
            <h4 className="font-headline text-sm font-bold text-[#1e1b19] mt-2">
              Community Free Health Screening
            </h4>
            <p className="text-xs text-[#59413a] mt-1 leading-relaxed">
              52 local residents screened for diabetes and hypertension with free prescriptions and physician consultations.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-[11px] font-mono text-[#59413a]">
            Lead: Dr. Jonathan Mwaura
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#EAE1D7] shadow-xs flex flex-col justify-between">
          <div>
            <span className="px-2 py-0.5 rounded-md bg-[#85f8c4]/40 text-[#005137] text-[10px] font-bold uppercase">
              Global Missions
            </span>
            <h4 className="font-headline text-sm font-bold text-[#1e1b19] mt-2">
              Kenya Well Commissioning
            </h4>
            <p className="text-xs text-[#59413a] mt-1 leading-relaxed">
              Freshwater solar well serving 600 villagers in Samburu region now active and providing potable drinking water.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-[11px] font-mono text-[#59413a]">
            Partner: Samburu Hope Missions
          </div>
        </div>
      </div>

      {/* Expenditure Ledger & Disbursement Audit Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
        <div className="p-4 border-b border-[#EAE1D7] bg-[#faf2ee]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[20px]">receipt</span>
            <h3 className="font-headline text-sm font-bold text-[#1e1b19]">
              Benevolence Expenditure Ledger & Verification Audit
            </h3>
          </div>
          <span className="text-xs text-[#006243] font-bold flex items-center gap-1">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check_circle</span>
            All Receipts Reconciled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#faf2ee] text-[#59413a] font-semibold uppercase tracking-wider border-b border-[#EAE1D7]">
                <th className="py-3 px-4">Disbursement Code</th>
                <th className="py-3 px-4">Item & Intervention</th>
                <th className="py-3 px-4">Initiative</th>
                <th className="py-3 px-4">Vendor / Supplier</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE1D7] text-[#1e1b19]">
              {EXPENSES.map((exp) => (
                <tr key={exp.id} className="hover:bg-[#faf2ee]/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#9b2f00]">{exp.code}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#1e1b19]">{exp.item}</td>
                  <td className="py-3.5 px-4 text-[#59413a]">{exp.initiative}</td>
                  <td className="py-3.5 px-4 text-[#59413a]">{exp.vendor}</td>
                  <td className="py-3.5 px-4 text-right font-headline font-bold text-sm text-[#1e1b19]">
                    KSh {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-[#59413a] font-mono text-[11px]">{exp.date}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold">
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">verified</span>
                      {exp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quarterly Board Audit & Sign-off Seal */}
      <div className="p-4 rounded-2xl bg-[#faf2ee] border border-[#EAE1D7] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#007d57] text-white flex items-center justify-center shrink-0">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">workspace_premium</span>
          </div>
          <div>
            <h4 className="font-headline text-xs font-bold text-[#1e1b19]">
              Q4 Charity & Benevolence Audit Certified
            </h4>
            <p className="text-xs text-[#59413a]">
              100% of benevolence disbursements reconciled with receipts by external certified auditor Thomas & Co. LLP.
            </p>
          </div>
        </div>
        <button className="h-8 px-3 rounded-lg bg-white border border-[#EAE1D7] text-xs font-bold text-[#1e1b19] hover:bg-[#f4ece8] shrink-0">
          Download Audit Certificate
        </button>
      </div>

      {/* Record Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" {...expenseModalOpenDialog}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAE1D7] pb-3">
              <h3 className="font-headline text-base font-bold text-[#1e1b19]">Record Charity Disbursement</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-[#59413a] hover:text-[#1e1b19]" aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="charity-item" className="block font-semibold mb-1">Item / Description</label>
                <input id="charity-item" aria-label="Item / Description" type="text" placeholder="e.g. School Shoes for Youth Drive" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="charity-amount" className="block font-semibold mb-1">Amount (KSh)</label>
                  <input id="charity-amount" aria-label="Amount (KSh)" type="number" placeholder="850.00" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]" />
                </div>
                <div>
                  <label htmlFor="charity-initiative" className="block font-semibold mb-1">Initiative</label>
                  <select id="charity-initiative" aria-label="Initiative" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]">
                    <option>Community Food Drive</option>
                    <option>Regional Free Medical Clinic</option>
                    <option>Kenya Water Borehole</option>
                    <option>Festive Season Outreach</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="charity-vendor" className="block font-semibold mb-1">Vendor / Payee</label>
                <input id="charity-vendor" aria-label="Vendor / Payee" type="text" placeholder="e.g. Nyahururu Grocers Ltd" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE1D7]">
              <button onClick={() => setIsExpenseModalOpen(false)} className="px-3.5 py-1.5 text-xs text-[#59413a]">Cancel</button>
              <button onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs">
                Log Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
