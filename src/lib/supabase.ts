
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Table names - Use string literals that match the actual table names in Supabase
export const TABLES = {
  COMPONENTS: 'components',
  DESIGNS: 'designs',
  FACILITIES: 'facilities',
  FACILITY_HIERARCHY: 'facility_hierarchy',
} as const;  // Use const assertion to ensure TypeScript recognizes these as literal types

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
