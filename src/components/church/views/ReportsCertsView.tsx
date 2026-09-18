import React, { useState } from 'react';
import { certificatesApi, financeApi } from '../../../lib/api';
import { errorMessage, useCertificates, useMemberReport, useMutation } from '../../../hooks/useApi';
import { useChurchIdentity } from '../../../hooks/useChurchIdentity';
import { useAuth } from '../../../lib/auth';
import {
  buildBaptismCertificate,
  buildDedicationCertificate,
  buildFinanceSummary,
  buildMembershipReport,
  printDocument,
} from '../../../lib/documents';
import { ErrorBlock, LoadingBlock } from '../DataState';

type CertificateType = 'baptism' | 'dedication';

/**
 * What the church can hand to a person or a meeting as an official document.
 *
 * Three documents and one mechanism. The mechanism is the browser's own print dialog, which on every
 * platform offers "Save as PDF" — deliberately, rather than a PDF library drawing boxes: a church
 * certificate is a typographic object with a display face, generous leading, a rule and a seal, and CSS
 * is genuinely good at exactly that while it is also what already ships with the machine. The clerk
 * sees the very layout being printed, and there is nothing to install.
 *
 * What this screen replaced is worth knowing. It used to be a wall of figures — 328 documents
 * generated this quarter, 85% compilation index — that nothing computed, above buttons that printed
 * nothing. On a screen whose whole purpose is a document somebody signs, an invented number is worse
 * than an empty one, so the counters here are read from the register and the treasury instead.
 *
 * The certificate form takes the ceremony details as typed, because the register holds dates but not
 * the wording of a service, and a clerk issuing a certificate for a baptism recorded years ago needs
 * to be able to set the date the certificate should carry.
 */
