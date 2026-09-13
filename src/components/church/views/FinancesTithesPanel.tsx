import { useDialog } from '../dialog';
import React, { useState } from 'react'
;

interface TitheTx {
  id: string;
  txCode: string;
  donor: string;
  envelopeNo: string;
  method: string;
  methodIcon: string;
  category: string;
  amount: number;
  date: string;
  status: 'Completed' | 'Cleared' | 'Pending';
}

const TRANSACTIONS: TitheTx[] = [
  {
    id: 'tx-1',
    txCode: '#TX-98421',
    donor: 'Elder Marcus Kamau',
    envelopeNo: '#ENV-104',
    method: 'Bank Standing Order',
    methodIcon: 'account_balance',
    category: 'General Tithe',
    amount: 1250.00,
    date: 'Feb 07, 2025 · 08:30 AM',
    status: 'Completed',
  },
  {
    id: 'tx-2',
    txCode: '#TX-98420',
    donor: 'Sarah Kimani',
    envelopeNo: '#ENV-202',
    method: 'Debit / Credit Card (Stripe)',
    methodIcon: 'credit_card',
    category: 'Pastoral Tithe',
    amount: 850.00,
    date: 'Feb 06, 2025 · 04:15 PM',
    status: 'Completed',
  },
  {
    id: 'tx-3',
    txCode: '#TX-98419',
    donor: 'Arthur Wanjala',
    envelopeNo: '#ENV-012',
    method: 'Cheque #4082',
    methodIcon: 'receipt_long',
    category: 'Senior Stewardship',
    amount: 2500.00,
    date: 'Feb 05, 2025 · 11:00 AM',
    status: 'Cleared',
  },
  {
    id: 'tx-4',
    txCode: '#TX-98418',
    donor: 'Dr. Jonathan Mwaura',
    envelopeNo: '#ENV-330',
    method: 'M-PESA Standing Order',
    methodIcon: 'sync',
    category: 'Faculty & Staff Tithe',
    amount: 900.00,
    date: 'Feb 04, 2025 · 09:00 AM',
    status: 'Completed',
  },
  {
    id: 'tx-5',
    txCode: '#TX-98417',
    donor: 'Anonymous Giver',
    envelopeNo: '#ENV-999',
    method: 'Cash Offering (Audited Envelope)',
    methodIcon: 'payments',
    category: 'Sunday 11am Basket',
    amount: 350.00,
    date: 'Feb 03, 2025 · 12:45 PM',
    status: 'Completed',
  },
  {
    id: 'tx-6',
    txCode: '#TX-98416',
    donor: 'Timothy & Chloe Mwangi',
    envelopeNo: '#ENV-108',
    method: 'M-PESA Paybill',
    methodIcon: 'phone_iphone',
    category: 'Young Family Tithe',
    amount: 600.00,
    date: 'Feb 03, 2025 · 11:20 AM',
    status: 'Completed',
  },
];

