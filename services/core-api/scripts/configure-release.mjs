import dotenv from 'dotenv';
import crypto from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
dotenv.config({path:path.join(root,'.env')});
const local=path.join(root,'.operations.secrets.local');
const saved=existsSync(local)?dotenv.parse(readFileSync(local)):{};
const required=name=>{
 const value=(saved[name]||process.env[name]||'').trim();
 if(!value)throw Error(`Missing ${name} in the secure local environment. Refusing to publish an empty production variable.`);
 return value;
};
const isBase64Key32=value=>{
 try{return Buffer.from(value||'','base64').length===32;}catch{return false;}
};
for(const name of ['ADMIN_CURSOR_SECRET','OPERATIONS_RUNNER_SECRET'])saved[name]??=crypto.randomBytes(32).toString('hex');
// This key is kept in the ignored operations secret store so a subsequent
// release never silently rotates access to encrypted merchant KYC records.
saved.KYC_ENCRYPTION_KEY??=process.env.KYC_ENCRYPTION_KEY||crypto.randomBytes(32).toString('base64');
if(!isBase64Key32(saved.KYC_ENCRYPTION_KEY))throw Error('KYC_ENCRYPTION_KEY must decode to exactly 32 bytes.');
writeFileSync(local,Object.entries(saved).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{mode:0o600});
const api='https://sell-fast-buy-fast-core-api.vercel.app';
const admin='https://sell-fast-buy-fast-admin.vercel.app';
const vendor='https://www.sellfastbuyfast.com';
const settings={
 'services/core-api':{
  NODE_ENV:'production',
  SUPABASE_URL:required('SUPABASE_URL'),
  SUPABASE_ANON_KEY:required('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY:required('SUPABASE_SERVICE_ROLE_KEY'),
  DATABASE_URL:required('DATABASE_URL'),
  KYC_ENCRYPTION_KEY:saved.KYC_ENCRYPTION_KEY,
  ADMIN_CURSOR_SECRET:saved.ADMIN_CURSOR_SECRET,
  OPERATIONS_RUNNER_SECRET:saved.OPERATIONS_RUNNER_SECRET,
  ADMIN_REQUIRE_MFA:'false',ADMIN_FINANCE_ENABLED:'false',PAYMENT_MODE:'mock',ADMIN_PORTAL_URL:admin,
  CORS_ORIGINS:[vendor,'https://sellfastbuyfast.com','https://sell-fast-buy-fast-vendor.vercel.app',admin,'http://localhost:4173','http://127.0.0.1:4173','http://localhost:4174','http://127.0.0.1:4174'].join(','),
 },
 'admin-portal':{ADMIN_API_URL:api,ADMIN_SUPABASE_URL:required('SUPABASE_URL'),ADMIN_SUPABASE_ANON_KEY:required('SUPABASE_ANON_KEY')},
 'vendor-portal':{VENDOR_API_URL:api,VENDOR_SUPABASE_URL:required('SUPABASE_URL'),VENDOR_SUPABASE_ANON_KEY:required('SUPABASE_ANON_KEY'),VENDOR_EMAIL_CONFIRMATION_MODE:process.env.VENDOR_EMAIL_CONFIRMATION_MODE?.trim()==='otp'?'otp':'link'},
};
const only=process.argv.find(argument=>argument.startsWith('--only='))?.slice('--only='.length);
const selected=only?{[only]:settings[only]}:settings;
if(only&&!settings[only])throw Error(`Unknown release target: ${only}`);
for(const [directory,variables] of Object.entries(selected))for(const [name,value] of Object.entries(variables)) {
 if(!value)throw Error(`Missing ${name}`);
 if(!process.argv.includes('--apply')){console.log(`${directory}: ${name}`);continue;}
 const sensitive=name.includes('SECRET')||['DATABASE_URL','KYC_ENCRYPTION_KEY','SUPABASE_SERVICE_ROLE_KEY'].includes(name);
 // Keep secrets off the command line. Vercel's stdin reader needs a newline;
 // runtime configuration trims it before use. Public configuration can use
 // --value, which preserves its exact value without the stdin terminator.
 const command=['env','add',name,'production','--force','--yes'];
 if(sensitive)command.push('--sensitive');
 else command.push('--value',value);
 const result=spawnSync('vercel',command,{cwd:path.join(root,directory),input:sensitive?`${value}\n`:undefined,encoding:'utf8',timeout:60000});
 if(result.status!==0)throw Error(`Could not configure ${directory}: ${name}. Check Vercel access; secret values were not logged.`);
 console.log(`Configured ${directory}: ${name}`);
}
