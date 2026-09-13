import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
dotenv.config({path:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../.env')});
const ref=process.env.SUPABASE_PROJECT_REF;
const token=process.env.SUPABASE_ACCESS_TOKEN;
if(!ref||!token)throw Error('Supabase deployment credentials are unavailable.');
async function management(route, options={}) {
 const response=await fetch(`https://api.supabase.com/v1/projects/${ref}${route}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`Management request failed: ${response.status}`);
 return response.json();
}
const rows=await management('/database/query',{method:'POST',body:JSON.stringify({query:"select version from supabase_migrations.schema_migrations order by version"})});
console.log('Applied migrations:',rows.map(r=>r.version));
const auth=await management('/config/auth');
console.log('Auth configuration:',{siteUrl:auth.site_url,redirects:auth.uri_allow_list,emailConfirmation:!auth.mailer_autoconfirm,customSmtp:!!auth.smtp_host,totpEnabled:auth.mfa_totp_enroll_enabled});
const infrastructure=await management('/database/query',{method:'POST',body:JSON.stringify({query:"select extname from pg_extension where extname in ('pg_cron','pg_net','supabase_vault')"})});
console.log('Scheduler extensions:',infrastructure.map(r=>r.extname));
const buckets=await management('/database/query',{method:'POST',body:JSON.stringify({query:"select id,public,file_size_limit from storage.buckets order by id"})});
console.log('Storage buckets:',buckets);
const preflight=await management('/database/query',{method:'POST',body:JSON.stringify({query:"select (select count(*) from (select order_id from disputes where status in ('open','under_review') group by order_id having count(*)>1) d)::int duplicate_active_disputes, (select count(*) from user_roles where role='security_admin')::int security_administrators"})});
console.log('Migration/access preflight:',preflight);
