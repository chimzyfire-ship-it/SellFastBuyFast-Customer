import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://fuqrhfxptybipxbzveyy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cXJoZnhwdHliaXB4Ynp2ZXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NDY3MjYsImV4cCI6MjEwMzUyMjcyNn0.Q240FBpikqiWaGytkVP1RWVHGA-ZpvdVicY9qf4pvWw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
