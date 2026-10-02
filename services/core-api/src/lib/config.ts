import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

function value(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
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

function boundedInteger(
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = num(name, fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(
      `Environment variable ${name} must be an integer between ${min} and ${max}.`,
    );
  }
  return parsed;
}

function secretMap(name: string): Record<string, string> {
  const raw = process.env[name];
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || Array.isArray(value) || typeof value !== "object")
      throw new Error("not an object");
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(
          ([, secret]) =>
            typeof secret === "string" && secret.trim().length > 0,
        )
        .map(([carrier, secret]) => [
          carrier
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          (secret as string).trim(),
        ]),
    );
  } catch {
    throw new Error(
      `Environment variable ${name} must be a JSON object of carrier webhook secrets.`,
    );
  }
}

function isBase64Key32(value: string): boolean {
  if (!value) return false;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

// Vercel sets VERCEL_ENV even when a project has not explicitly supplied
// NODE_ENV. Treat both signals as production so an incomplete deployment
// fails closed instead of serving routes that cannot reach Supabase/Postgres.
export const isProduction =
  value("NODE_ENV") === "production" || value("VERCEL_ENV") === "production";
const paymentMode =
  value("PAYMENT_MODE") === "paystack" ? "paystack" : "mock";
const platformCommissionBps = boundedInteger(
  "PLATFORM_COMMISSION_BPS",
  500,
  0,
  10_000,
);
const returnWindowDays = boundedInteger("RETURN_WINDOW_DAYS", 7, 1, 30);

export const config = {
  env: value("NODE_ENV", "development"),
  isProduction,
  port: num("PORT", 4000),

  supabaseUrl: value("SUPABASE_URL"),
  supabaseServiceRoleKey: value("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseAnonKey: value("SUPABASE_ANON_KEY"),

  databaseUrl: value("DATABASE_URL"),
  operationsSecret: value("OPERATIONS_RUNNER_SECRET"),
  admin: {
    requireMfa: value("ADMIN_REQUIRE_MFA") === "true",
    financeEnabled: value("ADMIN_FINANCE_ENABLED") === "true",
    cursorSecret: value("ADMIN_CURSOR_SECRET"),
    portalUrl: value("ADMIN_PORTAL_URL"),
    smtpUrl: value("ADMIN_SMTP_URL"),
    mailFrom: value("ADMIN_MAIL_FROM"),
  },

  paymentMode,
  paystackSecretKey: value("PAYSTACK_SECRET_KEY"),
  paystackBaseUrl: value("PAYSTACK_BASE_URL", "https://api.paystack.co"),
  kycEncryptionKey: value("KYC_ENCRYPTION_KEY"),

  pricing: {
    platformCommissionBps,
    defaultDeliveryFeeMinor: num("DEFAULT_DELIVERY_FEE_MINOR", 250000),
    currency: "NGN",
  },

  checkout: {
    reservationTtlMinutes: num("RESERVATION_TTL_MINUTES", 15),
  },

  fulfilment: {
    returnWindowDays,
    logisticsWebhookSecrets: secretMap("LOGISTICS_WEBHOOK_SECRETS"),
  },

  worker: {
    reservationSweepIntervalMs: num("RESERVATION_SWEEP_INTERVAL_MS", 60_000),
    outboxIntervalMs: num("OUTBOX_INTERVAL_MS", 5_000),
    payoutReconcileIntervalMs: num("PAYOUT_RECONCILE_INTERVAL_MS", 300_000),
    completionSweepIntervalMs: num("COMPLETION_SWEEP_INTERVAL_MS", 3_600_000),
  },
};

export const paystackConfigured =
  config.paymentMode === "paystack" && config.paystackSecretKey.length > 0;

export function validateRuntimeConfig(): void {
  const missing = [
    ["SUPABASE_URL", config.supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", config.supabaseServiceRoleKey],
    ["DATABASE_URL", config.databaseUrl],
  ]
    .filter(([, configured]) => !configured)
    .map(([name]) => name);
  if (
    config.isProduction &&
    config.paymentMode === "paystack" &&
    !paystackConfigured
  ) {
    missing.push("PAYSTACK_SECRET_KEY");
  }
  if (config.isProduction && !isBase64Key32(config.kycEncryptionKey)) {
    missing.push("KYC_ENCRYPTION_KEY (base64-encoded 32-byte key)");
  }
  if (config.isProduction && config.admin.cursorSecret.length < 32) {
    missing.push("ADMIN_CURSOR_SECRET (at least 32 characters)");
  }
  if (config.admin.portalUrl) {
    const portal = new URL(config.admin.portalUrl);
    if (
      portal.username ||
      portal.password ||
      (config.isProduction && portal.protocol !== "https:")
    ) {
      throw new Error(
        "ADMIN_PORTAL_URL must be an HTTPS URL without credentials.",
      );
    }
  }
  if (
    config.admin.smtpUrl &&
    !["smtp:", "smtps:"].includes(new URL(config.admin.smtpUrl).protocol)
  ) {
    throw new Error("ADMIN_SMTP_URL must use smtp or smtps.");
  }
  if (missing.length > 0)
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
}
