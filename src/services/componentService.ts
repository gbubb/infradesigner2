
import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
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
    
    // Convert database format to application format and use type assertion
    return (data?.map(component => ({
      id: component.id,
      name: component.name,
      type: component.type as ComponentType,
      manufacturer: component.manufacturer || '',
      model: component.model || '',
      description: component.description || '',
      cost: Number(component.cost) || 0,
      powerRequired: Number(component.powerrequired) || 0,
      serverRole: component.serverrole,
      switchRole: component.switchrole,
      isDefault: component.isdefault || false,
    })) || []) as InfrastructureComponent[];
  } catch (err) {
    console.error('Error loading components:', err);
    toast.error('Failed to load components from the database');
    return [];
  }
};

// Save a component to Supabase
export const saveComponent = async (component: InfrastructureComponent): Promise<boolean> => {
  try {
    // Format data for Supabase
    const componentToSave = {
      id: component.id,
      name: component.name,
      type: component.type,
      manufacturer: component.manufacturer,
      model: component.model,
      description: component.description || '',
      cost: component.cost,
      powerrequired: component.powerRequired,
      serverrole: (component as any).serverRole,
      switchrole: (component as any).switchRole,
      isdefault: component.isDefault || false
    };
    
    const { error } = await supabase
      .from(TABLES.COMPONENTS)
      .upsert(componentToSave);
    
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
    // Format data for Supabase
    const componentsToSave = components.map(component => ({
      id: component.id,
      name: component.name,
      type: component.type,
      manufacturer: component.manufacturer,
      model: component.model,
      description: component.description || '',
      cost: component.cost,
      powerrequired: component.powerRequired,
      serverrole: (component as any).serverRole,
      switchrole: (component as any).switchRole,
      isdefault: component.isDefault || false
    }));
    
    const { error } = await supabase
      .from(TABLES.COMPONENTS)
      .upsert(componentsToSave);
    
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
