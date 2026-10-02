import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
dotenv.config({path:path.join(root,'.env')});
const localSecrets=path.join(root,'.operations.secrets.local');
const saved=existsSync(localSecrets)?dotenv.parse(readFileSync(localSecrets)):{};
const ref=process.env.SUPABASE_PROJECT_REF,token=process.env.SUPABASE_ACCESS_TOKEN;
if(!ref||!token)throw Error('Supabase management credentials are unavailable.');
async function management(route,options={}){
 const response=await fetch(`https://api.supabase.com/v1/projects/${ref}${route}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error(`Platform configuration failed (${response.status}); no credentials were logged.`);
 return response.json();
}
const merchantOtpTemplate=`<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:#f7f5ef;color:#183b32;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px"><tr><td style="padding:36px 32px"><p style="margin:0 0 24px;font-weight:700;letter-spacing:.08em;color:#063c30">SELLFASTBUYFAST</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#063c30">Verify your merchant email</h1><p style="margin:0 0 24px;font-size:16px;line-height:1.6">Enter this one-time code in the SellFastBuyFast Merchant Portal:</p><p style="margin:0 0 24px;padding:18px;background:#f4ede0;border-radius:10px;text-align:center;color:#063c30;font-size:32px;font-weight:700;letter-spacing:8px">{{ .Token }}</p><p style="margin:0 0 16px;font-size:15px;line-height:1.6">This code expires in 10 minutes and can be used once. Do not share it with anyone.</p><p style="margin:0;font-size:14px;line-height:1.6;color:#52635d">If you did not create a SellFastBuyFast merchant account, you can safely ignore this email.</p></td></tr></table></td></tr></table></body></html>`;
function smtpFromEnvironment(){
 const values={
  smtp_admin_email:process.env.SUPABASE_SMTP_ADMIN_EMAIL,
  smtp_host:process.env.SUPABASE_SMTP_HOST,
  smtp_port:process.env.SUPABASE_SMTP_PORT,
  smtp_user:process.env.SUPABASE_SMTP_USER,
  smtp_pass:process.env.SUPABASE_SMTP_PASS,
  smtp_sender_name:process.env.SUPABASE_SMTP_SENDER_NAME,
 };
 const missing=Object.entries(values).filter(([,value])=>!value?.trim()).map(([name])=>name);
 const port=Number(values.smtp_port);
 if(!missing.length&&(!Number.isInteger(port)||port<1||port>65535))throw Error('SUPABASE_SMTP_PORT must be an integer between 1 and 65535.');
 return {missing,config:missing.length?null:{...values,smtp_port:String(port)}};
}
const mode=process.argv[2];
if(mode==='auth'){
 const existing=await management('/config/auth');
 const redirects=[...new Set([...(existing.uri_allow_list||'').split(',').filter(Boolean),
  'https://www.sellfastbuyfast.com/account-access.html','https://sellfastbuyfast.com/account-access.html',
  'https://sell-fast-buy-fast-vendor.vercel.app/account-access.html',
  'https://sell-fast-buy-fast-admin.vercel.app/'])];
 const patch={
  site_url:'https://www.sellfastbuyfast.com',
  uri_allow_list:redirects.join(','),
  external_email_enabled:true,
  mailer_secure_email_change_enabled:true,
  mailer_autoconfirm:false,
  // Numeric OTPs prevent email-security link scanners from consuming a
  // confirmation link before the merchant can use it. Keep these values in
  // sync with vendor-portal/app.js.
  mailer_otp_length:6,
  mailer_otp_exp:600,
  mailer_subjects_confirmation:'Your SellFastBuyFast verification code',
  mailer_templates_confirmation_content:merchantOtpTemplate,
 };
 const hasCustomSmtp=Boolean(existing.smtp_host&&existing.smtp_admin_email&&existing.smtp_sender_name);
 const smtp=smtpFromEnvironment();
 if(process.argv.includes('--apply')){
  if(!hasCustomSmtp){
   if(!smtp.config)throw Error(`Custom SMTP is required before changing production auth templates. Set ${smtp.missing.join(', ')} in the secure shell environment, then rerun this command.`);
   await management('/config/auth',{method:'PATCH',body:JSON.stringify(smtp.config)});
  }
  await management('/config/auth',{method:'PATCH',body:JSON.stringify(patch)});
 }
 console.log(process.argv.includes('--apply')?'Auth redirects, custom SMTP, and merchant OTP email configured.':'Auth configuration prepared.',{...patch,mailer_templates_confirmation_content:'[configured HTML email template]',customSmtp:hasCustomSmtp?'already configured':smtp.config?'will be configured from secure environment':'required before --apply'});
}else if(mode==='scheduler'){
 const secret=saved.OPERATIONS_RUNNER_SECRET;
 if(!secret||secret.length<32)throw Error('Generate and configure the runner secret first.');
 const literal=value=>"'"+value.replaceAll("'","''")+"'";
 const query=`CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
 CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
 DO $setup$ DECLARE secret_id uuid; BEGIN
 SELECT id INTO secret_id FROM vault.secrets WHERE name='sfbf_operations_runner';
 IF secret_id IS NULL THEN PERFORM vault.create_secret(${literal(secret)},'sfbf_operations_runner');
 ELSE PERFORM vault.update_secret(secret_id,${literal(secret)},'sfbf_operations_runner'); END IF; END $setup$;
 CREATE OR REPLACE FUNCTION public.invoke_nonpayment_maintenance() RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
 DECLARE token text; request_id bigint; BEGIN
 SELECT decrypted_secret INTO token FROM vault.decrypted_secrets WHERE name='sfbf_operations_runner';
 IF token IS NULL THEN RAISE EXCEPTION 'Operations runner secret is missing'; END IF;
 SELECT net.http_post(url:='https://sell-fast-buy-fast-core-api.vercel.app/internal/operations/run',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:='{}'::jsonb,timeout_milliseconds:=55000) INTO request_id;
 RETURN request_id; END $function$;
 REVOKE ALL ON FUNCTION public.invoke_nonpayment_maintenance() FROM PUBLIC,anon,authenticated;
 SELECT cron.schedule('sfbf-nonpayment-maintenance','* * * * *','select public.invoke_nonpayment_maintenance();');`;
 if(process.argv.includes('--apply'))await management('/database/query',{method:'POST',body:JSON.stringify({query})});
 console.log(process.argv.includes('--apply')?'Scheduled non-payment maintenance every minute.':'Prepared one-minute maintenance schedule; secret stored only in Vault.');
}else throw Error('Specify auth or scheduler; add --apply to configure the platform.');
