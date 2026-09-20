import 'dotenv/config';
import { z } from 'zod';

/**
 * Configuration, validated once at startup.
 *
 * A missing `JWT_SECRET` should stop the process before it serves a single request, not surface as a
 * 500 on the first login. Anything the app needs is read from here rather than from `process.env`
 * scattered through the code, so "what does this service need to run" has exactly one answer.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /// `0` is allowed and means "any free port", which is what a test runner or an ephemeral host
  /// asks for; the default is the port the console expects.
  PORT: z.coerce.number().int().min(0).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  /// How long a password-reset link stays good. Short because it is a key to an account arriving in
  /// an inbox: an hour is long enough to walk to the office machine and short enough that a mail left
  /// in a shared sent folder is not a standing invitation tomorrow.
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  /// How many proxy hops sit in front of the API. Zero by default, deliberately: trusting
  /// `X-Forwarded-For` when nothing sets it lets a client write its own address and walk straight
  /// past the rate limiter below. Set it to 1 behind Railway, Render, Fly or a single nginx.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),

  // -------------------------------------------------------------------------------------------
  // Rate limiting
  // -------------------------------------------------------------------------------------------
  /// The general ceiling, per client, across the whole API.
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  /// Sign-in gets its own, much tighter ceiling. The general one is sized for a console that loads a
  /// dozen resources at once, which is far too generous to stop a password run against one account.
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  /// A third ceiling, for the two things where one request has a bill attached: sending a broadcast,
  /// which reaches the whole congregation over SMS or email, and uploading a file, which moves
  /// megabytes. Ten a minute is far above what an office does and far below what a script would.
  COSTLY_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  // -------------------------------------------------------------------------------------------
  // Uploads
  // -------------------------------------------------------------------------------------------
  /// The largest single upload. Five megabytes holds a logo, a photograph or a scanned minute and
  /// refuses a scanned *book*; it is also what keeps a base64 body (which costs ~33% more) inside a
  /// sane request size. Raise it only alongside the reverse proxy's own body limit.
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  /// `database` keeps the bytes in Postgres and works on any host; `s3` moves them to a bucket.
  STORAGE_DRIVER: z.enum(['database', 's3']).default('database'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // -------------------------------------------------------------------------------------------
  // Outbound email and SMS
  // -------------------------------------------------------------------------------------------
  /// The name the church's messages are sent under, and the address they point back at.
  APP_NAME: z.string().default('Praxis Church Console'),
  PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  /// `console` writes messages to the log instead of sending them. That is the default on purpose:
  /// a fresh install should be able to press "send" and see what *would* have gone out, rather than
  /// either failing or quietly emailing the congregation from an unverified domain.
  EMAIL_DRIVER: z.enum(['console', 'resend']).default('console'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Praxis Church Console <onboarding@resend.dev>'),
  SMS_DRIVER: z.enum(['console', 'africastalking', 'twilio']).default('console'),
  AFRICASTALKING_USERNAME: z.string().optional(),
  AFRICASTALKING_API_KEY: z.string().optional(),
  /// The sender ID a church sends under. Africa's Talking rejects an unregistered alphanumeric ID, so
  /// leaving it out falls back to the account's own short code rather than failing the send.
  AFRICASTALKING_SENDER_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),

  /// The IANA zone the church's office lives in, used wherever a date is shown or exported as a
  /// calendar day rather than an instant. `UTC` by default only because something has to be: for
  /// Kenya set `Africa/Nairobi`, and the ledgers then agree with the wall calendar.
  DISPLAY_TIMEZONE: z.string().default('UTC'),
  /// A Sentry-compatible DSN. Unset — the default — means failures are logged and go no further, and
  /// nothing is sent to a third party unless somebody deliberately configured one.
  SENTRY_DSN: z.string().optional(),
});

/**
 * Treats a blank variable as an absent one.
 *
 * A hosting dashboard exports a variable somebody added and left empty as `''`, and `z.coerce.number()`
 * turns `''` into `0` — so an untouched `PORT` fails validation complaining about positivity instead of
 * simply not being set. Blank means "not configured", so the defaults are allowed to apply.
 */
const withoutBlanks = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [key, value?.trim() === '' ? undefined : value]),
);

const parsed = schema.safeParse(withoutBlanks);

if (!parsed.success) {
  const detail = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${detail}\n\nCopy .env.example to .env and fill it in.`);
}

// The example file ships a placeholder. Accepting it in production would mean shipping a known
// signing key, so the process refuses to start instead.
if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET.includes('replace-me')) {
  throw new Error('JWT_SECRET is still the placeholder value. Set a real secret before running in production.');
}

// A production service that still sends mail through the `console` driver cannot deliver a password
// reset, and the person locked out on a Sunday evening has nobody to ask. That is a configuration
// mistake worth stopping for, not a warning in a log nobody reads.
if (parsed.data.NODE_ENV === 'production' && parsed.data.EMAIL_DRIVER === 'console') {
  throw new Error(
    'EMAIL_DRIVER is still "console" in production, so no password-reset link could ever be delivered. Set EMAIL_DRIVER=resend and RESEND_API_KEY.',
  );
}

export const env = parsed.data;

/** The console may be reached on localhost during setup and on the LAN address afterwards. */
export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * The request-body ceiling for an upload: the file limit, plus base64's 4/3 overhead, plus the rest
 * of the JSON envelope.
 *
 * Derived in one place because two do have to agree — the parser that accepts the body, mounted in
 * `app.ts`, and the service that measures the decoded bytes. If they drift, the failure is an upload
 * that one of them refuses and the other would have taken.
 */
export const uploadBodyLimit = Math.ceil(env.UPLOAD_MAX_BYTES * 1.4) + 64 * 1024;

export const isProduction = env.NODE_ENV === 'production';

// An unparseable zone makes every Intl call below silently fall back to UTC, which is exactly the
// kind of drift this setting exists to prevent — so a typo fails at boot, loudly.
if (!isValidTimeZone(env.DISPLAY_TIMEZONE)) {
  throw new Error(`DISPLAY_TIMEZONE "${env.DISPLAY_TIMEZONE}" is not an IANA time zone (e.g. Africa/Nairobi).`);
}

function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The church's own calendar: the zone every exported or printed date is named in. */
export const displayTimeZone = env.DISPLAY_TIMEZONE;
