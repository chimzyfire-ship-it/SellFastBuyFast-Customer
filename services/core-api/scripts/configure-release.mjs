import dotenv from 'dotenv';
import crypto from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
dotenv.config({path:path.join(root,'.env')});
const local=path.join(root,'.env.operations.local');
const saved=existsSync(local)?dotenv.parse(readFileSync(local)):{};
for(const name of ['ADMIN_CURSOR_SECRET','OPERATIONS_RUNNER_SECRET'])saved[name]??=crypto.randomBytes(32).toString('hex');
writeFileSync(local,Object.entries(saved).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{mode:0o600});
const api='https://sell-fast-buy-fast-core-api.vercel.app';
const admin='https://sell-fast-buy-fast-admin.vercel.app';
const vendor='https://www.sellfastbuyfast.com';
const settings={
 'services/core-api':{...saved,ADMIN_REQUIRE_MFA:'true',ADMIN_FINANCE_ENABLED:'false',PAYMENT_MODE:'mock',ADMIN_PORTAL_URL:admin,CORS_ORIGINS:[vendor,'https://sellfastbuyfast.com','https://sell-fast-buy-fast-vendor.vercel.app',admin,'http://localhost:4173','http://127.0.0.1:4173','http://localhost:4174','http://127.0.0.1:4174'].join(',')},
 'admin-portal':{ADMIN_API_URL:api,ADMIN_SUPABASE_URL:process.env.SUPABASE_URL,ADMIN_SUPABASE_ANON_KEY:process.env.SUPABASE_ANON_KEY},
 'vendor-portal':{VENDOR_API_URL:api,VENDOR_SUPABASE_URL:process.env.SUPABASE_URL,VENDOR_SUPABASE_ANON_KEY:process.env.SUPABASE_ANON_KEY},
};
for(const [directory,variables] of Object.entries(settings))for(const [name,value] of Object.entries(variables)) {
 if(!value)throw Error(`Missing ${name}`);
 if(!process.argv.includes('--apply')){console.log(`${directory}: ${name}`);continue;}
 const sensitive=name.includes('SECRET');
 const result=spawnSync('vercel',['env','add',name,'production','--force','--yes',...(sensitive?['--sensitive']:[])],{cwd:path.join(root,directory),input:value,encoding:'utf8',timeout:60000});
 if(result.status!==0)throw Error(`Could not configure ${directory}: ${name}. Check Vercel access; secret values were not logged.`);
 console.log(`Configured ${directory}: ${name}`);
}