export const FinancesTithesPanel: React.FC = () => {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All Payment Methods');
  const [dateRange, setDateRange] = useState('February 2025 (MTD)');
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const offlineModalOpenDialog = useDialog(() => setIsOfflineModalOpen(false), "Record Offline Envelope / Cheque");

  const filteredTx = TRANSACTIONS.filter(t => {
    const matchesSearch = [t.donor, t.txCode, t.envelopeNo].some((field) =>
      field.toLowerCase().includes(search.toLowerCase())
    );
    // The filter labels are the method families, so "Cheque" also covers "Cheque #4082".
    const matchesMethod = paymentFilter === 'All Payment Methods' || t.method.startsWith(paymentFilter);
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* 4 Stewardship KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Total Tithes MTD
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#9b2f00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">volunteer_activism</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">KSh 142,850</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>+12.4% vs previous month</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            284 MTD Contributions Logged
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Recurring Tithe Ratio
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#006243] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">cached</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-[#006243]">68.2%</span>
              <span className="text-xs text-[#59413a]">of volume</span>
            </div>
            <div className="w-full bg-[#f4ece8] rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-[#006243] h-full rounded-full" style={{ width: '68.2%' }}></div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            194 Automated Members
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              One-Time Tithes
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#904d00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">payments</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">KSh 45,420</div>
            <div className="flex items-center gap-1 mt-1 text-[#904d00] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">pin_drop</span>
              <span>90 distinct envelope gifts</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Avg. Gift: KSh 504.66
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Tax Compliance
            </span>
            <span className="p-2 rounded-xl bg-[#85f8c4]/40 text-[#002114] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">verified</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#006243]">100%</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Registered Society · Audited Receipts</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Tax receipts issued instantaneously
          </div>
        </div>
      </div>

      {/* Tithe Inflow Visualizer & Campaign Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Chart (8 Cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                February Tithe Flow Velocity
              </h3>
              <p className="text-xs text-[#59413a]">Weekly recurring vs one-time giving trajectory</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-[#9b2f00] font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9b2f00]"></span> Recurring Tithes
              </span>
              <span className="flex items-center gap-1.5 text-[#904d00] font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#fe932c]"></span> One-Time Envelopes
              </span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="h-44 w-full relative pt-2">
            <svg
              role="img"
              aria-label="February tithe flow by week. Recurring tithes climb steadily through the month while one-time envelope giving stays lower and peaks mid-month; at the marked Week 2 peak, recurring tithes were KSh 36,200 against KSh 14,100 one-time."
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 120"
              preserveAspectRatio="none"
            >
              {/* Grid Lines */}
              <line x1="0" y1="20" x2="600" y2="20" stroke="#f4ece8" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="600" y2="60" stroke="#f4ece8" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="600" y2="100" stroke="#f4ece8" strokeDasharray="3 3" />

              {/* Area 1 Recurring */}
              <path
                d="M 50 80 Q 180 55, 300 45 T 550 25 L 550 120 L 50 120 Z"
                fill="rgba(194, 65, 12, 0.08)"
              />
              {/* Line 1 Recurring */}
              <path
                d="M 50 80 Q 180 55, 300 45 T 550 25"
                fill="none"
                stroke="#c2410c"
                strokeWidth="3"
              />

              {/* Line 2 One-Time */}
              <path
                d="M 50 100 Q 180 90, 300 70 T 550 85"
                fill="none"
                stroke="#fe932c"
                strokeWidth="2.5"
                strokeDasharray="4 2"
              />

              {/* Points & Labels */}
              <circle cx="50" cy="80" r="4" fill="#c2410c" />
              <circle cx="210" cy="55" r="4" fill="#c2410c" />
              <circle cx="370" cy="40" r="5" fill="#c2410c" stroke="#fff" strokeWidth="2" />
              <circle cx="550" cy="25" r="4" fill="#c2410c" />

              <circle cx="370" cy="72" r="4" fill="#fe932c" />
            </svg>

            {/* Simulated Tooltip on Feb W2 */}
            <div className="absolute left-[30%] top-2 bg-[#1e1b19] text-white p-2 rounded-xl text-[11px] shadow-lg pointer-events-none">
              <div className="font-bold text-[#ffdcc3]">Feb Week 2</div>
              <div>Recurring: KSh 36,200</div>
              <div>One-Time: KSh 14,100</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#59413a] pt-3 border-t border-[#f4ece8] font-mono">
            <span>Week 1 (Feb 1–7)</span>
            <span className="font-bold text-[#9b2f00]">Week 2 (Feb 8–14)</span>
            <span>Week 3 (Feb 15–21)</span>
            <span>Week 4 (Feb 22–28)</span>
          </div>
        </div>

        {/* Campaign Drive Card (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ffdcc3] text-[#2f1500] text-xs font-bold">
                Active Campaign
              </span>
              <span className="font-mono text-xs text-[#59413a]">11 Days Left</span>
            </div>
            <h3 className="font-headline text-base font-bold text-[#1e1b19]">
              January Stewardship Drive
            </h3>
            <p className="text-xs text-[#59413a] mt-1 leading-relaxed">
              Targeted member pledges for sanctuary audio upgrades and pastoral residency stipends.
            </p>

            <div className="mt-4 p-3.5 bg-[#faf2ee] rounded-xl space-y-2 border border-[#EAE1D7]">
              <div className="flex justify-between text-xs">
                <span className="text-[#59413a]">Pledged Raised:</span>
                <span className="font-bold text-[#1e1b19]">KSh 140,400</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#59413a]">Goal:</span>
                <span className="font-semibold text-[#59413a]">KSh 180,000</span>
              </div>
              <div className="w-full bg-[#EAE1D7] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#c2410c] h-full rounded-full" style={{ width: '78%' }}></div>
              </div>
              <div className="flex justify-between text-[11px] font-mono text-[#9b2f00] font-bold">
                <span>78% Achieved</span>
                <span>KSh 39,600 Needed</span>
              </div>
            </div>
          </div>

          <button className="w-full h-9 mt-4 rounded-xl bg-[#faf2ee] hover:bg-[#f4ece8] text-[#9b2f00] text-xs font-bold border border-[#EAE1D7] transition-colors flex items-center justify-center gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">campaign</span>
            <span>View Campaign Roster</span>
          </button>
        </div>
      </div>

      {/* End of Year Statements Banner */}
      <div className="p-4 rounded-2xl bg-[#faf2ee] border border-[#EAE1D7] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#007d57] text-white flex items-center justify-center shrink-0">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">receipt_long</span>
          </div>
          <div>
            <h4 className="font-headline text-xs font-bold text-[#1e1b19]">
              End-of-Year Tax Contribution Statements
            </h4>
            <p className="text-xs text-[#59413a]">
              Automated compilation of KRA-compliant giving statements for all tithers with active email or postal records.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="h-8 px-3 rounded-lg bg-white border border-[#EAE1D7] text-xs font-semibold text-[#1e1b19] hover:bg-[#f4ece8]">
            View Templates
          </button>
          <button className="h-8 px-3.5 rounded-lg bg-[#904d00] hover:bg-[#6e3900] text-white text-xs font-bold shadow-xs">
            Generate 2025 Statements
          </button>
        </div>
      </div>

      {/* Tithe Transaction Journal Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#EAE1D7] flex flex-col md:flex-row items-center justify-between gap-3 bg-[#faf2ee]/40">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-[#8d7168] text-[18px]">search</span>
              <input aria-label="Search donor or envelope"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search donor or envelope..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-white border border-[#EAE1D7] text-xs text-[#1e1b19] placeholder:text-[#8d7168] focus:outline-none"
              />
            </div>
            <select aria-label="Payment type filter"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-9 px-3 rounded-xl bg-white border border-[#EAE1D7] text-xs font-medium text-[#1e1b19] outline-none"
            >
              <option>All Payment Methods</option>
              <option>Bank Standing Order</option>
              <option>Debit / Credit Card</option>
              <option>Cheque</option>
              <option>Cash Offering</option>
            </select>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button className="h-9 px-3 rounded-xl bg-white border border-[#EAE1D7] text-xs font-semibold text-[#1e1b19] hover:bg-[#f4ece8] flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setIsOfflineModalOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_card</span>
              <span>Record Offline Tithe</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#faf2ee] text-[#59413a] font-semibold uppercase tracking-wider border-b border-[#EAE1D7]">
                <th className="py-3 px-4">Transaction Code</th>
                <th className="py-3 px-4">Donor & Envelope</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE1D7] text-[#1e1b19]">
              {filteredTx.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#faf2ee]/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#9b2f00]">
                    {tx.txCode}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#1e1b19]">{tx.donor}</span>
                      <span className="font-mono text-[10px] text-[#59413a]">{tx.envelopeNo}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="inline-flex items-center gap-1.5 text-[#59413a]">
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#9b2f00]">{tx.methodIcon}</span>
                      <span>{tx.method}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#59413a]">
                    {tx.category}
                  </td>
                  <td className="py-3.5 px-4 text-right font-headline font-bold text-sm text-[#1e1b19]">
                    KSh {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-[#59413a] font-mono text-[11px]">
                    {tx.date}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#85f8c4]/30 text-[#005137] text-[11px] font-bold">
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button className="p-1 rounded text-[#59413a] hover:text-[#9b2f00] hover:bg-[#f4ece8] transition-colors" title="Download Receipt PDF">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">download</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Offline Tithe Modal */}
      {isOfflineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" {...offlineModalOpenDialog}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAE1D7] pb-3">
              <h3 className="font-headline text-base font-bold text-[#1e1b19]">Record Offline Envelope / Cheque</h3>
              <button onClick={() => setIsOfflineModalOpen(false)} className="text-[#59413a] hover:text-[#1e1b19]" aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="offline-donor" className="block font-semibold mb-1">Donor Name / Member ID</label>
                <input id="offline-donor" aria-label="Donor Name / Member ID" type="text" placeholder="e.g. Arthur Wanjala (#ENV-012)" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="offline-amount" className="block font-semibold mb-1">Amount (KSh)</label>
                  <input id="offline-amount" aria-label="Amount (KSh)" type="number" placeholder="500.00" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]" />
                </div>
                <div>
                  <label htmlFor="offline-payment-type" className="block font-semibold mb-1">Payment Type</label>
                  <select id="offline-payment-type" aria-label="Payment Type" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]">
                    <option>Cheque</option>
                    <option>Cash Envelope</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="offline-reference" className="block font-semibold mb-1">Cheque / Reference #</label>
                <input id="offline-reference" aria-label="Cheque / Reference #" type="text" placeholder="e.g. Cheque #4082" className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE1D7]">
              <button onClick={() => setIsOfflineModalOpen(false)} className="px-3.5 py-1.5 text-xs text-[#59413a]">Cancel</button>
              <button onClick={() => setIsOfflineModalOpen(false)} className="px-4 py-2 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs">
                Log Tithe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
