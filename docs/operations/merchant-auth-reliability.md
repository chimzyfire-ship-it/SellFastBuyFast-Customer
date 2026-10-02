# Merchant auth reliability release gate

Merchant authentication is not considered healthy merely because a browser can receive a Supabase session. The Core API must be able to validate that session and return the merchant-workspace contract.

Before a production Core API deployment, configure all required server values with the guarded release script:

```sh
node services/core-api/scripts/configure-release.mjs --apply --only=services/core-api
```

The script rejects missing values and writes secret values through stdin, never into a shell command line. It also preserves the KYC encryption key in the ignored, owner-only `.operations.secrets.local` store.

After deployment, run the public readiness check and an authenticated smoke check against a controlled confirmed merchant account:

```sh
curl --fail https://sell-fast-buy-fast-core-api.vercel.app/health
MERCHANT_AUTH_SMOKE_EMAIL=controlled@example.com \
MERCHANT_AUTH_SMOKE_PASSWORD='…' \
node services/core-api/scripts/check-production-auth-runtime.mjs
```

The smoke check requires `/v1/vendor/me` to return HTTP 200. An empty `merchants` list is valid for a newly confirmed merchant and must lead to onboarding; it must never be rendered as a workspace outage.

If the database password is rejected, rotate it and immediately redeploy the Core API configuration:

```sh
node services/core-api/scripts/rotate-production-database-password.mjs --apply
node services/core-api/scripts/configure-release.mjs --apply --only=services/core-api
cd services/core-api && vercel --prod
```

Do not rotate the KYC encryption key during normal recovery. It protects submitted identity data and must remain stable for decryption.
