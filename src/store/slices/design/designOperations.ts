import { v4 as uuidv4 } from 'uuid';
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

