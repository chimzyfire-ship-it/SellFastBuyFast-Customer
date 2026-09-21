import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const api='https://sell-fast-buy-fast-core-api.vercel.app';
const admin='https://sell-fast-buy-fast-admin.vercel.app';
const vendor='https://www.sellfastbuyfast.com';
const vendorAlias='https://sell-fast-buy-fast-vendor.vercel.app';
async function request(url,options={}){return fetch(url,{...options,signal:AbortSignal.timeout(60000)});}
const health=await request(api+'/health');
assert.equal(health.status,200,'Core API health');
const healthBody=await health.json();
assert.equal(healthBody.capabilities?.productMediaUpload,true,'Deployed API must include vendor photo uploads');
assert.equal(healthBody.capabilities?.catalogModeration,true,'Deployed API must include catalogue moderation');
if(process.argv.includes('--run-maintenance')){
 const {OPERATIONS_RUNNER_SECRET:secret}=dotenv.parse(readFileSync(path.join(root,'.operations.secrets.local')));
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
for(const [origin,prefix] of [[admin,'ADMIN'],[vendor,'VENDOR'],[vendorAlias,'VENDOR ALIAS']]){
 const response=await request(origin+'/api/runtime-config');assert.equal(response.status,200);const body=await response.json();assert.equal(body.data.apiUrl,api);assert.ok(body.data.supabaseUrl.startsWith('https://'));assert.ok(body.data.supabaseAnonKey);
 assert.ok(!JSON.stringify(body).includes('service_role'),'No service credentials in public configuration');
 console.log(`PASS ${prefix} public configuration`);
 const cors=await request(api+'/v1/admin/me',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization,if-match,idempotency-key,cache-control,pragma'}});
 assert.equal(cors.headers.get('access-control-allow-origin'),origin);for(const header of ['if-match','cache-control','pragma'])assert.ok(cors.headers.get('access-control-allow-headers').toLowerCase().split(',').map(h=>h.trim()).includes(header), `Browser preflight must allow ${header}`);console.log(`PASS CORS ${origin}`);
}
for(const origin of [vendor,vendorAlias]){
 const preflight=await request(api+'/v1/catalog-management/merchant/00000000-0000-0000-0000-000000000000/media/upload-url',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type,idempotency-key'}});
 assert.equal(preflight.status,204,`Photo upload preflight from ${origin}`);
 assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
 console.log(`PASS vendor photo upload preflight ${origin}`);
}
assert.equal((await request(api+'/internal/operations/run',{method:'POST'})).status,401);
const readiness=await request(api+'/ready');const status=await readiness.json();console.log('Readiness:',status);assert.equal(readiness.status,200);
