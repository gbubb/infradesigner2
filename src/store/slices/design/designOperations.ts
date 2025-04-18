
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { InfrastructureComponent, InfrastructureDesign } from '@/types/infrastructure';
import { saveDesignToDB } from './databaseOperations';

export const createNewDesignOperation = (
  name: string,
  description: string | undefined,
  existingDesign: InfrastructureDesign | null,
  currentRequirements: any
): InfrastructureDesign => {
  const newDesignId = uuidv4();
  
  return {
    id: newDesignId,
    name,
    description: description || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    requirements: existingDesign?.requirements || { ...currentRequirements },
    components: existingDesign?.components || [],
    componentRoles: existingDesign?.componentRoles || [],
    selectedDisksByRole: existingDesign?.selectedDisksByRole || {},
    selectedGPUsByRole: existingDesign?.selectedGPUsByRole || {}
  };
};

export const updateDesignOperation = (
  design: InfrastructureDesign,
  updates: Partial<InfrastructureDesign>
): InfrastructureDesign => {
  return {
    ...design,
    ...updates,
    updatedAt: new Date()
  };
};

export const updateActiveDesignOperation = (
  activeDesign: InfrastructureDesign,
  components: InfrastructureComponent[]
): InfrastructureDesign => {
  return {
    ...activeDesign,
    components,
    updatedAt: new Date()
  };
};

