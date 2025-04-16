import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase';
import { InfrastructureComponent, ComponentType, Server, Switch, Disk, FiberPatchPanel, CopperPatchPanel, Cassette, Cable, ConnectorType } from '@/types/infrastructure';
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

// Define type for database component row
interface ComponentRow {
  id: string;
  name: string;
  type: string;
  manufacturer: string | null;
  model: string | null;
  description: string | null;
  cost: number | null;
  powerrequired: number | null;
  serverrole: string | null;
  switchrole: string | null;
  isdefault: boolean | null;
  details: any | null;
  created_at?: string | null;
}

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
    const components = (data?.map((component: ComponentRow) => {
      // Make sure we're only processing component rows by checking for required properties
      if ('type' in component) {
        // Get base component fields
        const baseComponent = {
          id: component.id,
          name: component.name,
          type: component.type as ComponentType,
          manufacturer: component.manufacturer || '',
          model: component.model || '',
          description: component.description || '',
          cost: Number(component.cost) || 0,
          powerRequired: Number(component.powerrequired) || 0,
          isDefault: component.isdefault || false,
        };
        
        // Get specialized fields from the 'details' column if available
        const details = component.details ? 
          (typeof component.details === 'string' ? 
            JSON.parse(component.details) : component.details) : {};
        
        // Construct the full component based on its type
        switch (component.type) {
          case ComponentType.Server:
            // Determine the memory value using memoryCapacity as the primary field
            const memoryCapacity = details.memoryCapacity || details.memoryGB || 
              (details.memoryTB ? details.memoryTB * 1024 : 0);
                
            // Calculate core count consistently
            const coreCount = details.cpuSockets && details.cpuCoresPerSocket ?
              details.cpuSockets * details.cpuCoresPerSocket :
              details.cpuCount && details.coreCount ?
                details.cpuCount * details.coreCount :
                details.cores || details.totalCores || 0;
                
            return {
              ...baseComponent,
              serverRole: component.serverrole,
              rackUnitsConsumed: details.rackUnitsConsumed || details.ruSize || 1,
              cpuModel: details.cpuModel || '',
              cpuCount: details.cpuCount || 1,
              coreCount: coreCount,
              memoryGB: memoryCapacity, // For backward compatibility
              cpuSockets: details.cpuSockets || 1,
              cpuCoresPerSocket: details.cpuCoresPerSocket || 1,
              memoryCapacity: memoryCapacity, // Primary memory field
              diskSlotType: details.diskSlotType || undefined,
              diskSlotQuantity: details.diskSlotQuantity || 0,
              ruSize: details.ruSize || details.rackUnitsConsumed || 1,
              networkPortType: details.networkPortType || undefined,
              portsConsumedQuantity: details.portsConsumedQuantity || 0,
              storageCapacityTB: details.storageCapacityTB || 0,
              networkPorts: details.networkPorts || 0,
              networkPortSpeed: details.networkPortSpeed || 0,
            } as Server;
            
          case ComponentType.Switch:
            return {
              ...baseComponent,
              switchRole: component.switchrole,
              rackUnitsConsumed: details.rackUnitsConsumed || details.ruSize || 1,
              portCount: details.portCount || 0,
              portSpeed: details.portSpeed || 0,
              layer: details.layer || 2,
              ruSize: details.ruSize || details.rackUnitsConsumed || 1,
              portSpeedType: details.portSpeedType || undefined,
              portsProvidedQuantity: details.portsProvidedQuantity || details.portCount || 0,
              managementInterface: details.managementInterface || '',
            } as Switch;
            
          case ComponentType.Disk:
            return {
              ...baseComponent,
              capacityTB: details.capacityTB || 0,
              formFactor: details.formFactor || '',
              interface: details.interface || '',
              diskType: details.diskType || undefined,
              rpm: details.rpm || 0,
              iops: details.iops || 0,
              readSpeed: details.readSpeed || 0,
              writeSpeed: details.writeSpeed || 0,
            } as Disk;

          case ComponentType.FiberPatchPanel:
            return {
              ...baseComponent,
              ruSize: details.ruSize || 1,
              cassetteCapacity: details.cassetteCapacity || 0,
            } as FiberPatchPanel;
            
          case ComponentType.CopperPatchPanel:
            return {
              ...baseComponent,
              ruSize: details.ruSize || 1,
              portQuantity: details.portQuantity || 0,
            } as CopperPatchPanel;
            
          case ComponentType.Cassette:
            return {
              ...baseComponent,
              portType: details.portType || ConnectorType.RJ45,
              portQuantity: details.portQuantity || 0,
            } as Cassette;
            
          case ComponentType.Cable:
            return {
              ...baseComponent,
              length: details.length || 0,
              connectorType: details.connectorType || ConnectorType.RJ45,
            } as Cable;

          default:
            return {
              ...baseComponent,
              ...details, // Include all other properties for other component types
            };
        }
      }
      
      // This should never happen if database is properly set up
      console.error('Invalid component data:', component);
      return null;
    }).filter(Boolean) || []) as InfrastructureComponent[];
    
    console.log(`Loaded ${components.length} components from database`);
    return components;
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
    
    // Extract base fields that go directly into columns
    const baseComponent = {
      id: componentWithValidID.id,
      name: componentWithValidID.name,
      type: componentWithValidID.type,
      manufacturer: componentWithValidID.manufacturer || '',
      model: componentWithValidID.model || '',
      description: componentWithValidID.description || '',
      cost: componentWithValidID.cost || 0,
      powerrequired: componentWithValidID.powerRequired || 0,
      serverrole: (componentWithValidID as any).serverRole || null,
      switchrole: (componentWithValidID as any).switchRole || null,
      isdefault: componentWithValidID.isDefault || false
    };
    
    // Extract specialized fields based on component type
    const specializedFields: Record<string, any> = {};
    
    // Remove base fields to avoid duplication
    const { 
      id, name, type, manufacturer, model, description, cost, 
      powerRequired, isDefault, ...rest 
    } = componentWithValidID;
    
    // Remove serverRole and switchRole as they're already handled
    if ('serverRole' in rest) {
      const { serverRole, ...remaining } = rest as any;
      Object.assign(specializedFields, remaining);
    } else if ('switchRole' in rest) {
      const { switchRole, ...remaining } = rest as any;
      Object.assign(specializedFields, remaining);
    } else {
      Object.assign(specializedFields, rest);
    }
    
    // Combine into the final object to save
    const componentToSave = {
      ...baseComponent,
      details: specializedFields,
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
    // Save each component individually to ensure proper handling of specialized fields
    for (const component of components) {
      const result = await saveComponent(component);
      if (!result) {
        return false;
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error bulk saving components:', err);
    toast.error('Failed to save components to the database');
    return false;
  }
};
