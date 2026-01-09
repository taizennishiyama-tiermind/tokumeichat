import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Configuration Check:');
console.log('  URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('  Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are not set. App will run in demo mode.');
} else {
  console.log('✅ Supabase configured with URL:', supabaseUrl);
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'x-client-info': 'tokumeichat',
        },
      },
    })
  : null;

export const isSupabaseConfigured = !!supabase;

if (supabase) {
  console.log('✅ Supabase client created successfully');
} else {
  console.log('❌ Supabase client not created');
}
