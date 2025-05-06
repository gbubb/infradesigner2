
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

/**
 * Creates the requirements slice with operations dispatched to specialized modules
 */
export const createRequirementsSliceOperations = (set: any, get: any): RequirementsSlice => {
  return {
    requirements: defaultRequirements,
    componentRoles: [],
    selectedDisksByRole: {},
    selectedGPUsByRole: {},
    selectedCassettesByRole: {},
    calculationBreakdowns: {},
    
    updateRequirements: (newRequirements) => {
      set((state: StoreState) => ({
        requirements: {
          ...state.requirements,
          ...newRequirements,
          computeRequirements: {
            ...state.requirements.computeRequirements,
            ...newRequirements.computeRequirements
          },
          storageRequirements: {
            ...state.requirements.storageRequirements,
            ...newRequirements.storageRequirements
          },
          networkRequirements: {
            ...state.requirements.networkRequirements,
            ...newRequirements.networkRequirements
          },
          physicalConstraints: {
            ...state.requirements.physicalConstraints,
            ...newRequirements.physicalConstraints
          }
        }
      }));
      
      const slice = get();
      slice.calculateComponentRoles();
    },
    
    calculateComponentRoles: () => {
      const { requirements } = get();
      const newRoles = calculateComponentRoles(requirements);
      set({ componentRoles: newRoles });
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
