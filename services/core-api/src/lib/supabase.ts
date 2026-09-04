import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { config } from './config.js';

// Polyfill WebSocket for Node.js environments
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

const supabaseUrl = config.supabaseUrl;
const supabaseServiceRoleKey = config.supabaseServiceRoleKey;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');
}

// Privileged Supabase Admin Client for server operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
