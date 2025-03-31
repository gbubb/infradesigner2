
import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase';
import { InfrastructureComponent } from '@/types/infrastructure';
import { toast } from 'sonner';

// Load all components from Supabase
export const loadComponents = async (): Promise<InfrastructureComponent[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.COMPONENTS)
      .select('*');
      
    if (handleSupabaseError(error, 'loading components')) {
      return [];
    }
    
    return data as InfrastructureComponent[];
  } catch (err) {
    console.error('Error loading components:', err);
    toast.error('Failed to load components from the database');
    return [];
  }
};

// Save a component to Supabase
export const saveComponent = async (component: InfrastructureComponent): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(TABLES.COMPONENTS)
      .upsert(component, { onConflict: 'id' });
    
    if (handleSupabaseError(error, 'saving component')) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error saving component:', err);
    toast.error('Failed to save component to the database');
    return false;
  }
};

// Delete a component from Supabase
export const deleteComponent = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(TABLES.COMPONENTS)
      .delete()
      .eq('id', id);
    
    if (handleSupabaseError(error, 'deleting component')) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error deleting component:', err);
    toast.error('Failed to delete component from the database');
    return false;
  }
};

// Bulk save components to Supabase
export const saveComponents = async (components: InfrastructureComponent[]): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(TABLES.COMPONENTS)
      .upsert(components, { onConflict: 'id' });
    
    if (handleSupabaseError(error, 'bulk saving components')) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error bulk saving components:', err);
    toast.error('Failed to save components to the database');
    return false;
  }
};
