import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import type { DeliveryReport } from './email';

/**
 * Outbound SMS.
 *
 * The structure is here and the drivers are deliberately thin, because the provider is a decision the
 * church should make rather than one this code should assume. Africa's Talking is the natural first
 * choice for a Kenyan parish — it is the one that terminates reliably on Safaricom — and Twilio is
 * the branch for anywhere else, so both are wired and either is a single environment variable away.
 *
 * As with email, `console` means nothing is sent *and says so*, rather than recording a delivery that
 * never happened.
 */

export function smsStatus(): { driver: string; configured: boolean } {
  const configured =
    (env.SMS_DRIVER === 'africastalking' && Boolean(env.AFRICASTALKING_USERNAME) && Boolean(env.AFRICASTALKING_API_KEY)) ||
    (env.SMS_DRIVER === 'twilio' &&
      Boolean(env.TWILIO_ACCOUNT_SID) &&
      Boolean(env.TWILIO_AUTH_TOKEN) &&
      Boolean(env.TWILIO_FROM));

  return { driver: env.SMS_DRIVER, configured };
}

export function assertSmsConfigured(): void {
  if (env.SMS_DRIVER === 'console') {
    throw new AppError(
      503,
      'No SMS provider is configured, so nothing would be sent. Set SMS_DRIVER=africastalking or twilio with its credentials to send for real.',
      'sms_not_configured',
    );
  }
  if (env.SMS_DRIVER === 'africastalking' && (!env.AFRICASTALKING_USERNAME || !env.AFRICASTALKING_API_KEY)) {
    throw new AppError(
      503,
      'SMS_DRIVER is "africastalking" but its username or API key is not set.',
      'sms_not_configured',
    );
  }
  if (env.SMS_DRIVER === 'twilio' && (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM)) {
    throw new AppError(
      503,
      'SMS_DRIVER is "twilio" but its account SID, auth token or sender is not set.',
      'sms_not_configured',
    );
  }
}

/** Africa's Talking: one form-encoded POST for the whole batch, and its own per-recipient status. */
async function sendViaAfricasTalking(recipients: string[], message: string): Promise<DeliveryReport> {
  const body = new URLSearchParams();
  for (const recipient of recipients) body.append('to', recipient);
  body.set('message', message);
  body.set('username', env.AFRICASTALKING_USERNAME ?? '');

  const response = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey: env.AFRICASTALKING_API_KEY ?? '',
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Africa's Talking responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }

  // The API answers with a per-recipient status list; counting that rather than the request is the
  // difference between "we asked" and "they were delivered".
  const payload = (await response.json().catch(() => null)) as {
    SMSMessageData?: { Recipients?: Array<{ status?: string; number?: string }> };
  } | null;
  const rows = payload?.SMSMessageData?.Recipients ?? [];

  const report: DeliveryReport = { driver: 'africastalking', attempted: recipients.length, delivered: 0, failed: 0, failures: [] };
  if (rows.length === 0) {
    report.failed = recipients.length;
    return report;
  }
  for (const row of rows) {
    if (row.status === 'Success') report.delivered += 1;
    else {
      report.failed += 1;
      if (report.failures.length < 5) {
        report.failures.push({ recipient: row.number ?? 'unknown', reason: row.status ?? 'rejected' });
      }
    }
  }
  return report;
}

/** Twilio: one request per recipient, because that is the only way it reports per-message outcome. */
async function sendViaTwilio(recipients: string[], message: string): Promise<DeliveryReport> {
  const report: DeliveryReport = { driver: 'twilio', attempted: recipients.length, delivered: 0, failed: 0, failures: [] };
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID ?? ''}:${env.TWILIO_AUTH_TOKEN ?? ''}`).toString('base64');

  for (const recipient of recipients) {
    try {
      const body = new URLSearchParams();
      body.set('To', recipient);
      body.set('From', env.TWILIO_FROM ?? '');
      body.set('Body', message);

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID ?? ''}/Messages.json`,
        {
          method: 'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        },
      );
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Twilio responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
      }
      report.delivered += 1;
    } catch (error) {
      report.failed += 1;
      if (report.failures.length < 5) {
        report.failures.push({ recipient, reason: error instanceof Error ? error.message : 'unknown failure' });
      }
    }
  }

  return report;
}

export async function sendSms(message: { to: string[]; text: string }): Promise<DeliveryReport> {
  assertSmsConfigured();
  if (env.SMS_DRIVER === 'africastalking') return sendViaAfricasTalking(message.to, message.text);
  return sendViaTwilio(message.to, message.text);
}
