import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

/**
 * Outbound email.
 *
 * One interface, two drivers, and the reason there are two is honesty. In `console` mode nothing is
 * sent and the console is *told* nothing was sent, rather than being allowed to mark a campaign
 * "sent" over a provider that was never configured. In `resend` mode a real message goes out.
 *
 * The provider is called over `fetch` rather than through an SDK. The API is one POST with a bearer
 * token, so an SDK would be a dependency, a supply-chain surface and a version to track in exchange
 * for about forty lines — and every hosted provider worth switching to has the same shape, which is
 * what makes the second driver cheap to add later.
 *
 * Messages are sent **one recipient at a time**. That is slower, and it is the right trade for this
 * audience: it keeps one family's address out of another family's `To:` header, and it means a
 * failure is a failure for one person rather than for the whole congregation.
 */

export interface DeliveryReport {
  driver: string;
  attempted: number;
  delivered: number;
  failed: number;
  /** The first few failures, so the operator sees *why* rather than only how many. */
  failures: Array<{ recipient: string; reason: string }>;
}

/** What the console may honestly say about whether sending is live. */
export function emailStatus(): { driver: string; configured: boolean; from: string } {
  return {
    driver: env.EMAIL_DRIVER,
    configured: env.EMAIL_DRIVER === 'resend' && Boolean(env.RESEND_API_KEY),
    from: env.EMAIL_FROM,
  };
}

/** Refuse before touching the network, with the exact thing the operator has to set. */
export function assertEmailConfigured(): void {
  if (env.EMAIL_DRIVER === 'console') {
    throw new AppError(
      503,
      'No email provider is configured, so nothing would be sent. Set EMAIL_DRIVER=resend and RESEND_API_KEY to send for real.',
      'email_not_configured',
    );
  }
  if (!env.RESEND_API_KEY) {
    throw new AppError(503, 'EMAIL_DRIVER is "resend" but RESEND_API_KEY is not set.', 'email_not_configured');
  }
}

async function sendOne(to: string, subject: string, text: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`provider responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
}

/**
 * Send one message to many addresses, reporting per-address outcome.
 *
 * A rejected recipient never aborts the run: a single malformed address should not stop the other
 * two hundred from being told about a funeral.
 */
export async function sendEmail(message: { to: string[]; subject: string; text: string }): Promise<DeliveryReport> {
  assertEmailConfigured();

  const report: DeliveryReport = {
    driver: env.EMAIL_DRIVER,
    attempted: message.to.length,
    delivered: 0,
    failed: 0,
    failures: [],
  };

  for (const recipient of message.to) {
    try {
      await sendOne(recipient, message.subject, message.text);
      report.delivered += 1;
    } catch (error) {
      report.failed += 1;
      if (report.failures.length < 5) {
        report.failures.push({
          recipient,
          reason: error instanceof Error ? error.message : 'unknown failure',
        });
      }
    }
  }

  return report;
}