export const ReportsCertsView: React.FC = () => {
  const { user } = useAuth();
  const { church } = useChurchIdentity();
  const register = useMemberReport();
  const report = register.data?.data ?? null;

  const [certificateType, setCertificateType] = useState<CertificateType>('baptism');
  const [fullName, setFullName] = useState('');
  const [parents, setParents] = useState('');
  const [officiant, setOfficiant] = useState('');
  const [ceremonyDate, setCeremonyDate] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [scriptureReference, setScriptureReference] = useState('Romans 6:4');

  const [working, setWorking] = useState<'certificate' | 'register' | 'treasury' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  /** The register, so issuance is recorded rather than only printed. */
  const ledger = useCertificates();
  const issue = useMutation(certificatesApi.issue);

  /** A typed date, as the certificate should carry it. An unreadable one prints as an em dash. */
  const parsedDate = (): string | null => {
    if (!ceremonyDate.trim()) return null;
    const parsed = new Date(ceremonyDate.trim());
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  const handlePrintCertificate = async () => {
    if (!fullName.trim()) {
      setProblem('Name the person the certificate is for.');
      return;
    }
    if (!ceremonyDate.trim()) {
      setProblem('Enter the date of the ordinance — a certificate without its date is not a record.');
      return;
    }
    setWorking('certificate');
    setProblem(null);
    setDone(null);
    try {
      // Issued first, printed second: the serial exists because the register says so, and the page
      // the printer sees is the copy of that record — not the other way round.
      const issued = await issue.run({
        kind: certificateType,
        fullName: fullName.trim(),
        ...(registerNumber.trim() ? { memberNumber: registerNumber.trim() } : {}),
        ...(certificateType === 'dedication' && parents.trim() ? { parents: parents.trim() } : {}),
        ceremonyDate: parsedDate() as string,
        ...(officiant.trim() ? { officiant: officiant.trim() } : {}),
        ...(certificateType === 'baptism' && scriptureReference.trim() ? { scripture: scriptureReference.trim() } : {}),
      }).catch((cause: unknown) => {
        throw new Error(errorMessage(cause));
      });
      const serial = issued.data.serial;

      const html =
        certificateType === 'dedication'
          ? buildDedicationCertificate({
              church,
              childName: fullName.trim(),
              parents: parents.trim() || 'the parents',
              dedicationDate: parsedDate(),
              officiant: officiant.trim() || null,
              memberNumber: registerNumber.trim() || '—',
              location: church.location,
              serial,
            })
          : buildBaptismCertificate({
              church,
              fullName: fullName.trim(),
              baptismDate: parsedDate(),
              officiant: officiant.trim() || null,
              memberNumber: registerNumber.trim() || '—',
              location: church.location,
              scriptureReference: scriptureReference.trim() || undefined,
              serial,
            });

      await printDocument(html);
      void ledger.refetch();
      setDone(
        `Certificate ${serial} for ${fullName.trim()} was recorded in the register and handed to the printer.`,
      );
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : errorMessage(cause));
    } finally {
      setWorking(null);
    }
  };

  const handlePrintRegister = async () => {
    setWorking('register');
    setProblem(null);
    setDone(null);
    try {
      if (!report) throw new Error('The register report has not loaded yet.');
      await printDocument(
        buildMembershipReport({
          church,
          generatedBy: user?.name ?? 'the church office',
          report,
        }),
      );
      setDone('The register summary was handed to the printer.');
    } catch (cause) {
      setProblem(errorMessage(cause));
    } finally {
      setWorking(null);
    }
  };

  const handlePrintTreasury = async () => {
    setWorking('treasury');
    setProblem(null);
    setDone(null);
    try {
      const summary = await financeApi.summary();
      await printDocument(
        buildFinanceSummary({
          church,
          generatedBy: user?.name ?? 'the church office',
          summary: summary.data,
        }),
      );
      setDone('The treasury summary was handed to the printer.');
    } catch (cause) {
      setProblem(errorMessage(cause));
    } finally {
      setWorking(null);
    }
  };

  const certificateTitle =
    certificateType === 'dedication' ? 'Certificate of Child Dedication' : 'Certificate of Christian Baptism';

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="pt-2 pb-4 space-y-1.5">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#f4ece8] text-[#59413a] text-[11px] font-semibold tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c]"></span>
          Printed &amp; Signed Documents
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl text-[#1e1b19] font-bold tracking-tight">
          Reports &amp; Certificates
        </h1>
        <p className="text-sm text-[#59413a] max-w-2xl">
          Certificates the church issues, and the two summaries a council asks for — printed from the live register and
          the live ledger, on the church’s own letterhead. Every certificate is recorded with its own serial as it is
          issued; use your browser’s “Save as PDF” to file a copy.
        </p>
      </div>

      {problem && <div className="mb-4"><ErrorBlock message={problem} /></div>}
      {done && (
        <div className="mb-4 p-3.5 rounded-[12px] bg-[#059669]/10 border border-[#059669]/30 text-[#047857] text-xs font-bold flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">check_circle</span>
          {done}
        </div>
      )}

      <div className="flex flex-col space-y-8">
        {/* SECTION 1: Certificates */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(194,65,12,0.02)] border border-[#e1bfb5]/40 flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#f4ece8] flex items-center justify-center text-[#904d00] shrink-0">
              <span aria-hidden="true" className="material-symbols-outlined text-[26px]">workspace_premium</span>
            </div>
            <div>
              <h2 className="font-headline text-xl sm:text-2xl text-[#1e1b19] font-bold tracking-tight">
                Certificates
              </h2>
              <p className="text-xs sm:text-sm text-[#59413a] mt-0.5">
                The two ordinances the register records. A certificate printed for a member from their own record — with
                the date, wording and officiant already filled in — is issued from the member’s care record in Members.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(['baptism', 'dedication'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCertificateType(value)}
                className={`px-4 py-2 rounded-lg font-headline text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
                  certificateType === value
                    ? 'bg-[#c2410c] text-white'
                    : 'bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] hover:bg-[#eee7e3]'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  {value === 'baptism' ? 'water_drop' : 'child_care'}
                </span>
                {value === 'baptism' ? 'Baptism' : 'Child dedication'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-5 space-y-4">
              <div className="p-5 rounded-xl bg-[#faf2ee] border border-[#e1bfb5]/40 space-y-4">
                <h3 className="text-sm font-headline text-[#1e1b19] font-bold flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#c2410c] text-[20px]">
                    edit_document
                  </span>
                  Ceremony details
                </h3>

                <div className="space-y-1.5">
                  <label htmlFor="certificate-name" className="text-xs font-bold text-[#59413a] font-headline">
                    Name on the certificate
                  </label>
                  <input
                    id="certificate-name"
                    aria-label="Name on the certificate"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Caleb Timothy Mwangi"
                    className="w-full h-10 px-3 rounded-lg bg-white text-xs font-medium text-[#1e1b19] shadow-sm border border-[#e1bfb5]/50 focus:outline-none focus:ring-1 focus:ring-[#c2410c]"
                  />
                </div>

                {certificateType === 'dedication' && (
                  <div className="space-y-1.5">
                    <label htmlFor="certificate-parents" className="text-xs font-bold text-[#59413a] font-headline">
                      Presented by
                    </label>
                    <input
                      id="certificate-parents"
                      aria-label="Presented by"
                      type="text"
                      value={parents}
                      onChange={(event) => setParents(event.target.value)}
                      placeholder="Mr & Mrs Mwangi"
                      className="w-full h-10 px-3 rounded-lg bg-white text-xs font-medium text-[#1e1b19] shadow-sm border border-[#e1bfb5]/50 focus:outline-none focus:ring-1 focus:ring-[#c2410c]"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="certificate-officiant" className="text-xs font-bold text-[#59413a] font-headline">
                    Officiating minister
                  </label>
                  <input
                    id="certificate-officiant"
                    aria-label="Officiating minister"
                    type="text"
                    value={officiant}
                    onChange={(event) => setOfficiant(event.target.value)}
                    placeholder="Bishop Sammy"
                    className="w-full h-10 px-3 rounded-lg bg-white text-xs font-medium text-[#1e1b19] shadow-sm border border-[#e1bfb5]/50 focus:outline-none focus:ring-1 focus:ring-[#c2410c]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="certificate-date" className="text-xs font-bold text-[#59413a] font-headline">
                      Date of the ordinance
                    </label>
                    <input
                      id="certificate-date"
                      aria-label="Date of the ordinance"
                      type="date"
                      value={ceremonyDate}
                      onChange={(event) => setCeremonyDate(event.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white text-xs font-medium text-[#1e1b19] shadow-sm border border-[#e1bfb5]/50 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="certificate-roll" className="text-xs font-bold text-[#59413a] font-headline">
                      Register number
                    </label>
                    <input
                      id="certificate-roll"
                      aria-label="Register number"
                      type="text"
                      value={registerNumber}
                      onChange={(event) => setRegisterNumber(event.target.value)}
                      placeholder="MBR-1042"
                      className="w-full h-10 px-3 rounded-lg bg-white text-xs font-medium text-[#1e1b19] shadow-sm border border-[#e1bfb5]/50 focus:outline-none"
                    />
                  </div>
                </div>

                {certificateType === 'baptism' && (
                  <div className="space-y-1.5">
                    <label htmlFor="certificate-verse" className="text-xs font-bold text-[#59413a] font-headline">
                      Scripture reference
                    </label>
                    <input
                      id="certificate-verse"
                      aria-label="Scripture reference"
                      type="text"
                      value={scriptureReference}
                      onChange={(event) => setScriptureReference(event.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white text-xs font-medium text-[#1e1b19] shadow-sm border border-[#e1bfb5]/50 focus:outline-none"
                    />
                  </div>
                )}

                <p className="text-[11px] text-[#59413a] leading-relaxed">
                  The certificate prints the church’s own name, tagline and logo from Settings, not a printed-in default.
                </p>
              </div>
            </div>

            <div className="xl:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#006243]"></span>
                  <span className="text-xs font-bold font-headline text-[#1e1b19] tracking-wide uppercase">
                    Preview — exactly what prints
                  </span>
                </div>
                <span className="text-xs text-[#59413a]">A4 landscape</span>
              </div>

              <div className="relative w-full rounded-2xl bg-[#faf6f0] p-6 sm:p-10 shadow-[0_8px_30px_rgba(28,25,23,0.08)] border border-[#d8c7b8] overflow-hidden">
                <div className="absolute inset-3.5 rounded-xl border border-[#d8c7b8] pointer-events-none opacity-60"></div>
                <div className="absolute inset-5 rounded-lg border border-[#c2410c]/30 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center text-center space-y-4 my-2">
                  <div className="flex items-center gap-2 text-[#c2410c]">
                    <span aria-hidden="true" className="material-symbols-outlined text-[28px]">church</span>
                    <span className="font-headline text-sm uppercase tracking-[0.25em] text-[#9b2f00] font-bold">
                      {church.name}
                    </span>
                    <span aria-hidden="true" className="material-symbols-outlined text-[28px]">auto_stories</span>
                  </div>
                  <p className="text-[11px] font-headline uppercase tracking-widest text-[#786b62] -mt-2">
                    {church.location}
                  </p>

                  <h3 className="font-serif italic text-2xl sm:text-3xl text-[#2b1810] tracking-tight font-bold">
                    {certificateTitle}
                  </h3>
                  <div className="w-32 h-[1.5px] bg-[#c2410c]/40 rounded-full"></div>

                  <p className="text-xs sm:text-sm text-[#59413a] max-w-lg leading-relaxed pt-1">
                    This certifies that
                    <span className="font-serif font-bold text-lg sm:text-xl text-[#1e1b19] block my-1">
                      {fullName.trim() || '—'}
                    </span>
                    {certificateType === 'dedication'
                      ? 'was presented before God and this congregation for dedication.'
                      : 'having confessed faith in the Lord Jesus Christ, was baptised in the name of the Father, and of the Son, and of the Holy Spirit.'}
                  </p>

                  <div className="w-full max-w-md bg-[#f2ebd9]/60 rounded-lg p-3 my-2 border border-[#d8c7b8]/40">
                    <p className="text-xs italic text-[#6e5d53] leading-snug">
                      {certificateType === 'dedication'
                        ? '“Suffer the little children to come unto me, and forbid them not: for of such is the kingdom of God.”'
                        : '“Therefore we are buried with him by baptism into death: that like as Christ was raised up from the dead by the glory of the Father, even so we also should walk in newness of life.”'}
                    </p>
                    <span className="text-[11px] font-bold text-[#c2410c] block mt-1">
                      — {certificateType === 'dedication' ? 'Mark 10:14' : scriptureReference.trim() || 'Romans 6:4'}
                    </span>
                  </div>

                  <div className="w-full grid grid-cols-3 items-end pt-4 mt-2">
                    <div className="flex flex-col items-center">
                      <div className="font-serif italic text-sm text-[#c2410c] leading-tight font-bold">
                        {ceremonyDate
                          ? new Date(ceremonyDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '—'}
                      </div>
                      <div className="w-28 h-[1px] bg-[#a8998d] my-1"></div>
                      <span className="text-[10px] text-[#786b62] uppercase tracking-wider font-semibold">
                        Date of ordinance
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#904d00] via-[#fe932c] to-[#9b2f00] p-0.5 shadow-md flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-[#faf6f0] flex flex-col items-center justify-center text-[#c2410c] border border-dashed border-[#c2410c]">
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">verified</span>
                          <span className="text-[7px] font-bold uppercase tracking-tighter">SIGILLUM</span>
                        </div>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-[#904d00] font-bold mt-1">
                        Church seal
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="font-serif italic text-sm text-[#1e1b19] leading-tight font-bold">
                        {officiant.trim() || 'The officiating minister'}
                      </div>
                      <div className="w-28 h-[1px] bg-[#a8998d] my-1"></div>
                      <span className="text-[10px] text-[#786b62] uppercase tracking-wider font-semibold">
                        Officiating minister
                      </span>
                    </div>
                  </div>

                  {registerNumber.trim() && (
                    <span className="text-[10px] text-[#786b62] tracking-wide">
                      Register reference {registerNumber.trim()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => void handlePrintCertificate()}
                  disabled={working !== null}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#c2410c] text-white font-semibold text-xs hover:bg-[#9b2f00] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-[0_2px_8px_rgba(194,65,12,0.25)] cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[19px]">print</span>
                  {working === 'certificate' ? 'Preparing…' : 'Print certificate (or save as PDF)'}
                </button>
                <span className="text-[11px] text-[#59413a]">
                  Prints on A4 landscape with the church’s letterhead.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1b: The register of what has been issued */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(194,65,12,0.02)] border border-[#e1bfb5]/40 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-headline text-lg text-[#1e1b19] font-bold tracking-tight">Certificate register</h2>
              <p className="text-xs text-[#59413a] mt-0.5">
                What the church has officially issued, newest first. A certificate exists because this register says so —
                the print is its copy.
              </p>
            </div>
            <span className="text-xs font-bold text-[#59413a] whitespace-nowrap">{ledger.certificates.length} on file</span>
          </div>

          {ledger.loading && <LoadingBlock label="Reading the register…" />}
          {ledger.error && <ErrorBlock message={ledger.error} onRetry={() => void ledger.refetch()} />}

          {!ledger.loading && !ledger.error && ledger.certificates.length === 0 && (
            <p className="text-xs text-[#59413a] bg-[#faf2ee]/70 border border-[#e1bfb5]/30 rounded-xl p-4">
              Nothing issued yet. The first certificate printed from the form above opens this register.
            </p>
          )}

          {ledger.certificates.length > 0 && (
            <ul className="divide-y divide-[#e1bfb5]/30">
              {ledger.certificates.map((row) => (
                <li key={row.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#c2410c]">
                    {row.kind === 'baptism' ? 'water_drop' : 'child_care'}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-[#9b2f00]">{row.serial}</span>
                  <span className="text-xs font-bold text-[#1e1b19]">{row.fullName}</span>
                  <span className="text-[11px] text-[#59413a]">
                    {row.kind === 'baptism' ? 'Baptism' : 'Dedication'}
                    {row.ceremonyDate ? ` · ${new Date(row.ceremonyDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                    {row.officiant ? ` · ${row.officiant}` : ''}
                  </span>
                  {row.reissues && (
                    <span className="text-[10px] font-semibold text-[#59413a] bg-[#f4ece8] rounded-full px-2 py-0.5">
                      supersedes {row.reissues.serial}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* SECTION 2: The two summaries */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(194,65,12,0.02)] border border-[#e1bfb5]/40 flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#f4ece8] flex items-center justify-center text-[#c2410c] shrink-0">
              <span aria-hidden="true" className="material-symbols-outlined text-[26px]">description</span>
            </div>
            <div>
              <h2 className="font-headline text-xl sm:text-2xl text-[#1e1b19] font-bold tracking-tight">
                Summaries for the council
              </h2>
              <p className="text-xs sm:text-sm text-[#59413a] mt-0.5">
                One page each, computed from the records as they stand the moment you print them — so a summary can never
                disagree with the screens it came from.
              </p>
            </div>
          </div>

          {register.loading && <LoadingBlock label="Reading the register…" />}
          {register.error && <ErrorBlock message={register.error} onRetry={() => void register.refetch()} />}

          {report && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'On the roll', value: report.total.toLocaleString(), sub: `${report.byStatus.active ?? 0} active` },
                {
                  label: 'Ordinances recorded',
                  value: report.withBaptismRecord.toLocaleString(),
                  sub: `${report.baptismsThisYear} this year`,
                },
                {
                  label: 'Households',
                  value: report.households.total.toLocaleString(),
                  sub: `${report.households.household} homes`,
                },
                { label: 'Children & youth', value: report.youth.toLocaleString(), sub: `${report.envelopesIssued} envelopes` },
              ].map((card) => (
                <div key={card.label} className="p-4 rounded-xl bg-[#faf2ee]/70 border border-[#e1bfb5]/30">
                  <span className="text-xs text-[#59413a]">{card.label}</span>
                  <div className="text-xl font-headline text-[#1e1b19] font-bold mt-0.5">{card.value}</div>
                  <span className="text-[11px] text-[#59413a]">{card.sub}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#e1bfb5]/30">
            <button
              type="button"
              onClick={() => void handlePrintRegister()}
              disabled={working !== null || !report}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#c2410c] text-white font-semibold text-xs hover:bg-[#9b2f00] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-[0_2px_8px_rgba(194,65,12,0.25)] cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[19px]">groups</span>
              {working === 'register' ? 'Preparing…' : 'Print register summary'}
            </button>
            <button
              type="button"
              onClick={() => void handlePrintTreasury()}
              disabled={working !== null}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#f4ece8] text-[#1e1b19] font-semibold text-xs hover:bg-[#eee7e3] disabled:opacity-60 disabled:cursor-not-allowed transition-colors border border-[#e1bfb5]/40 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[19px]">receipt_long</span>
              {working === 'treasury' ? 'Preparing…' : 'Print treasury summary'}
            </button>
            <span className="text-[11px] text-[#59413a]">
              The ledger’s own audit screen prints the same treasury summary, beside the chain that proves it.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
