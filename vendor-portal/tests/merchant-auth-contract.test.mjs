import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const portal = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const platform = await readFile(new URL('../../services/core-api/scripts/configure-platform.mjs', import.meta.url), 'utf8');
const runtimeConfig = await readFile(new URL('../api/runtime-config.js', import.meta.url), 'utf8');

function runtimeConfigFor(environment = {}) {
  let statusCode = 0;
  let body = null;
  const response = {
    setHeader() {},
    status(code) {
      statusCode = code;
      return {
        json(payload) {
          body = payload;
        },
      };
    },
  };
  const context = { module: { exports: null }, process: { env: environment } };
  vm.runInNewContext(runtimeConfig, context);
  context.module.exports({ method: 'GET' }, response);
  return { statusCode, body };
}

test('merchant signup verifies the numeric email OTP using Supabase’s email type', () => {
  assert.match(portal, /const OTP_CODE_LENGTH = 6;/);
  assert.match(portal, /autocomplete="one-time-code"/);
  const verification = portal.slice(
    portal.indexOf("if (form.id === 'verify-otp-form')"),
    portal.indexOf("// Sign Up Form", portal.indexOf("if (form.id === 'verify-otp-form')")),
  );
  assert.match(verification, /type: 'email'/);
  assert.doesNotMatch(verification, /type: 'signup'/);
  assert.match(verification, /new RegExp\(`\^\\\\d\{\$\{OTP_CODE_LENGTH\}\}\$`\)/);
});

test('production template installs a code and refuses link-scanner-prone confirmation links', () => {
  assert.match(platform, /mailer_otp_length:6/);
  assert.match(platform, /mailer_otp_exp:600/);
  assert.match(platform, /\{\{ \.Token \}\}/);
  assert.doesNotMatch(platform, /mailer_templates_confirmation_content:[\s\S]*\{\{ \.ConfirmationURL \}\}/);
  assert.match(platform, /Custom SMTP is required before changing production auth templates/);
});

test('the portal stays on the matching link flow until OTP mode is deliberately enabled', () => {
  assert.match(runtimeConfig, /VENDOR_EMAIL_CONFIRMATION_MODE.*trim\(\).*=== 'otp' \? 'otp' : 'link'/);
  assert.match(portal, /function verificationAuthMode\(\)\s*\{\s*return usesEmailOtp\(\) \? 'verify-otp' : 'verify-email';/);
  assert.match(portal, /state\.authMode = verificationAuthMode\(\);/);
});

test('runtime configuration defaults to link confirmation and only opts into OTP exactly', () => {
  assert.equal(runtimeConfigFor().statusCode, 200);
  assert.equal(runtimeConfigFor().body.data.emailConfirmationMode, 'link');
  assert.equal(runtimeConfigFor({ VENDOR_EMAIL_CONFIRMATION_MODE: 'otp' }).body.data.emailConfirmationMode, 'otp');
  assert.equal(runtimeConfigFor({ VENDOR_EMAIL_CONFIRMATION_MODE: 'otp\n' }).body.data.emailConfirmationMode, 'otp');
  assert.equal(runtimeConfigFor({ VENDOR_EMAIL_CONFIRMATION_MODE: 'OTP' }).body.data.emailConfirmationMode, 'link');
});
