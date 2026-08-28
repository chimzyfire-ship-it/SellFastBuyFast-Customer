# Security, Reliability, and Operations

## Security baseline

- TLS in transit; managed encryption at rest; secrets in a cloud secret manager, never source control or client configuration.
- Supabase Auth session handling with secure storage on mobile and secure, HTTP-only cookies for web where applicable.
- MFA mandatory for all staff; require phishing-resistant WebAuthn/passkeys for finance and security administrators.
- RBAC with separation of duties and time-bounded privileged access.
- Rate limits, bot protection, WAF, input validation, upload scanning, and dependency/security scanning.
- Signed webhooks verified against the raw payload before acknowledgment. Persist the event and enforce idempotency before state changes.
- Sensitive bank/KYC data minimized, encrypted, access-logged, and retained only for an approved retention schedule.
- Classify public, internal, confidential, and restricted data; approve residency, subprocessors, cross-border transfers, and deletion rules before production.
- Require re-authentication, beneficiary verification, a risk-based cooldown, out-of-band notification, and auditable approval for bank-account changes.
- Protect web sessions with secure cookie attributes, CSRF defenses, session rotation, inactivity/absolute expiry, and revocation after credential or role changes.
- Restrict break-glass access to time-bounded, approved sessions with automatic expiry, alerting, and independent post-event review.

## Operational requirements

### Observability

Every API request, job, provider event, order, payout, and dispute receives a correlation ID. Capture structured logs, error traces, performance metrics, and business metrics without storing payment credentials or unnecessary personal data. Hash or truncate network identifiers where full values are not required, redact secrets and sensitive before/after values, and enforce approved log retention.

Alert on payment webhook failures, provider verification mismatch, payout failure/reversal, reconciliation variance, queue backlog, API error rate, job retry exhaustion, unusual privilege changes, and failed backup verification.

### Backups and recovery

- Enable point-in-time recovery and scheduled backups for PostgreSQL.
- Test restoration into a separate environment at least quarterly.
- Version database migrations; every migration has a tested rollback or forward-fix procedure.
- Define RPO/RTO targets only after measuring the chosen hosting plan and documenting owner responsibilities.

### Release discipline

- Separate development, staging, and production projects/accounts/keys.
- Require migration review, automated tests, staging payment-provider tests, and feature flags for risky releases.
- Use EAS Build/Submit for mobile binaries; use OTA updates only for changes permitted by platform policy and never for native/config changes that require a store build.
- Preserve a release manifest linking deployed API image, database migration version, mobile build, and feature flags.
- Rotate signing, webhook, provider, database, and encryption credentials on an approved schedule and immediately after suspected compromise; test rotation and revocation in staging.

### Required runbooks

1. Payment shown as paid by buyer but missing internally.
2. Duplicate webhook or provider-event replay.
3. Payout pending, failed, or reversed.
4. Delivery marked delivered incorrectly.
5. Refund delayed or rejected.
6. KYC document access incident.
7. Account takeover or suspicious staff activity.
8. Database restore and provider reconciliation.
9. Bank-account change, beneficiary mismatch, or payout redirection attempt.
10. Credential or signing-key compromise and emergency rotation.

## Compliance workstream

Before production, obtain counsel/compliance review for Nigerian data-protection obligations, consumer/returns terms, merchant agreement, tax/invoices, payment settlement/escrow wording, KYC/AML responsibilities, and cross-border data processing. Configure Apple/Google store privacy disclosures from actual implementation—not from aspirational wording.

## Definition of production ready

- No critical or high-severity security findings open.
- Payment, refund, and payout sandbox tests include success, timeout, duplicate event, failure, reversal, and retry cases.
- Daily reconciliation demonstrates no unexplained variance.
- RLS tests prove cross-buyer, cross-merchant, and unauthorized-staff access is denied.
- Backup restore and incident runbooks have been exercised.
- Legal/business policy decisions referenced by the product are signed off.
- Retention/deletion, recovery targets, reconciliation cutoff/timezone, access review, and incident escalation ownership are approved and tested.
- Independent security testing covers mobile, web, API, authorization, uploads, provider webhooks, and finance abuse cases; any exception has a named risk owner, expiry date, and documented approval.
