import { supabase } from '../lib/supabase';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function createIdempotencyKey(scope) {
  const random = Math.random().toString(36).slice(2);
  return `${scope}-${Date.now()}-${random}`;
}

export async function apiRequest(path, options = {}) {
  if (!API_URL) throw new ApiError('API_NOT_CONFIGURED', 'EXPO_PUBLIC_API_URL is not configured.', 0);

  const { data: { session } } = await supabase.auth.getSession();
  if (options.auth !== false && !session?.access_token) {
    throw new ApiError('UNAUTHORIZED', 'Please sign in to continue.', 401);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15_000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      throw new ApiError(
        payload?.error?.code || 'API_ERROR',
        payload?.error?.message || `Request failed with status ${response.status}.`,
        response.status
      );
    }
    return payload.data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new ApiError('TIMEOUT', 'The server took too long to respond.', 0);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
