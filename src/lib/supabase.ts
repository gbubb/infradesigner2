
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

// Re-export supabase client
export { supabase };
