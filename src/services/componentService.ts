import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase';
import { InfrastructureComponent, ComponentType, Server, Switch, Disk, FiberPatchPanel, CopperPatchPanel, Cassette, Cable, ConnectorType } from '@/types/infrastructure';
import { CableMediaType } from '@/types/infrastructure';
import { Transceiver } from '@/types/infrastructure/transceiver-types';
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
      if ('type' in component) {
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

        const details = component.details ? 
          (typeof component.details === 'string' ? 
            JSON.parse(component.details) : component.details) : {};
        
        // Extract common fields from details
        const commonFields: any = {
          namingPrefix: details.namingPrefix,
          placement: details.placement,
        };
        
        // Debug log for placement data
        if (details.placement) {
          console.log(`Loading component ${component.name} with placement:`, details.placement);
        }
        
        // Ensure we correctly assign ports array where present
        switch (component.type) {
          case ComponentType.Server:
            const memoryCapacity = details.memoryCapacity || details.memoryGB || 
              (details.memoryTB ? details.memoryTB * 1024 : 0);
            const coreCount = details.cpuSockets && details.cpuCoresPerSocket ?
              details.cpuSockets * details.cpuCoresPerSocket :
              details.coreCount || details.cores || details.totalCores || 0;
            return {
              ...baseComponent,
              ...commonFields,
              serverRole: component.serverrole,
              rackUnitsConsumed: details.rackUnitsConsumed || details.ruSize || 1,
              cpuModel: details.cpuModel || '',
              coreCount: coreCount,
              memoryGB: memoryCapacity,
              cpuSockets: details.cpuSockets || 1,
              cpuCoresPerSocket: details.cpuCoresPerSocket || 1,
              memoryCapacity: memoryCapacity,
              diskSlotType: details.diskSlotType || undefined,
              diskSlotQuantity: details.diskSlotQuantity || 0,
              ruSize: details.ruSize || details.rackUnitsConsumed || 1,
              networkPortType: details.networkPortType || undefined,
              portsConsumedQuantity: details.portsConsumedQuantity || 0,
              storageCapacityTB: details.storageCapacityTB || 0,
              networkPorts: details.networkPorts || 0,
              networkPortSpeed: details.networkPortSpeed || 0,
              ports: Array.isArray(details.ports) ? details.ports : [],
            } as Server;
            
          case ComponentType.Switch:
            const switchComponent = {
              ...baseComponent,
              ...commonFields,
              switchRole: component.switchrole,
              rackUnitsConsumed: details.rackUnitsConsumed || details.ruSize || 1,
              portCount: details.portCount || 0,
              portSpeed: details.portSpeed || 0,
              layer: details.layer || 2,
              ruSize: details.ruSize || details.rackUnitsConsumed || 1,
              portSpeedType: details.portSpeedType || undefined,
              portsProvidedQuantity: details.portsProvidedQuantity || details.portCount || 0,
              managementInterface: details.managementInterface || '',
              ports: Array.isArray(details.ports) ? details.ports : [],
            } as Switch;
            
            // Debug log for Switch loading
            console.log('Loaded Switch component:', {
              name: switchComponent.name,
              placement: switchComponent.placement,
              switchRole: switchComponent.switchRole
            });
            
            return switchComponent;
            
          case ComponentType.Disk:
            return {
              ...baseComponent,
              ...commonFields,
              capacityTB: details.capacityTB || 0,
              formFactor: details.formFactor || '',
              interface: details.interface || '',
              diskType: details.diskType || undefined,
              rpm: details.rpm || 0,
              iops: details.iops || 0,
              readSpeed: details.readSpeed || 0,
              writeSpeed: details.writeSpeed || 0,
            } as Disk;

          case ComponentType.Router:
          case ComponentType.Firewall:
            return {
              ...baseComponent,
              ...commonFields,
              rackUnitsConsumed: details.rackUnitsConsumed || details.ruSize || 1,
              ruSize: details.ruSize || details.rackUnitsConsumed || 1,
              throughput: details.throughput || 0,
              connectionPerSecond: details.connectionPerSecond || 0,
              concurrentConnections: details.concurrentConnections || 0,
              features: details.features || [],
              supportedProtocols: details.supportedProtocols || [],
              ports: Array.isArray(details.ports) ? details.ports : [],
            };

          case ComponentType.FiberPatchPanel:
            return {
              ...baseComponent,
              ...commonFields,
              ruSize: details.ruSize || 1,
              cassetteCapacity: details.cassetteCapacity || 0,
              ports: Array.isArray(details.ports) ? details.ports : [],
            } as FiberPatchPanel;
            
          case ComponentType.CopperPatchPanel:
            return {
              ...baseComponent,
              ...commonFields,
              ruSize: details.ruSize || 1,
              portQuantity: details.portQuantity || 0,
              ports: Array.isArray(details.ports) ? details.ports : [],
            } as CopperPatchPanel;
            
          case ComponentType.Cassette:
            return {
              ...baseComponent,
              ...commonFields,
              portType: details.portType,
              portQuantity: details.portQuantity || 0,
            } as Cassette;
            
          case ComponentType.Cable:
            // Handle old cable format conversion
            if (details.connectorType && !details.connectorA_Type) {
              return {
                ...baseComponent,
                ...commonFields,
                length: details.length || 0,
                connectorA_Type: details.connectorType || ConnectorType.RJ45,
                connectorB_Type: details.connectorType || ConnectorType.RJ45,
                mediaType: details.mediaType || CableMediaType.CopperCat6a,
                isBreakout: details.isBreakout || false,
                connectorB_Quantity: details.connectorB_Quantity || 1
              } as Cable;
            }
            return {
              ...baseComponent,
              ...commonFields,
              length: details.length || 0,
              connectorA_Type: details.connectorA_Type || ConnectorType.RJ45,
              connectorB_Type: details.connectorB_Type || ConnectorType.RJ45,
              mediaType: details.mediaType || CableMediaType.CopperCat6a,
              isBreakout: details.isBreakout || false,
              connectorB_Quantity: details.connectorB_Quantity || 1
            } as Cable;

          case ComponentType.Transceiver:
            return {
              ...baseComponent,
              ...commonFields,
              mediaTypeSupported: details.mediaTypeSupported || [],
              connectorType: details.connectorType,
              mediaConnectorType: details.mediaConnectorType,
              speed: details.speed,
              maxDistanceMeters: details.maxDistanceMeters || 0,
              wavelengthNm: details.wavelengthNm,
              breakoutCompatible: details.breakoutCompatible || false,
              ruSize: 0 // Transceivers don't consume rack space
            } as Transceiver;

          default:
            return {
              ...baseComponent,
              ...commonFields,
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
    // Log the component being saved for debugging
    console.log('Saving component:', component);

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
    
    // Special handling for structured cabling components
    switch (componentWithValidID.type) {
      case ComponentType.FiberPatchPanel:
        specializedFields.ruSize = (componentWithValidID as FiberPatchPanel).ruSize || 0;
        specializedFields.cassetteCapacity = (componentWithValidID as FiberPatchPanel).cassetteCapacity || 0;
        break;
      case ComponentType.CopperPatchPanel:
        specializedFields.ruSize = (componentWithValidID as CopperPatchPanel).ruSize || 0;
        specializedFields.portQuantity = (componentWithValidID as CopperPatchPanel).portQuantity || 0;
        break;
      case ComponentType.Cassette:
        specializedFields.portType = (componentWithValidID as Cassette).portType;
        specializedFields.portQuantity = (componentWithValidID as Cassette).portQuantity || 0;
        break;
      case ComponentType.Cable:
        const cable = componentWithValidID as Cable;
        specializedFields.length = cable.length || 0;
        specializedFields.connectorA_Type = cable.connectorA_Type || ConnectorType.RJ45;
        specializedFields.connectorB_Type = cable.connectorB_Type || ConnectorType.RJ45;
        specializedFields.mediaType = cable.mediaType || CableMediaType.CopperCat6a;
        specializedFields.isBreakout = cable.isBreakout || false;
        specializedFields.connectorB_Quantity = cable.connectorB_Quantity || 1;
        break;
      case ComponentType.Transceiver:
        const transceiver = componentWithValidID as Transceiver;
        specializedFields.mediaTypeSupported = transceiver.mediaTypeSupported || [];
        specializedFields.connectorType = transceiver.connectorType;
        specializedFields.mediaConnectorType = transceiver.mediaConnectorType;
        specializedFields.speed = transceiver.speed;
        specializedFields.maxDistanceMeters = transceiver.maxDistanceMeters || 0;
        specializedFields.wavelengthNm = transceiver.wavelengthNm;
        specializedFields.breakoutCompatible = transceiver.breakoutCompatible || false;
        break;
    }
    
    // Ensure ports field is always saved if present
    if (Array.isArray(componentWithValidID.ports)) {
      specializedFields.ports = componentWithValidID.ports;
    }
    
    // Combine into the final object to save
    const componentToSave = {
      ...baseComponent,
      details: specializedFields,
    };
    
    console.log('Saving component to database:', componentToSave);
    if (specializedFields.placement) {
      console.log('Component includes placement data:', specializedFields.placement);
    }
    
    // Special debugging for Switch components
    if (componentWithValidID.type === ComponentType.Switch) {
      console.log('Saving Switch component with details:', {
        name: componentWithValidID.name,
        placement: specializedFields.placement,
        switchRole: baseComponent.switchrole,
        allSpecializedFields: specializedFields
      });
    }
    
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
