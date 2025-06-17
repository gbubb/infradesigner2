
import { StateCreator } from 'zustand';
import { StoreState } from '../../types';
import { 
  RequirementsSlice, 
  defaultRequirements 
} from './types';
import { calculateComponentRoles } from './roleCalculator';
import { calculateStorageNodeCapacity } from './calculationUtils';
import { calculateRequiredQuantity } from './calculationManager';
import { addDiskToStorageNode, removeDiskFromStorageNode } from './diskAndGPUOperations';
import { addGPUToComputeNode, removeGPUFromComputeNode } from './diskAndGPUOperations';
import { assignComponentToRole, getRoleById, updateRoleRequiredCount } from './roleOperations';
import { addCassetteToPanel, removeCassetteFromPanel } from './cassetteOperations';
import { IntelligentDesignUpdater } from '../../calculations/intelligentDesignUpdater';
import { StoreSet, StoreGet } from '@/types/store-operations';

/**
 * Creates the requirements slice with operations dispatched to specialized modules
 */
export const createRequirementsSliceOperations = (
  set: StoreSet<StoreState>, 
  get: StoreGet<StoreState>
): RequirementsSlice => {
  return {
    requirements: defaultRequirements,
    componentRoles: [],
    selectedDisksByRole: {},
    selectedGPUsByRole: {},
    selectedCassettesByRole: {},
    calculationBreakdowns: {},
    
    updateRequirements: (newRequirements) => {
      const currentState = get();
      const previousRequirements = { ...currentState.requirements };
      
      
      // Update the requirements in the store first (deep merge)
      set((state: StoreState) => {
        const updatedRequirements = {
          ...state.requirements,
          ...newRequirements
        };
        
        // Deep merge sub-objects if they exist in newRequirements
        if (newRequirements.computeRequirements) {
          updatedRequirements.computeRequirements = {
            ...state.requirements.computeRequirements,
            ...newRequirements.computeRequirements
          };
        }
        
        if (newRequirements.storageRequirements) {
          updatedRequirements.storageRequirements = {
            ...state.requirements.storageRequirements,
            ...newRequirements.storageRequirements
          };
        }
        
        if (newRequirements.networkRequirements) {
          updatedRequirements.networkRequirements = {
            ...state.requirements.networkRequirements,
            ...newRequirements.networkRequirements
          };
        }
        
        if (newRequirements.physicalConstraints) {
          updatedRequirements.physicalConstraints = {
            ...state.requirements.physicalConstraints,
            ...newRequirements.physicalConstraints
          };
        }
        
        if (newRequirements.licensingRequirements) {
          updatedRequirements.licensingRequirements = {
            ...state.requirements.licensingRequirements,
            ...newRequirements.licensingRequirements
          };
        }
        
        if (newRequirements.pricingRequirements) {
          updatedRequirements.pricingRequirements = {
            ...state.requirements.pricingRequirements,
            ...newRequirements.pricingRequirements
          };
        }
        
        
        return { requirements: updatedRequirements };
      });
      
      // Get the updated state for the new requirements
      const updatedState = get();
      const updatedRequirements = updatedState.requirements;
      
      // Use intelligent updater instead of full recalculation
      IntelligentDesignUpdater.updateDesignFromRequirements(
        previousRequirements,
        updatedRequirements
      );
    },
    
    calculateComponentRoles: () => {
      const state = get();
      const { requirements, componentRoles: existingRoles, activeDesign } = state;
      
      // Create a map of existing assignments before recalculation
      const existingAssignments: Record<string, { componentId: string, diskConfig?: Array<{ diskId: string, quantity: number }>, gpuConfig?: Array<{ gpuId: string, quantity: number }> }> = {};
      
      // Get assignments from current componentRoles
      existingRoles.forEach(role => {
        if (role.assignedComponentId) {
          const roleKey = role.role === 'storageNode' && role.clusterInfo?.clusterId
            ? `${role.role}-${role.clusterInfo.clusterId}`
            : role.role;
          existingAssignments[roleKey] = {
            componentId: role.assignedComponentId,
            diskConfig: state.selectedDisksByRole[role.id],
            gpuConfig: state.selectedGPUsByRole[role.id]
          };
        }
      });
      
      // Also check activeDesign for any additional assignments
      if (activeDesign?.componentRoles) {
        activeDesign.componentRoles.forEach(role => {
          if (role.assignedComponentId) {
            const roleKey = role.role === 'storageNode' && role.clusterInfo?.clusterId
              ? `${role.role}-${role.clusterInfo.clusterId}`
              : role.role;
            // Only add if not already in existingAssignments
            if (!existingAssignments[roleKey]) {
              existingAssignments[roleKey] = {
                componentId: role.assignedComponentId,
                diskConfig: activeDesign.selectedDisksByRole?.[role.id],
                gpuConfig: activeDesign.selectedGPUsByRole?.[role.id]
              };
            }
          }
        });
      }
      
      // Calculate new roles
      const newRoles = calculateComponentRoles(requirements);
      
      // Restore assignments to the new roles
      const updatedRoles = newRoles.map(role => {
        const roleKey = role.role === 'storageNode' && role.clusterInfo?.clusterId
          ? `${role.role}-${role.clusterInfo.clusterId}`
          : role.role;
        
        if (existingAssignments[roleKey]) {
          return {
            ...role,
            assignedComponentId: existingAssignments[roleKey].componentId
          };
        }
        return role;
      });
      
      // Rebuild disk and GPU configurations
      const newDisksByRole: Record<string, Array<{ diskId: string, quantity: number }>> = {};
      const newGPUsByRole: Record<string, Array<{ gpuId: string, quantity: number }>> = {};
      
      updatedRoles.forEach(role => {
        const roleKey = role.role === 'storageNode' && role.clusterInfo?.clusterId
          ? `${role.role}-${role.clusterInfo.clusterId}`
          : role.role;
        
        if (existingAssignments[roleKey]) {
          if (existingAssignments[roleKey].diskConfig) {
            newDisksByRole[role.id] = existingAssignments[roleKey].diskConfig;
          }
          if (existingAssignments[roleKey].gpuConfig) {
            newGPUsByRole[role.id] = existingAssignments[roleKey].gpuConfig;
          }
        }
      });
      
      set({ 
        componentRoles: updatedRoles,
        selectedDisksByRole: newDisksByRole,
        selectedGPUsByRole: newGPUsByRole
      });
    },
    
    calculateRequiredQuantity: (roleId: string, componentId: string): number => {
      console.log(`Store: calculateRequiredQuantity called for role ${roleId} with component ${componentId}`);
      const state = get();
      
      const { requiredQuantity, calculationSteps } = calculateRequiredQuantity(roleId, componentId, state);
      
      console.log(`Storing calculation for ${roleId}: ${requiredQuantity} with ${calculationSteps.length} steps`);
      
      const role = state.componentRoles.find(r => r.id === roleId);
      const component = state.componentTemplates.find(c => c.id === componentId);
      console.log(`Role: ${role?.role}, Component: ${component?.name}`);
      
      const updatedBreakdowns = {
        ...state.calculationBreakdowns,
        [roleId]: calculationSteps
      };
      
      console.log(`Updated breakdowns now has ${Object.keys(updatedBreakdowns).length} entries`);
      
      const updatedRoles = state.componentRoles.map(r => {
        if (r.id === roleId) {
          return {
            ...r,
            adjustedRequiredCount: requiredQuantity
          };
        }
        return r;
      });
      
      set({
        calculationBreakdowns: updatedBreakdowns,
        componentRoles: updatedRoles
      });
      
      return requiredQuantity;
    },
    
    getCalculationBreakdown: (roleId: string): string[] => {
      const state = get();
      const steps = state.calculationBreakdowns[roleId];
      console.log(`Retrieved ${steps?.length || 0} calculation steps for ${roleId}`);
      return steps || [];
    },
    
    calculateStorageNodeCapacity: (roleId: string): number => {
      const state = get();
      return calculateStorageNodeCapacity(roleId, state.selectedDisksByRole, state.componentTemplates || []);
    },
    
    assignComponentToRole: (roleId: string, componentId: string) => {
      set((state: StoreState) => {
        const updatedRoles = assignComponentToRole(state.componentRoles, roleId, componentId);
        
        const { requiredQuantity, calculationSteps } = calculateRequiredQuantity(
          roleId, 
          componentId, 
          {...state, componentRoles: updatedRoles}
        );
        
        const finalRoles = updateRoleRequiredCount(updatedRoles, roleId, requiredQuantity);
        
        return { 
          componentRoles: finalRoles,
          calculationBreakdowns: {
            ...state.calculationBreakdowns,
            [roleId]: calculationSteps
          }
        };
      });
    },
    
    addDiskToStorageNode: (roleId: string, diskId: string, quantity: number) => {
      set((state: StoreState) => {
        const updatedSelectedDisks = addDiskToStorageNode(roleId, diskId, quantity, state.selectedDisksByRole);
        return { selectedDisksByRole: updatedSelectedDisks };
      });
      
      const state = get();
      const role = getRoleById(state.componentRoles, roleId);
      
      if (role && role.assignedComponentId) {
        set((state: StoreState) => {
          const { requiredQuantity, calculationSteps } = calculateRequiredQuantity(
            roleId, 
            role.assignedComponentId!, 
            state
          );
          
          return {
            componentRoles: updateRoleRequiredCount(state.componentRoles, roleId, requiredQuantity),
            calculationBreakdowns: {
              ...state.calculationBreakdowns,
              [roleId]: calculationSteps
            }
          };
        });
      }
    },
    
    removeDiskFromStorageNode: (roleId: string, diskId: string) => {
      set((state: StoreState) => {
        const updatedSelectedDisks = removeDiskFromStorageNode(roleId, diskId, state.selectedDisksByRole);
        return { selectedDisksByRole: updatedSelectedDisks };
      });
      
      const state = get();
      const role = getRoleById(state.componentRoles, roleId);
      
      if (role && role.assignedComponentId) {
        set((state: StoreState) => {
          const { requiredQuantity, calculationSteps } = calculateRequiredQuantity(
            roleId, 
            role.assignedComponentId!, 
            state
          );
          
          return {
            componentRoles: updateRoleRequiredCount(state.componentRoles, roleId, requiredQuantity),
            calculationBreakdowns: {
              ...state.calculationBreakdowns,
              [roleId]: calculationSteps
            }
          };
        });
      }
    },
    
    addGPUToComputeNode: (roleId: string, gpuId: string, quantity: number) => {
      set((state: StoreState) => {
        const updatedSelectedGPUs = addGPUToComputeNode(roleId, gpuId, quantity, state.selectedGPUsByRole);
        return { selectedGPUsByRole: updatedSelectedGPUs };
      });
      
      const state = get();
      const role = getRoleById(state.componentRoles, roleId);
      
      if (role && role.assignedComponentId) {
        set((state: StoreState) => {
          const { requiredQuantity, calculationSteps } = calculateRequiredQuantity(
            roleId, 
            role.assignedComponentId!, 
            state
          );
          
          return {
            componentRoles: updateRoleRequiredCount(state.componentRoles, roleId, requiredQuantity),
            calculationBreakdowns: {
              ...state.calculationBreakdowns,
              [roleId]: calculationSteps
            }
          };
        });
      }
    },
    
    removeGPUFromComputeNode: (roleId: string, gpuId: string) => {
      set((state: StoreState) => {
        const updatedSelectedGPUs = removeGPUFromComputeNode(roleId, gpuId, state.selectedGPUsByRole);
        return { selectedGPUsByRole: updatedSelectedGPUs };
      });
      
      const state = get();
      const role = getRoleById(state.componentRoles, roleId);
      
      if (role && role.assignedComponentId) {
        set((state: StoreState) => {
          const { requiredQuantity, calculationSteps } = calculateRequiredQuantity(
            roleId, 
            role.assignedComponentId!, 
            state
          );
          
          return {
            componentRoles: updateRoleRequiredCount(state.componentRoles, roleId, requiredQuantity),
            calculationBreakdowns: {
              ...state.calculationBreakdowns,
              [roleId]: calculationSteps
            }
          };
        });
      }
    },
    
    addCassetteToPanel: (roleId: string, cassetteId: string, quantity: number) => {
      set((state: StoreState) => {
        const updatedCassettes = addCassetteToPanel(roleId, cassetteId, quantity, state.selectedCassettesByRole);
        return { selectedCassettesByRole: updatedCassettes };
      });
    },
    
    removeCassetteFromPanel: (roleId: string, cassetteId: string) => {
      set((state: StoreState) => {
        const updatedCassettes = removeCassetteFromPanel(roleId, cassetteId, state.selectedCassettesByRole);
        return { selectedCassettesByRole: updatedCassettes };
      });
    }
  };
};
