import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

function value(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }
  return parsed;
}

export const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: num('PORT', 4000),

  supabaseUrl: value('SUPABASE_URL'),
  supabaseServiceRoleKey: value('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',

  databaseUrl: value('DATABASE_URL'),

  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
  paystackBaseUrl: process.env.PAYSTACK_BASE_URL ?? 'https://api.paystack.co',

  pricing: {
    platformCommissionBps: num('PLATFORM_COMMISSION_BPS', 1000),
    defaultDeliveryFeeMinor: num('DEFAULT_DELIVERY_FEE_MINOR', 250000),
    currency: 'NGN',
  },

  checkout: {
    reservationTtlMinutes: num('RESERVATION_TTL_MINUTES', 15),
  },

  fulfilment: {
    returnWindowDays: num('RETURN_WINDOW_DAYS', 7),
  },

  worker: {
    reservationSweepIntervalMs: num('RESERVATION_SWEEP_INTERVAL_MS', 60_000),
    outboxIntervalMs: num('OUTBOX_INTERVAL_MS', 5_000),
    payoutReconcileIntervalMs: num('PAYOUT_RECONCILE_INTERVAL_MS', 300_000),
  },
};

export const paystackConfigured = config.paystackSecretKey.length > 0;

export function validateRuntimeConfig(): void {
  const missing = [
    ['SUPABASE_URL', config.supabaseUrl],
    ['SUPABASE_SERVICE_ROLE_KEY', config.supabaseServiceRoleKey],
    ['DATABASE_URL', config.databaseUrl],
  ].filter(([, configured]) => !configured).map(([name]) => name);
  if (config.isProduction && !paystackConfigured) missing.push('PAYSTACK_SECRET_KEY');
  if (missing.length > 0) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
