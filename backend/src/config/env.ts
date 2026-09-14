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
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const detail = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${detail}\n\nCopy .env.example to .env and fill it in.`);
}

// The example file ships a placeholder. Accepting it in production would mean shipping a known
// signing key, so the process refuses to start instead.
if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET.includes('replace-me')) {
  throw new Error('JWT_SECRET is still the placeholder value. Set a real secret before running in production.');
}

export const env = parsed.data;

/** The console may be reached on localhost during setup and on the LAN address afterwards. */
export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const isProduction = env.NODE_ENV === 'production';
