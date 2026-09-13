import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import readline from 'node:readline';
import {createClient} from '@supabase/supabase-js';
import WebSocket from 'ws';
if (!globalThis.WebSocket) globalThis.WebSocket = WebSocket;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
dotenv.config({path:path.join(root,'.env')});
const email=process.argv[2]?.trim().toLowerCase();
if(!email||!email.includes('@'))throw Error('An exact account email is required.');
const quote=value=>"'"+value.replaceAll("'","''")+"'";
async function query(sql){
 const response=await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql}),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`Database administration failed (${response.status}).`);
 return response.json();
}
const rows=await query(`select id,email_confirmed_at is not null confirmed from auth.users where lower(email)=${quote(email)}`);
if(rows.length>1)throw Error('Ambiguous identity; no changes made.');
console.log(JSON.stringify({email,exists:rows.length===1,confirmed:rows[0]?.confirmed??false}));
if(!process.argv.includes('--apply'))process.exit(0);
console.log('Awaiting password on protected stdin.');
const input=readline.createInterface({input:process.stdin,terminal:false});
let password=await new Promise(resolve=>input.once('line',line=>{input.close();resolve(line);}));
if(typeof password!=='string'||password.length<8)throw Error('A password of at least eight characters is required.');
const auth=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const response=rows[0]
 ?await auth.auth.admin.updateUserById(rows[0].id,{password,email_confirm:true})
 :await auth.auth.admin.createUser({email,password,email_confirm:true});
if(response.error||!response.data.user)throw Error('The identity service could not set the account password. No staff grant was made.');
const userId=response.data.user.id;
await query(`BEGIN;
SELECT pg_advisory_xact_lock(7819234);
SELECT id FROM public.profiles WHERE id=${quote(userId)}::uuid FOR UPDATE;
INSERT INTO public.user_roles(user_id,role) VALUES(${quote(userId)}::uuid,'security_admin'),(${quote(userId)}::uuid,'operations_admin') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_staff_access(id,status,valid_after) VALUES(${quote(userId)}::uuid,'active',clock_timestamp()) ON CONFLICT(id) DO UPDATE SET status='active',valid_after=excluded.valid_after,updated_at=clock_timestamp();
UPDATE public.profiles SET updated_at=clock_timestamp() WHERE id=${quote(userId)}::uuid;
INSERT INTO public.audit_events(action,resource_type,resource_id,metadata) VALUES('access.bootstrap','access',${quote(userId)}::uuid,'{"note":"Owner-authorized initial administrator provisioning","roles":["security_admin","operations_admin"]}'::jsonb);
COMMIT;`);
await new Promise(resolve=>setTimeout(resolve,1200));
const login=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const signed=await login.auth.signInWithPassword({email,password});password='';
if(signed.error||!signed.data.session)throw Error('Account configured, but password sign-in verification did not complete.');
try {
 const me=await fetch('https://sell-fast-buy-fast-core-api.vercel.app/v1/admin/me',{headers:{Authorization:`Bearer ${signed.data.session.access_token}`},signal:AbortSignal.timeout(30000)});
 const body=await me.json();
 if(!me.ok)throw Error(`Account configured, but admin identity verification returned ${me.status}.`);
 console.log(JSON.stringify({email,configured:true,roles:body.data.roles,requireMfa:body.data.requireMfa,passwordSignInVerified:true}));
}finally{await login.auth.signOut({scope:'local'});}
