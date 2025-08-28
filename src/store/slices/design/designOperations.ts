import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { InfrastructureComponent, InfrastructureDesign, DesignRequirements } from '@/types/infrastructure';
import { saveDesignToDB } from './databaseOperations';
import { cableTemplates } from '@/data/componentData';
import { 
  CreateNewDesignOperationFn,
  UpdateDesignOperationFn,
  UpdateActiveDesignOperationFn 
} from '@/types/store-operations';

export const createNewDesignOperation: CreateNewDesignOperationFn = (
  name,
  description,
  existingDesign,
  currentRequirements
) => {
  const newDesignId = uuidv4();

  // Merge existing components (if any) with all cable templates, avoiding duplicates by id
  const existingComponents = existingDesign?.components || [];
  const cableIds = new Set(cableTemplates.map(c => c.id));
  const nonCableComponents = existingComponents.filter(c => c.type !== 'Cable' && !cableIds.has(c.id));
  const mergedComponents = [...nonCableComponents, ...cableTemplates];

  return {
    id: newDesignId,
    name,
    description: description || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    requirements: existingDesign?.requirements || { ...currentRequirements },
    components: mergedComponents,
    componentRoles: existingDesign?.componentRoles || [],
    selectedDisksByRole: existingDesign?.selectedDisksByRole || {},
    selectedGPUsByRole: existingDesign?.selectedGPUsByRole || {},
    connectionRules: existingDesign?.connectionRules || [],
    rackprofiles: existingDesign?.rackprofiles || [] // <-- correct property
  };
};

export const updateDesignOperation: UpdateDesignOperationFn = (
  design,
  updates
) => {
  // Log when rackprofiles are being updated
  if ('rackprofiles' in updates) {
    const deviceCount = updates.rackprofiles?.reduce((acc, r) => acc + (r.devices?.length || 0), 0) || 0;
    console.log(`[designOperations] updateDesign called with rackprofiles update:`, {
      timestamp: new Date().toISOString(),
      designId: design.id,
      rackCount: updates.rackprofiles?.length || 0,
      deviceCount,
      calledFrom: new Error().stack?.split('\n')[2]?.trim() // Get calling location
    });
  }
  
  return {
    ...design,
    ...updates,
    updatedAt: new Date()
  };
};

export const updateActiveDesignOperation: UpdateActiveDesignOperationFn = (
  activeDesign,
  components
) => {
  return {
    ...activeDesign,
    components,
    updatedAt: new Date()
  };
};

