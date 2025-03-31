
import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// Helper function to check if string is a valid UUID
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Ensure component has a valid UUID, generate one if not
const ensureValidUUID = (component: InfrastructureComponent): InfrastructureComponent => {
  // If component ID doesn't exist or isn't a valid UUID, generate a new one
  if (!component.id || !isValidUUID(component.id)) {
    return {
      ...component,
      id: uuidv4()
    };
  }
  return component;
};

// Load all components from Supabase
export const loadComponents = async (): Promise<InfrastructureComponent[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.COMPONENTS)
      .select('*');
      
    if (handleSupabaseError(error, 'loading components')) {
      return [];
    }
    
    // Convert database format to application format with proper type assertion
    const components = (data?.map(component => {
      // Make sure we're only processing component rows by checking for required properties
      if ('type' in component) {
        return {
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
        };
      }
      // This should never happen if database is properly set up
      console.error('Invalid component data:', component);
      return null;
    }).filter(Boolean) || []);
    
    // Use type assertion with 'as unknown as' pattern to convert to InfrastructureComponent[]
    return components as unknown as InfrastructureComponent[];
  } catch (err) {
    console.error('Error loading components:', err);
    toast.error('Failed to load components from the database');
    return [];
  }
};

// Save a component to Supabase
export const saveComponent = async (component: InfrastructureComponent): Promise<boolean> => {
  try {
    // Ensure component has a valid UUID
    const componentWithValidID = ensureValidUUID(component);
    
    // Format data for Supabase
    const componentToSave = {
      id: componentWithValidID.id,
      name: componentWithValidID.name,
      type: componentWithValidID.type,
      manufacturer: componentWithValidID.manufacturer,
      model: componentWithValidID.model,
      description: componentWithValidID.description || '',
      cost: componentWithValidID.cost,
      powerrequired: componentWithValidID.powerRequired,
      serverrole: (componentWithValidID as any).serverRole,
      switchrole: (componentWithValidID as any).switchRole,
      isdefault: componentWithValidID.isDefault || false
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
    // Skip delete operation if ID is not a valid UUID
    if (!isValidUUID(id)) {
      console.warn('Attempted to delete component with invalid UUID:', id);
      return true; // Return true to avoid disrupting app flow
    }
    
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
    // Format data for Supabase and ensure all IDs are valid UUIDs
    const componentsToSave = components.map(component => {
      const componentWithValidID = ensureValidUUID(component);
      return {
        id: componentWithValidID.id,
        name: componentWithValidID.name,
        type: componentWithValidID.type,
        manufacturer: componentWithValidID.manufacturer,
        model: componentWithValidID.model,
        description: componentWithValidID.description || '',
        cost: componentWithValidID.cost,
        powerrequired: componentWithValidID.powerRequired,
        serverrole: (componentWithValidID as any).serverRole,
        switchrole: (componentWithValidID as any).switchRole,
        isdefault: componentWithValidID.isDefault || false
      };
    });
    
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
