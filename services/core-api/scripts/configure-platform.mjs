import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
dotenv.config({path:path.join(root,'.env')});
const saved=dotenv.parse(readFileSync(path.join(root,'.env.operations.local')));
const ref=process.env.SUPABASE_PROJECT_REF,token=process.env.SUPABASE_ACCESS_TOKEN;
if(!ref||!token)throw Error('Supabase management credentials are unavailable.');
async function management(route,options={}){
 const response=await fetch(`https://api.supabase.com/v1/projects/${ref}${route}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error(`Platform configuration failed (${response.status}); no credentials were logged.`);
 return response.json();
}
const mode=process.argv[2];
if(mode==='auth'){
 const existing=await management('/config/auth');
 const redirects=[...new Set([...(existing.uri_allow_list||'').split(',').filter(Boolean),
  'https://www.sellfastbuyfast.com/account-access.html','https://sellfastbuyfast.com/account-access.html',
  'https://sell-fast-buy-fast-vendor.vercel.app/account-access.html',
  'https://sell-fast-buy-fast-admin.vercel.app/'])];
 const patch={site_url:'https://www.sellfastbuyfast.com',uri_allow_list:redirects.join(',')};
 if(process.argv.includes('--apply'))await management('/config/auth',{method:'PATCH',body:JSON.stringify(patch)});
 console.log(process.argv.includes('--apply')?'Auth redirects configured.':'Auth configuration prepared.',patch);
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
