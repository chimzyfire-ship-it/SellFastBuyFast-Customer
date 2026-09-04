import { errors } from '../../lib/errors.js';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type RegistrationState = 'not_registered' | 'in_review' | 'registered';

const RESERVED_STORE_SLUGS = new Set(['admin', 'api', 'support', 'auth', 'portal', 'checkout']);

export function normalizeStoreSlug(value: string): string {
  return value
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function assertStoreSlugAllowed(value: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length < 3 || value.length > 80) {
    throw errors.validation('Store handle must be 3–80 lowercase letters, numbers, and single hyphens.');
  }
  if (RESERVED_STORE_SLUGS.has(value)) {
    throw errors.conflict('SLUG_RESERVED', 'This store handle is reserved. Choose another handle.');
  }
}

export function normalizeNigerianPhone(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (/^0\d{10}$/.test(compact)) return `+234${compact.slice(1)}`;
  if (/^234\d{10}$/.test(compact)) return `+${compact}`;
  return compact;
}

export function isNigerianPhone(value: string): boolean {
  return /^\+234[789]\d{9}$/.test(value);
}

export function assertVerificationSubmissionAllowed(status?: VerificationStatus): void {
  if (status === 'approved') {
    throw errors.conflict('VERIFICATION_LOCKED', 'An approved verification cannot be changed by the merchant.');
  }
}

export function assertRegistrationSubmissionAllowed(
  registrationState: RegistrationState,
  verificationStatus?: VerificationStatus
): void {
  if (registrationState === 'registered' || verificationStatus === 'approved') {
    throw errors.conflict('REGISTRATION_LOCKED', 'Approved legal-entity information cannot be changed by the merchant.');
  }
  if (registrationState === 'in_review' || verificationStatus === 'pending') {
    throw errors.conflict('REGISTRATION_UNDER_REVIEW', 'This registration is already under review.');
  }
}

export function verificationIsActionable(status?: VerificationStatus): boolean {
  return status !== 'approved';
}
