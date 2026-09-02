import { errors } from '../../lib/errors.js';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export function assertVerificationSubmissionAllowed(status?: VerificationStatus): void {
  if (status === 'approved') {
    throw errors.conflict('VERIFICATION_LOCKED', 'An approved verification cannot be changed by the merchant.');
  }
}

export function verificationIsActionable(status?: VerificationStatus): boolean {
  return status !== 'approved';
}
