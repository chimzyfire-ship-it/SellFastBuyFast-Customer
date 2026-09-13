import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const api='https://sell-fast-buy-fast-core-api.vercel.app';
const admin='https://sell-fast-buy-fast-admin.vercel.app';
const vendor='https://www.sellfastbuyfast.com';
async function request(url,options={}){return fetch(url,{...options,signal:AbortSignal.timeout(60000)});}
if(process.argv.includes('--run-maintenance')){
 const {OPERATIONS_RUNNER_SECRET:secret}=dotenv.parse(readFileSync(path.join(root,'.env.operations.local')));
 const response=await request(api+'/internal/operations/run',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:'{}'});
 assert.equal(response.status,200,'Authorized maintenance');console.log('Authorized non-payment maintenance completed.');
}
const checks=[
 [api+'/health',200],[api+'/v1/admin/me',401],[api+'/v1/orders',401],
 [api+'/v1/catalog/content',200],[api+'/v1/catalog/categories',200],
 [admin+'/',200],[admin+'/lib/supabase.js',200],[admin+'/app.js',200],
 [vendor+'/account-access.html',200],[vendor+'/account-access.js',200],[vendor+'/lib/supabase.js',200],
];
for(const [url,status] of checks){const response=await request(url);assert.equal(response.status,status,`${url}: HTTP ${response.status}`);console.log(`PASS ${status} ${url}`);}
for(const [origin,prefix] of [[admin,'ADMIN'],[vendor,'VENDOR']]){
 const response=await request(origin+'/api/runtime-config');assert.equal(response.status,200);const body=await response.json();assert.equal(body.data.apiUrl,api);assert.ok(body.data.supabaseUrl.startsWith('https://'));assert.ok(body.data.supabaseAnonKey);
 assert.ok(!JSON.stringify(body).includes('service_role'),'No service credentials in public configuration');
 console.log(`PASS ${prefix} public configuration`);
 const cors=await request(api+'/v1/admin/me',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization,if-match,idempotency-key,cache-control,pragma'}});
 assert.equal(cors.headers.get('access-control-allow-origin'),origin);for(const header of ['if-match','cache-control','pragma'])assert.ok(cors.headers.get('access-control-allow-headers').toLowerCase().split(',').map(h=>h.trim()).includes(header), `Browser preflight must allow ${header}`);console.log(`PASS CORS ${origin}`);
}
assert.equal((await request(api+'/internal/operations/run',{method:'POST'})).status,401);
const readiness=await request(api+'/ready');const status=await readiness.json();console.log('Readiness:',status);assert.equal(readiness.status,200);
