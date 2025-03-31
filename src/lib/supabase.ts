
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials not found in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Table names
export const TABLES = {
  COMPONENTS: 'components',
  DESIGNS: 'designs',
};

// Error handler utility
export const handleSupabaseError = (error: Error | null, operation: string) => {
  if (error) {
    console.error(`Supabase ${operation} error:`, error);
    toast.error(`Error during ${operation}: ${error.message}`);
    return true;
  }
  return false;
};
