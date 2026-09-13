import React, { useState } from 'react';

export const FinancesOfferingsPanel: React.FC = () => {
  const [showDenominations, setShowDenominations] = useState(false);

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* 4 Offering Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Sunday Service Total
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#9b2f00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">shopping_basket</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">KSh 38,420</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>Feb 02 across 3 worship services</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            +9.1% over weekly target
          </div>
        </div>

        {/* Stat 2 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Per Capita Avg
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#904d00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">person_outline</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">KSh 45.63</div>
            <div className="flex items-center gap-1 mt-1 text-[#59413a] text-xs">
              <span>Based on 842 verified attendees</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Highest at 11:00 AM (KSh 48.20/person)
          </div>
        </div>

        {/* Stat 3 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Cash vs Envelopes
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#c2410c] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">pie_chart</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-2xl font-bold text-[#1e1b19]">34%</span>
              <span className="text-xs text-[#59413a]">Plate /</span>
              <span className="font-headline text-2xl font-bold text-[#9b2f00]">66%</span>
              <span className="text-xs text-[#59413a]">Envelopes</span>
            </div>
            <div className="w-full bg-[#EAE1D7] rounded-full h-1.5 mt-2 overflow-hidden flex">
              <div className="bg-[#fe932c] h-full" style={{ width: '34%' }}></div>
              <div className="bg-[#9b2f00] h-full" style={{ width: '66%' }}></div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Dual-custody counted & signed
          </div>
        </div>

        {/* Stat 4 */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Weekly Variance
            </span>
            <span className="p-2 rounded-xl bg-[#85f8c4]/40 text-[#002114] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">query_stats</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#006243]">+KSh 3,220</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Baseline target: KSh 35,200</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            General Operating Fund Surplus
          </div>
        </div>
      </div>

      {/* 12-Week Giving Trend Chart */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1e1b19]">
              12-Week Sunday Offering Inflow & Target Variance
            </h3>
            <p className="text-xs text-[#59413a]">
              Plate collections, numbered envelopes, and kiosk contactless giving across Q1/Q2.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-[#1e1b19]">
              <span className="w-3 h-3 rounded-md bg-[#c2410c]"></span> Actual Received
            </span>
            <span className="flex items-center gap-1.5 text-[#59413a]">
              <span className="w-4 h-0.5 bg-[#8d7168] border-t border-dashed"></span> Budget Target (KSh 35.2k)
            </span>
          </div>
        </div>

        {/* Visual Bar Graph */}
        <div className="h-44 w-full flex items-end justify-between gap-2 sm:gap-4 pt-4 px-2 border-b border-[#EAE1D7]">
          {[
            { week: 'W31', amt: 34.1 },
            { week: 'W32', amt: 35.8 },
            { week: 'W33', amt: 33.5 },
            { week: 'W34', amt: 36.2 },
            { week: 'W35', amt: 37.0 },
            { week: 'W36', amt: 34.9 },
            { week: 'W37', amt: 35.2 },
            { week: 'W38', amt: 38.0 },
            { week: 'W39', amt: 36.5 },
            { week: 'W40', amt: 37.8 },
            { week: 'W41', amt: 35.4 },
            { week: 'W42', amt: 38.4, active: true },
          ].map((item, idx) => {
            const heightPct = Math.round((item.amt / 42) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-[#1e1b19] text-white px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap z-10 pointer-events-none">
                  KSh {item.amt}k
                </div>
                <div className="w-full bg-[#f4ece8] rounded-t-lg h-36 flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      item.active ? 'bg-[#9b2f00]' : 'bg-[#c2410c]/80 group-hover:bg-[#c2410c]'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  ></div>
                </div>
                <span className={`text-[10px] font-mono ${item.active ? 'font-bold text-[#9b2f00]' : 'text-[#59413a]'}`}>
                  {item.week}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Campus Collection Tally Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
        <div className="p-4 border-b border-[#EAE1D7] bg-[#faf2ee]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[20px]">table_chart</span>
            <h3 className="font-headline text-sm font-bold text-[#1e1b19]">
              February 02 Service Collections Tally
            </h3>
          </div>
          <button
            onClick={() => setShowDenominations(!showDenominations)}
            className="text-xs font-bold text-[#9b2f00] hover:text-[#c2410c] flex items-center gap-1 cursor-pointer"
          >
            <span>{showDenominations ? 'Hide Cash Denominations' : 'View Cash Denomination Count'}</span>
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              {showDenominations ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#faf2ee] text-[#59413a] font-semibold uppercase tracking-wider border-b border-[#EAE1D7]">
                <th className="py-3 px-4">Service Gathering</th>
                <th className="py-3 px-4">Audited Attendance</th>
                <th className="py-3 px-4">Plate Cash</th>
                <th className="py-3 px-4">Designated Envelopes</th>
                <th className="py-3 px-4 text-right">Service Total</th>
                <th className="py-3 px-4 text-right">Counters Sign-off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE1D7] text-[#1e1b19]">
              <tr className="hover:bg-[#faf2ee]/40">
                <td className="py-3.5 px-4 font-semibold">8:00 AM First Service</td>
                <td className="py-3.5 px-4 font-mono text-[#59413a]">310 attendees</td>
                <td className="py-3.5 px-4 font-mono">KSh 4,850.00</td>
                <td className="py-3.5 px-4 font-mono">KSh 9,620.00</td>
                <td className="py-3.5 px-4 text-right font-headline font-bold text-sm text-[#1e1b19]">KSh 14,470.00</td>
                <td className="py-3.5 px-4 text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">verified</span> Dual Signed
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#faf2ee]/40">
                <td className="py-3.5 px-4 font-semibold">10:00 AM Praise & Worship</td>
                <td className="py-3.5 px-4 font-mono text-[#59413a]">420 attendees</td>
                <td className="py-3.5 px-4 font-mono">KSh 6,120.00</td>
                <td className="py-3.5 px-4 font-mono">KSh 12,480.00</td>
                <td className="py-3.5 px-4 text-right font-headline font-bold text-sm text-[#1e1b19]">KSh 18,600.00</td>
                <td className="py-3.5 px-4 text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">verified</span> Dual Signed
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#faf2ee]/40">
                <td className="py-3.5 px-4 font-semibold">Wednesday Midweek Service</td>
                <td className="py-3.5 px-4 font-mono text-[#59413a]">112 attendees</td>
                <td className="py-3.5 px-4 font-mono">KSh 1,250.00</td>
                <td className="py-3.5 px-4 font-mono">KSh 2,800.00</td>
                <td className="py-3.5 px-4 text-right font-headline font-bold text-sm text-[#1e1b19]">KSh 4,050.00</td>
                <td className="py-3.5 px-4 text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">verified</span> Dual Signed
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#faf2ee]/40 bg-[#faf2ee]/20">
                <td className="py-3.5 px-4 font-semibold">Midweek Prayer & Study</td>
                <td className="py-3.5 px-4 font-mono text-[#59413a]">68 attendees</td>
                <td className="py-3.5 px-4 font-mono">KSh 450.00</td>
                <td className="py-3.5 px-4 font-mono">KSh 850.00</td>
                <td className="py-3.5 px-4 text-right font-headline font-bold text-sm text-[#1e1b19]">KSh 1,300.00</td>
                <td className="py-3.5 px-4 text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">verified</span> Dual Signed
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Collapsible Denomination Count Details */}
        {showDenominations && (
          <div className="p-4 bg-[#faf2ee] border-t border-[#EAE1D7] animate-in fade-in duration-200">
            <h4 className="font-headline text-xs font-bold text-[#1e1b19] mb-3">
              Sunday Physical Currency Vault Count (#B-902)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-[#EAE1D7]">
                <span className="text-[#59413a] block text-[10px]">KSh 100 Bills (54 pcs)</span>
                <span className="font-headline font-bold text-[#1e1b19]">KSh 5,400.00</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-[#EAE1D7]">
                <span className="text-[#59413a] block text-[10px]">KSh 50 Bills (48 pcs)</span>
                <span className="font-headline font-bold text-[#1e1b19]">KSh 2,400.00</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-[#EAE1D7]">
                <span className="text-[#59413a] block text-[10px]">KSh 20 Bills (192 pcs)</span>
                <span className="font-headline font-bold text-[#1e1b19]">KSh 3,840.00</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-[#EAE1D7]">
                <span className="text-[#59413a] block text-[10px]">KSh 10 Bills (62 pcs)</span>
                <span className="font-headline font-bold text-[#1e1b19]">KSh 620.00</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-[#EAE1D7]">
                <span className="text-[#59413a] block text-[10px]">KSh 5 & KSh 1 Bills (310 pcs)</span>
                <span className="font-headline font-bold text-[#1e1b19]">KSh 410.00</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-[#EAE1D7]">
                <span className="text-[#59413a] block text-[10px]">Total Plate Cash</span>
                <span className="font-headline font-bold text-[#9b2f00]">KSh 12,670.00</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dual Custody Audit Notice */}
      <div className="p-4 rounded-2xl bg-[#faf2ee] border border-[#EAE1D7] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#006243] text-white flex items-center justify-center shrink-0">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">lock</span>
          </div>
          <p className="text-xs text-[#59413a]">
            <strong>Cash Count Dual-Custody Verification:</strong> Safe Deposit Bag <strong className="text-[#1e1b19]">#B-902</strong> sealed with tamper-evident strip #TX-7814 at 1:45 PM by Elder Marcus Kamau and Clara Wambui.
          </p>
        </div>
        <button className="h-8 px-3 rounded-lg bg-white border border-[#EAE1D7] text-xs font-bold text-[#1e1b19] hover:bg-[#f4ece8] shrink-0">
          Print Tally Sheet
        </button>
      </div>

      {/* 3 Supporting Operations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#EAE1D7] shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[#904d00] text-[18px]">mail</span>
            <h4 className="font-headline text-xs font-bold text-[#1e1b19]">Envelopes Distribution</h4>
          </div>
          <p className="text-xs text-[#59413a] leading-relaxed">
            2025 Annual Giving Envelope boxes ready for congregation pickup at North Foyer Welcome Hub.
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#EAE1D7] shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[#006243] text-[18px]">local_shipping</span>
            <h4 className="font-headline text-xs font-bold text-[#1e1b19]">Armored Courier Pickup</h4>
          </div>
          <p className="text-xs text-[#59413a] leading-relaxed">
            Brink's Secure Deposit scheduled for Monday at 09:30 AM directly to Wells Fargo Commercial Vault.
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#EAE1D7] shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[18px]">public</span>
            <h4 className="font-headline text-xs font-bold text-[#1e1b19]">Special Second Offering</h4>
          </div>
          <p className="text-xs text-[#59413a] leading-relaxed">
            Missionary Aviation Fellowship fund reached KSh 3,840 from the special love offering basket.
          </p>
        </div>
      </div>
    </div>
  );
};
