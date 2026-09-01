import crypto from 'crypto';
import { config, paystackConfigured } from './config.js';
import { AppError } from './errors.js';

export function computePaystackSignature(rawBody: Buffer, secretKey: string): string {
  return crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface VerifyTransactionResult {
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  amountMinor: number;
  currency: string;
  paidAt?: string;
  raw: unknown;
}

async function paystackRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!paystackConfigured) {
    throw new AppError('PAYSTACK_NOT_CONFIGURED', 'Paystack credentials are not configured on the server.', 503);
  }

  let response: Response;
  try {
    response = await fetch(`${config.paystackBaseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err: any) {
    throw new AppError('PROVIDER_UNREACHABLE', `Paystack request failed: ${err?.message ?? 'network error'}`, 502);
  }

  const payload = (await response.json().catch(() => null)) as
    | { status: boolean; message?: string; data?: T }
    | null;

  if (!response.ok || !payload?.status) {
    throw new AppError(
      'PROVIDER_ERROR',
      `Paystack error (${response.status}): ${payload?.message ?? 'unknown error'}`,
      502
    );
  }

  return payload.data as T;
}

export const PaystackClient = {
  initializeTransaction(input: {
    reference: string;
    amountMinor: number;
    email: string;
    callbackUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<InitializeTransactionResult> {
    return paystackRequest<any>('POST', '/transaction/initialize', {
      reference: input.reference,
      amount: input.amountMinor,
      email: input.email,
      currency: config.pricing.currency,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }).then((data) => ({
      authorizationUrl: data.authorization_url,
      accessCode: data.access_code,
      reference: input.reference,
    }));
  },

  verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    return paystackRequest<any>('GET', `/transaction/verify/${encodeURIComponent(reference)}`).then(
      (data) => ({
        status: (['success', 'failed', 'abandoned'].includes(data.status)
          ? data.status
          : 'pending') as VerifyTransactionResult['status'],
        amountMinor: Number(data.amount),
        currency: String(data.currency),
        paidAt: data.paid_at,
        raw: data,
      })
    );
  },

  createTransfer(input: {
    amountMinor: number;
    recipientCode: string;
    reference: string;
    reason: string;
  }): Promise<{ transferCode: string; status: string }> {
    return paystackRequest<any>('POST', '/transfer', {
      source: 'balance',
      amount: input.amountMinor,
      recipient: input.recipientCode,
      reference: input.reference,
      reason: input.reason,
      currency: config.pricing.currency,
    }).then((data) => ({
      transferCode: data.transfer_code,
      status: data.status,
    }));
  },

  verifyTransfer(reference: string): Promise<{ transferCode?: string; status: string; raw: unknown }> {
    return paystackRequest<any>('GET', `/transfer/verify/${encodeURIComponent(reference)}`).then((data) => ({
      transferCode: data.transfer_code,
      status: String(data.status),
      raw: data,
    }));
  },

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature || !paystackConfigured) return false;
    const hash = computePaystackSignature(rawBody, config.paystackSecretKey);
    const expected = Buffer.from(hash);
    const received = Buffer.from(signature);
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  },
};
