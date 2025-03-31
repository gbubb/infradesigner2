
import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase';
import { InfrastructureDesign } from '@/types/infrastructure';
import { toast } from 'sonner';

// Load all designs from Supabase
export const loadDesigns = async (): Promise<InfrastructureDesign[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.DESIGNS)
      .select('*');
      
    if (handleSupabaseError(error, 'loading designs')) {
      return [];
    }
    
    // Convert date strings back to Date objects
    return data?.map(design => ({
      ...design,
      createdAt: new Date(design.createdAt),
      updatedAt: design.updatedAt ? new Date(design.updatedAt) : undefined
    })) as InfrastructureDesign[] || [];
  } catch (err) {
    console.error('Error loading designs:', err);
    toast.error('Failed to load designs from the database');
    return [];
  }
};

// Save a design to Supabase
export const saveDesign = async (design: InfrastructureDesign): Promise<boolean> => {
  try {
    // Make sure dates are stringified for Supabase
    const designToSave = {
      ...design,
      createdAt: design.createdAt.toISOString(),
      updatedAt: design.updatedAt ? design.updatedAt.toISOString() : null
    };
    
    const { error } = await supabase
      .from(TABLES.DESIGNS)
      .upsert(designToSave, { onConflict: 'id' });
    
    if (handleSupabaseError(error, 'saving design')) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error saving design:', err);
    toast.error('Failed to save design to the database');
    return false;
  }
};

// Delete a design from Supabase
export const deleteDesign = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(TABLES.DESIGNS)
      .delete()
      .eq('id', id);
    
    if (handleSupabaseError(error, 'deleting design')) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error deleting design:', err);
    toast.error('Failed to delete design from the database');
    return false;
  }
};
