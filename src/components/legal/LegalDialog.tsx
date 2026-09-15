import React, { useState } from 'react';
import { useDialog } from '../church/dialog';

/**
 * The trust surface: what Praxis holds, who it answers to, and what a church may do with it.
 *
 * Three documents in one place, reachable from the sign-in screen — because the moment a church
 * decides whether to trust this with its register is the moment it is signing up, not three clicks
 * into Settings afterwards — and from Settings for the staff who get asked about it at a desk.
 *
 * Two things are deliberate about the wording. It is **plain**, because the person reading it is a
 * church secretary rather than a lawyer, and a policy nobody reads protects nobody. And it is
 * **labelled as a draft**: these are the terms Praxis intends to stand behind, but no operator should
 * present invented legal text to a congregation as settled. The two things only the operator can fill
 * in — its registered name and address, and the jurisdiction whose courts are chosen — are marked as
 * such rather than quietly invented here.
 */

type Section = 'privacy' | 'terms' | 'data';

const TABS: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'privacy', label: 'Privacy', icon: 'shield_lock' },
  { id: 'data', label: 'Data protection (Kenya)', icon: 'policy' },
  { id: 'terms', label: 'Terms of use', icon: 'gavel' },
];

const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mt-5 first:mt-0 text-xs font-bold uppercase tracking-wider text-[#C2410C]">{children}</h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-2 text-[12.5px] leading-relaxed text-[#44403C]">{children}</p>
);

const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-[#44403C]">{children}</ul>
);

const LI = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-2">
    <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#C2410C]" />
    <span className="min-w-0">{children}</span>
  </li>
);

/** What only the operator can decide, shown as such instead of being invented. */
const Placeholder = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-[5px] bg-[#F8F1E9] px-1 py-0.5 font-semibold text-[#57534E]">{children}</span>
);

