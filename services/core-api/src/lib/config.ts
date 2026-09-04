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

function boundedInteger(name: string, fallback: number, min: number, max: number): number {
  const parsed = num(name, fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Environment variable ${name} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function secretMap(name: string): Record<string, string> {
  const raw = process.env[name];
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('not an object');
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, secret]) => typeof secret === 'string' && secret.trim().length > 0)
        .map(([carrier, secret]) => [
          carrier.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          (secret as string).trim(),
        ])
    );
  } catch {
    throw new Error(`Environment variable ${name} must be a JSON object of carrier webhook secrets.`);
  }
}

function isBase64Key32(value: string): boolean {
  if (!value) return false;
  try {
    return Buffer.from(value, 'base64').length === 32;
  } catch {
    return false;
  }
}

export const isProduction = process.env.NODE_ENV === 'production';
const paymentMode = process.env.PAYMENT_MODE === 'paystack' ? 'paystack' : 'mock';
const platformCommissionBps = boundedInteger('PLATFORM_COMMISSION_BPS', 500, 0, 10_000);
const returnWindowDays = boundedInteger('RETURN_WINDOW_DAYS', 7, 1, 30);

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: num('PORT', 4000),

  supabaseUrl: value('SUPABASE_URL'),
  supabaseServiceRoleKey: value('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',

  databaseUrl: value('DATABASE_URL'),

  paymentMode,
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
  paystackBaseUrl: process.env.PAYSTACK_BASE_URL ?? 'https://api.paystack.co',
  kycEncryptionKey: process.env.KYC_ENCRYPTION_KEY ?? '',

  pricing: {
    platformCommissionBps,
    defaultDeliveryFeeMinor: num('DEFAULT_DELIVERY_FEE_MINOR', 250000),
    currency: 'NGN',
  },

  checkout: {
    reservationTtlMinutes: num('RESERVATION_TTL_MINUTES', 15),
  },

  fulfilment: {
    returnWindowDays,
    logisticsWebhookSecrets: secretMap('LOGISTICS_WEBHOOK_SECRETS'),
  },

  worker: {
    reservationSweepIntervalMs: num('RESERVATION_SWEEP_INTERVAL_MS', 60_000),
    outboxIntervalMs: num('OUTBOX_INTERVAL_MS', 5_000),
    payoutReconcileIntervalMs: num('PAYOUT_RECONCILE_INTERVAL_MS', 300_000),
    completionSweepIntervalMs: num('COMPLETION_SWEEP_INTERVAL_MS', 3_600_000),
  },
};

export const paystackConfigured = config.paymentMode === 'paystack' && config.paystackSecretKey.length > 0;

export function validateRuntimeConfig(): void {
  const missing = [
    ['SUPABASE_URL', config.supabaseUrl],
    ['SUPABASE_SERVICE_ROLE_KEY', config.supabaseServiceRoleKey],
    ['DATABASE_URL', config.databaseUrl],
  ].filter(([, configured]) => !configured).map(([name]) => name);
  if (config.isProduction && config.paymentMode === 'paystack' && !paystackConfigured) {
    missing.push('PAYSTACK_SECRET_KEY');
  }
  if (config.isProduction && !isBase64Key32(config.kycEncryptionKey)) {
    missing.push('KYC_ENCRYPTION_KEY (base64-encoded 32-byte key)');
  }
  if (missing.length > 0) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
