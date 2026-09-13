import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
dotenv.config({path:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../.env')});
const response=await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:`select j.jobname,j.schedule,j.active,r.last_started_at,r.last_succeeded_at,r.last_error from cron.job j left join public.operations_runtime r on r.name='nonpayment-maintenance' where j.jobname='sfbf-nonpayment-maintenance'`}),signal:AbortSignal.timeout(30000)});
assert.equal(response.ok,true);const rows=await response.json();assert.equal(rows.length,1);assert.equal(rows[0].active,true);assert.ok(rows[0].last_succeeded_at,'Waiting for the first successful scheduled run');assert.equal(rows[0].last_error,null);console.log('Scheduler verified:',rows[0]);