export const LegalDialog: React.FC<{ initialSection?: Section; onClose: () => void }> = ({
  initialSection = 'privacy',
  onClose,
}) => {
  const [section, setSection] = useState<Section>(initialSection);
  const dialog = useDialog(onClose, 'Privacy, terms and data protection');

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" {...dialog}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-[#1C1917]/45 backdrop-blur-[2px]"
      />
      <div className="relative flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[14px] sm:rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] shadow-warm-card-hover">
        <div className="flex items-start justify-between gap-4 border-b border-[#E7E5E4] px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-headline text-base font-bold tracking-tight text-[#1C1917]">
              Privacy, terms and data protection
            </h2>
            <p className="mt-0.5 text-[11px] text-[#57534E]">
              A draft for review — see the note at the foot of each section.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-[#57534E] transition-colors hover:bg-[#F5EDE4] hover:text-[#1C1917] cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[19px]">
              close
            </span>
          </button>
        </div>

        <div role="tablist" aria-label="Documents" className="flex gap-1 border-b border-[#E7E5E4] px-3 pt-2 sm:px-5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={section === tab.id}
              onClick={() => setSection(tab.id)}
              className={`flex items-center gap-1.5 rounded-t-[9px] px-3 py-2 text-[11.5px] font-bold transition-colors cursor-pointer ${
                section === tab.id
                  ? 'border-b-2 border-[#C2410C] text-[#C2410C]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="overflow-y-auto px-5 py-5 sm:px-6">
          {section === 'privacy' && <Privacy />}
          {section === 'data' && <DataProtection />}
          {section === 'terms' && <Terms />}
        </div>
      </div>
    </div>
  );
};

function Privacy() {
  return (
    <div>
      <H>Whose data this is</H>
      <P>
        Everything in a church&apos;s console — members, households, giving, meetings, messages —
        belongs to that church. <strong>Your church is the data controller for it.</strong> Praxis is
        the processor: it stores and organises the records so the church can do its work, and takes
        instructions from the church about them.
      </P>
      <P>
        Each church&apos;s records are held separately and reachable only by accounts belonging to that
        church. One church cannot see another&apos;s records — that separation is enforced by the API on
        every request, not by hiding buttons.
      </P>

      <H>What is held</H>
      <UL>
        <LI>Your church&apos;s profile, service details and letterhead.</LI>
        <LI>
          Staff accounts: name, email address, role, the times they signed in, and what they changed.
        </LI>
        <LI>
          The records your office enters: member names and contact details, households, giving,
          attendance, ministries, meetings and the documents you attach.
        </LI>
        <LI>
          Messages sent from the console, and what the email or SMS gateway reported about each one.
        </LI>
      </UL>

      <H>Who can see it</H>
      <UL>
        <LI>
          The church&apos;s own accounts, limited by their role. A viewer reads four panels and cannot
          write. A treasurer is not shown, and is not permitted, the rights editor.
        </LI>
        <LI>
          Praxis support, and only through a support session that the church&apos;s own audit log
          records — with who opened it, which church they looked at, and why it was asked for.
        </LI>
        <LI>Nobody else. Records are not sold, and are not used to train anything.</LI>
      </UL>

      <H>How long it is kept</H>
      <UL>
        <LI>
          Records stay for as long as the church is using Praxis. Deleting a record in the console
          retires it to the Trash where it can be restored, rather than destroying it outright.
        </LI>
        <LI>
          When a church leaves, its data is exported for it in full and then removed from the live
          database; backup copies age out with the retention period described below.
        </LI>
        <LI>
          Database backups are kept on a rolling window so a mistake can be undone. Currently{' '}
          <Placeholder>retention period — set by the operator</Placeholder>.
        </LI>
      </UL>

      <H>Your rights, and asking for them</H>
      <UL>
        <LI>
          A member asks their church, not Praxis: the church holds the record and can correct, export or
          delete it. Staff can do all three from the console.
        </LI>
        <LI>
          If Praxis itself must be involved, write to{' '}
          <Placeholder>operator contact address</Placeholder> and the request is answered within the
          statutory period.
        </LI>
      </UL>

      <p className="mt-5 rounded-[9px] border border-[#E7E5E4] bg-[#FDF8F3] p-3 text-[11px] leading-relaxed text-[#57534E]">
        <strong>Draft.</strong> This summary is written to be true of how Praxis behaves, and is not yet
        a reviewed legal document. The operator must have it reviewed, and complete the bracketed
        details, before offering the service commercially. It is not legal advice to any church.
      </p>
    </div>
  );
}

function DataProtection() {
  return (
    <div>
      <P>
        Kenya&apos;s Data Protection Act, 2019 puts the duties on the church, because it is the church
        that decides why a member&apos;s name and telephone number are in a register. This is the short
        version of what that means in practice, and where the console helps.
      </P>

      <H>Lawful basis and consent</H>
      <UL>
        <LI>
          Know why you hold each thing. Pastoral care and church administration are ordinary grounds;
          sending an SMS or email to a member needs their agreement, and it is worth recording.
        </LI>
        <LI>
          Collecting a phone number &quot;just in case&quot; is the habit that creates risk later. The
          member form accepts what it accepts — leave blank what the church does not need.
        </LI>
        <LI>
          Prayer requests are pastoral and can be sensitive. Mark one private and it is not shown on any
          public list; give it careful wording when it is, because an SMS carries no confidentiality.
        </LI>
      </UL>

      <H>Security</H>
      <UL>
        <LI>
          Give each person their own account and the smallest role that does their job. A shared log-in
          makes the audit log unable to say who did anything.
        </LI>
        <LI>
          Disable an account the same day somebody leaves the office; deleting it would take the history
          of what they did with it.
        </LI>
        <LI>
          Every change to a member, a giving record or a permission is written to a log the church can
          read and nobody can edit, and the giving ledger is chained so an altered entry cannot pass
          unnoticed.
        </LI>
      </UL>

      <H>Breach notification</H>
      <UL>
        <LI>
          A personal data breach must be reported to the Office of the Data Protection Commissioner
          without undue delay and, where feasible, within 72 hours of becoming aware of it — and to the
          people affected where it is likely to harm them.
        </LI>
        <LI>
          So a suspected breach has to reach somebody who can act. Contact{' '}
          <Placeholder>operator contact, and the church&apos;s own data protection contact</Placeholder>{' '}
          the same day; do not wait for a meeting.
        </LI>
      </UL>

      <H>Member rights, and the console</H>
      <UL>
        <LI>
          <strong>Access and portability</strong> — Settings &rarr; Data &amp; backup exports the
          church&apos;s records, including a member&apos;s own history.
        </LI>
        <LI>
          <strong>Correction</strong> — edit the member record; the change, and who made it, is logged.
        </LI>
        <LI>
          <strong>Erasure</strong> — retire the record, then empty the Trash when the church has decided
          it should genuinely go. Keep in mind which records a church must retain anyway: giving records
          and minutes are accounting and governance documents.
        </LI>
        <LI>
          <strong>Objection and restriction</strong> — note it on the member record, and leave them off
          broadcasts.
        </LI>
      </UL>

      <H>Registration and transfers</H>
      <UL>
        <LI>
          A church that processes personal data at scale may need to register as a data controller with
          the ODPC. Whether your church does is a question for your leadership, not for this screen.
        </LI>
        <LI>
          Where the service stores data, and where backups are held, should be known before it is
          promised to a member. A transfer outside Kenya needs an appropriate safeguard.{' '}
          <Placeholder>hosting region — set by the operator</Placeholder>
        </LI>
      </UL>

      <p className="mt-5 rounded-[9px] border border-[#E7E5E4] bg-[#FDF8F3] p-3 text-[11px] leading-relaxed text-[#57534E]">
        <strong>Draft.</strong> A plain-language orientation to the Act, not a legal opinion and not a
        substitute for advice to your church. Written and reviewed by the operator and its counsel
        before commercial use.
      </p>
    </div>
  );
}

function Terms() {
  return (
    <div>
      <H>What Praxis is</H>
      <P>
        A church management system: a register, a service planner, a giving ledger, records of meetings
        and decisions, and a way to reach the congregation by email or SMS. It is provided to
        churches as software, on the plan and pricing shown in Settings &rarr; Subscription.
      </P>

      <H>The church&apos;s side</H>
      <UL>
        <LI>
          Keep the records accurate, and be able to say why each one is held — see the data protection
          section.
        </LI>
        <LI>
          Keep account details to yourself, give each person their own account, and tell Praxis promptly
          if one is compromised or should be closed.
        </LI>
        <LI>
          Only send messages to people who expect to hear from the church. The console records what was
          sent and what the gateway reported.
        </LI>
        <LI>Use the service for the church&apos;s work, not for anything unlawful.</LI>
      </UL>

      <H>Praxis&apos;s side</H>
      <UL>
        <LI>Keep the service running, keep the church&apos;s records separate and safe, and back the database up.</LI>
        <LI>Tell the church about planned work that interrupts it, and about anything that went wrong.</LI>
        <LI>
          Not to read a church&apos;s records to sell anything or to train anything; support access only
          through a logged support session.
        </LI>
        <LI>
          <Placeholder>uptime commitment — set by the operator</Placeholder> and{' '}
          <Placeholder>support hours — set by the operator</Placeholder>.
        </LI>
      </UL>

      <H>Plans, trials and payment</H>
      <UL>
        <LI>
          A new church starts on a free trial with the full plan, no card required. The days remaining
          are shown in Settings &rarr; Subscription the whole time.
        </LI>
        <LI>
          When a trial ends, the console keeps the church&apos;s data and stops accepting new writes
          rather than deleting anything. A lapsed church can still read its records and export them.
        </LI>
        <LI>
          Payment is by invoice while billing is handled directly by the operator; the church&apos;s
          subscription status and history are visible in Settings.
        </LI>
        <LI>Prices are per church, quoted in Kenya shillings, and limits are listed with each plan.</LI>
      </UL>

      <H>Leaving</H>
      <UL>
        <LI>
          A church may export everything it holds at any time, and may ask for its data to be deleted.
        </LI>
        <LI>
          If an account is suspended for non-payment or misuse, its records are kept, not destroyed, so
          that nothing is lost over a billing question.
        </LI>
      </UL>

      <H>Where this is agreed</H>
      <P>
        Governed by the laws of <Placeholder>jurisdiction — set by the operator</Placeholder>, with
        disputes heard in its courts. A church that does not accept these terms should stop using the
        service and ask for its export.
      </P>

      <p className="mt-5 rounded-[9px] border border-[#E7E5E4] bg-[#FDF8F3] p-3 text-[11px] leading-relaxed text-[#57534E]">
        <strong>Draft.</strong> Written to describe how the service actually behaves — including the
        parts that favour the church, such as never deleting a lapsed church&apos;s records. It must be
        reviewed by the operator&apos;s counsel, and completed where bracketed, before being relied on.
      </p>
    </div>
  );
}
