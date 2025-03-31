
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
    
    // Convert database format to application format
    return (data?.map(design => ({
      id: design.id,
      name: design.name,
      description: design.description || '',
      requirements: design.requirements || {},
      components: design.components || [],
      createdAt: new Date(design.createdat),
      updatedAt: design.updatedat ? new Date(design.updatedat) : new Date(design.createdat)
    })) || []) as InfrastructureDesign[];
  } catch (err) {
    console.error('Error loading designs:', err);
    toast.error('Failed to load designs from the database');
    return [];
  }
};

// Save a design to Supabase
export const saveDesign = async (design: InfrastructureDesign): Promise<boolean> => {
  try {
    // Format data for Supabase
    const designToSave = {
      id: design.id,
      name: design.name,
      description: design.description,
      requirements: design.requirements,
      components: design.components,
      createdat: design.createdAt.toISOString(),
      updatedat: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from(TABLES.DESIGNS)
      .upsert(designToSave);
    
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
