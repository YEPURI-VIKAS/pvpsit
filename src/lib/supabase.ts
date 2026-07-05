import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createMockSupabase } from './supabase-mock';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createMockSupabase() as unknown as SupabaseClient<any, any, any>);



