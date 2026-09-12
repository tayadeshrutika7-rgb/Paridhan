import { createClient } from '@supabase/supabase-js';
import { Database } from '@paridhan/types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy_anon_key_for_local_development';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
