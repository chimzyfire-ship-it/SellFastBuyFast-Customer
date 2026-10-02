import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(root, '.env') });

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) throw Error('Supabase deployment credentials are unavailable.');

const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw Error(`Could not inspect Supabase Auth configuration (${response.status}).`);

const auth = await response.json();
const template = auth.mailer_templates_confirmation_content || '';
const checks = {
  emailConfirmationEnabled: auth.mailer_autoconfirm === false,
  customSmtpConfigured: Boolean(auth.smtp_host && auth.smtp_admin_email && auth.smtp_sender_name),
  otpLengthIsSix: auth.mailer_otp_length === 6,
  otpExpiresInTenMinutes: auth.mailer_otp_exp === 600,
  confirmationTemplateContainsOtp: template.includes('{{ .Token }}'),
  confirmationTemplateAvoidsPrefetchedLink: !template.includes('{{ .ConfirmationURL }}'),
};

const failures = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

console.log(JSON.stringify({ checks, subject: auth.mailer_subjects_confirmation }, null, 2));
if (failures.length) {
  throw Error(`Merchant authentication email is not production-ready: ${failures.join(', ')}.`);
}
