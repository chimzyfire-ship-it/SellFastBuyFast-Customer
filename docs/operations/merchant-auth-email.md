# Merchant authentication email

The deployed merchant portal stays in confirmation-link mode until the custom SMTP sender and code template have been verified. After the release switch is enabled, it uses a six-digit, single-use email code for account confirmation. This avoids a confirmation-link scanner consuming the credential before the merchant opens it.

## Production prerequisite

Supabase's default mailer is development-only: it is rate-limited, only delivers to authorized team addresses, and cannot be used to customize a hosted free-tier email template. Configure a dedicated custom SMTP sender before releasing the code-based confirmation screen.

Use a sender on a dedicated authentication subdomain, for example `no-reply@auth.sellfastbuyfast.com`. Verify SPF, DKIM, and DMARC with the provider, disable click tracking for authentication mail, and keep marketing mail on a separate sender/domain.

Set these values only in a secure shell or secret manager; never add populated values to browser configuration or source control:

```text
SUPABASE_SMTP_ADMIN_EMAIL=no-reply@auth.example.com
SUPABASE_SMTP_HOST=smtp.example.com
SUPABASE_SMTP_PORT=587
SUPABASE_SMTP_USER=...
SUPABASE_SMTP_PASS=...
SUPABASE_SMTP_SENDER_NAME=SellFastBuyFast
```

Then apply and inspect the configuration:

```sh
node services/core-api/scripts/configure-platform.mjs auth --apply
node services/core-api/scripts/check-auth-email.mjs
```

The configuration script enables email confirmation, keeps secure email change enabled, sets a six-digit OTP with a ten-minute expiry, and installs the branded confirmation template containing `{{ .Token }}`. It refuses to update the template without custom SMTP, so the portal cannot accidentally claim an OTP email that Supabase cannot send.

Only after both commands succeed, enable the matching portal screen and redeploy the vendor portal:

```sh
VENDOR_EMAIL_CONFIRMATION_MODE=otp node services/core-api/scripts/configure-release.mjs --apply
cd vendor-portal && vercel --prod
```

Keep `VENDOR_EMAIL_CONFIRMATION_MODE=link` if the check fails or SMTP is removed. The portal will then show the confirmation-link instructions that match Supabase's active template.

Do not send real customer test messages from an operational shell. After configuration, test with a designated controlled mailbox and confirm the code can be pasted into the merchant portal, expires after ten minutes, and cannot be replayed.

References: [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), and [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).
