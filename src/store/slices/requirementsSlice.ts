
import { StateCreator } from 'zustand';
import { 
  DesignRequirements, 
  ComponentType,
  ComponentRole
} from '@/types/infrastructure';
import { StoreState, RequirementsState } from '../types';
import { 
  calculateComponentRoles as calculateRoles 
} from './requirements/roleCalculator';
import { 
  calculateStorageNodeCapacity
} from './requirements/calculationUtils';
import {
  addDiskToStorageNode as addDisk,
  removeDiskFromStorageNode as removeDisk,
  addGPUToComputeNode as addGPU,
  removeGPUFromComputeNode as removeGPU
} from './requirements/diskAndGPUOperations';
import {
  updateRoleRequiredCount,
  assignComponentToRole as assignComponent,
  getRoleById,
  assignComponentAndCalculateQuantity,
  updateRoleAndCalculation
} from './requirements/roleOperations';
import {
  calculateRequiredQuantity as calculateQuantity
} from './requirements/calculationManager';

export interface RequirementsSlice {
  requirements: DesignRequirements;
  componentRoles: ComponentRole[];
  selectedDisksByRole: Record<string, { diskId: string, quantity: number }[]>;
  selectedGPUsByRole: Record<string, { gpuId: string, quantity: number }[]>;
  selectedCassettesByRole: Record<string, { cassetteId: string, quantity: number }[]>;
  calculationBreakdowns: Record<string, string[]>;
  
  updateRequirements: (newRequirements: Partial<DesignRequirements>) => void;
  calculateComponentRoles: () => void;
  calculateRequiredQuantity: (roleId: string, componentId: string) => number;
  assignComponentToRole: (roleId: string, componentId: string) => void;
  addDiskToStorageNode: (roleId: string, diskId: string, quantity: number) => void;
  removeDiskFromStorageNode: (roleId: string, diskId: string) => void;
  addGPUToComputeNode: (roleId: string, gpuId: string, quantity: number) => void;
  removeGPUFromComputeNode: (roleId: string, gpuId: string) => void;
  addCassetteToPanel: (roleId: string, cassetteId: string, quantity: number) => void;
  removeCassetteFromPanel: (roleId: string, cassetteId: string) => void;
  calculateStorageNodeCapacity: (roleId: string) => number;
  getCalculationBreakdown: (roleId: string) => string[];
}

const defaultRequirements: DesignRequirements = {
  computeRequirements: {
    computeClusters: [],
    controllerNodeCount: 3,
    infrastructureClusterRequired: false,
    infrastructureNodeCount: 3
  },
  storageRequirements: {
    storageClusters: []
  },
  networkRequirements: {
    networkTopology: "Spine-Leaf",
    managementNetwork: "Dual Home",
    ipmiNetwork: "Management converged",
    physicalFirewalls: false,
    leafSwitchesPerAZ: 2,
    dedicatedStorageNetwork: false,
    dedicatedNetworkCoreRacks: true
  },
  physicalConstraints: {
    computeStorageRackQuantity: 16,
    totalAvailabilityZones: 8,
    rackUnitsPerRack: 42,
    powerPerRackWatts: 5000,
    operationalLoadPercentage: 50
  }
};

export const createRequirementsSlice: StateCreator<
  StoreState,
  [],
  [],
  RequirementsSlice
> = (set, get) => {
  return {
    requirements: defaultRequirements,
    componentRoles: [],
    selectedDisksByRole: {},
    selectedGPUsByRole: {},
    selectedCassettesByRole: {},
    calculationBreakdowns: {},
    
    updateRequirements: (newRequirements) => {
      set((state) => ({
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
      const newRoles = calculateRoles(requirements);
      set({ componentRoles: newRoles });
    },
    
    calculateRequiredQuantity: (roleId: string, componentId: string): number => {
      console.log(`Store: calculateRequiredQuantity called for role ${roleId} with component ${componentId}`);
      const state = get();
      
      const { requiredQuantity, calculationSteps } = calculateQuantity(roleId, componentId, state);
      
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
      const state = get();
      
      set((state) => {
        const updatedRoles = assignComponent(state.componentRoles, roleId, componentId);
        
        const { requiredQuantity, calculationSteps } = calculateQuantity(
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
      set((state) => {
        const updatedSelectedDisks = addDisk(roleId, diskId, quantity, state.selectedDisksByRole);
        return { selectedDisksByRole: updatedSelectedDisks };
      });
      
      const state = get();
      const role = getRoleById(state.componentRoles, roleId);
      
      if (role && role.assignedComponentId) {
        set((state) => {
          const { requiredQuantity, calculationSteps } = calculateQuantity(
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
      set((state) => {
        const updatedSelectedDisks = removeDisk(roleId, diskId, state.selectedDisksByRole);
        return { selectedDisksByRole: updatedSelectedDisks };
      });
      
      const state = get();
      const role = getRoleById(state.componentRoles, roleId);
      
      if (role && role.assignedComponentId) {
        set((state) => {
          const { requiredQuantity, calculationSteps } = calculateQuantity(
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
      set((state) => {
        const updatedSelectedGPUs = addGPU(roleId, gpuId, quantity, state.selectedGPUsByRole);
        return { selectedGPUsByRole: updatedSelectedGPUs };
      });
      
      const state = get();
      const role = getRoleById(state.componentRoles, roleId);
      
      if (role && role.assignedComponentId) {
        set((state) => {
          const { requiredQuantity, calculationSteps } = calculateQuantity(
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
      set((state) => {
        const updatedSelectedGPUs = removeGPU(roleId, gpuId, state.selectedGPUsByRole);
        return { selectedGPUsByRole: updatedSelectedGPUs };
      });
      
      const state = get();
      const role = getRoleById(state.componentRoles, roleId);
      
      if (role && role.assignedComponentId) {
        set((state) => {
          const { requiredQuantity, calculationSteps } = calculateQuantity(
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
      set((state) => {
        const currentCassettes = state.selectedCassettesByRole[roleId] || [];
        const existingIndex = currentCassettes.findIndex(c => c.cassetteId === cassetteId);

        let updatedCassettes;
        if (existingIndex >= 0) {
          updatedCassettes = [...currentCassettes];
          updatedCassettes[existingIndex] = {
            ...updatedCassettes[existingIndex],
            quantity: updatedCassettes[existingIndex].quantity + quantity
          };
        } else {
          updatedCassettes = [...currentCassettes, { cassetteId, quantity }];
        }

        return {
          selectedCassettesByRole: {
            ...state.selectedCassettesByRole,
            [roleId]: updatedCassettes
          }
        } as Partial<StoreState>;
      });
    },
    
    removeCassetteFromPanel: (roleId: string, cassetteId: string) => {
      set((state) => {
        const currentCassettes = state.selectedCassettesByRole[roleId] || [];
        const updatedCassettes = currentCassettes.filter(c => c.cassetteId !== cassetteId);

        return {
          selectedCassettesByRole: {
            ...state.selectedCassettesByRole,
            [roleId]: updatedCassettes
          }
        } as Partial<StoreState>;
      });
    }
  };
};
