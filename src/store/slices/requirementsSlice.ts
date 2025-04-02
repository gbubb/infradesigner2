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
  getRoleById
} from './requirements/roleOperations';
import {
  calculateRequiredQuantity as calculateQuantity
} from './requirements/calculationManager';

export interface RequirementsSlice {
  requirements: DesignRequirements;
  componentRoles: ComponentRole[];
  selectedDisksByRole: Record<string, { diskId: string, quantity: number }[]>;
  selectedGPUsByRole: Record<string, { gpuId: string, quantity: number }[]>;
  calculationBreakdowns: Record<string, string[]>;
  
  updateRequirements: (newRequirements: Partial<DesignRequirements>) => void;
  calculateComponentRoles: () => void;
  calculateRequiredQuantity: (roleId: string, componentId: string) => number;
  assignComponentToRole: (roleId: string, componentId: string) => void;
  addDiskToStorageNode: (roleId: string, diskId: string, quantity: number) => void;
  removeDiskFromStorageNode: (roleId: string, diskId: string) => void;
  addGPUToComputeNode: (roleId: string, gpuId: string, quantity: number) => void;
  removeGPUFromComputeNode: (roleId: string, gpuId: string) => void;
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
    powerPerRackWatts: 5000
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
      const state = get();
      
      // Calculate and get calculation details
      const { requiredQuantity, calculationSteps } = calculateQuantity(roleId, componentId, state);
      
      // Save calculation steps to the store
      set(state => ({
        calculationBreakdowns: {
          ...state.calculationBreakdowns,
          [roleId]: calculationSteps
        }
      }));
      
      return requiredQuantity;
    },
    
    calculateStorageNodeCapacity: (roleId: string): number => {
      const state = get();
      return calculateStorageNodeCapacity(roleId, state.selectedDisksByRole, state.componentTemplates || []);
    },
    
    getCalculationBreakdown: (roleId: string): string[] => {
      return get().calculationBreakdowns[roleId] || [];
    },
    
    assignComponentToRole: (roleId: string, componentId: string) => {
      // Update role with assigned component
      set((state) => {
        const updatedRoles = assignComponent(state.componentRoles, roleId, componentId);
        return { componentRoles: updatedRoles };
      });
      
      // Calculate new quantity
      const slice = get();
      const newQuantity = slice.calculateRequiredQuantity(roleId, componentId);
      
      // Update role with new quantity
      set((state) => ({
        componentRoles: updateRoleRequiredCount(state.componentRoles, roleId, newQuantity)
      }));
    },
    
    addDiskToStorageNode: (roleId: string, diskId: string, quantity: number) => {
      // Update disks
      set((state) => {
        const updatedSelectedDisks = addDisk(roleId, diskId, quantity, state.selectedDisksByRole);
        return { selectedDisksByRole: updatedSelectedDisks };
      });
      
      // Recalculate quantity if component is assigned
      const state = get();
      const role = getRoleById(state.componentRoles, roleId);
      
      if (role && role.assignedComponentId) {
        const slice = get();
        const newQuantity = slice.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        set((state) => ({
          componentRoles: updateRoleRequiredCount(state.componentRoles, roleId, newQuantity)
        }));
      }
    },
    
    removeDiskFromStorageNode: (roleId: string, diskId: string) => {
      // Update disks
      set((state) => {
        const updatedSelectedDisks = removeDisk(roleId, diskId, state.selectedDisksByRole);
        return { selectedDisksByRole: updatedSelectedDisks };
      });
      
      // Recalculate quantity if component is assigned
      const state = get();
      const role = getRoleById(state.componentRoles, roleId);
      
      if (role && role.assignedComponentId) {
        const slice = get();
        const newQuantity = slice.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        set((state) => ({
          componentRoles: updateRoleRequiredCount(state.componentRoles, roleId, newQuantity)
        }));
      }
    },
    
    addGPUToComputeNode: (roleId: string, gpuId: string, quantity: number) => {
      // Update GPUs
      set((state) => {
        const updatedSelectedGPUs = addGPU(roleId, gpuId, quantity, state.selectedGPUsByRole);
        return { selectedGPUsByRole: updatedSelectedGPUs };
      });
      
      // Recalculate quantity if component is assigned
      const state = get();
      const role = getRoleById(state.componentRoles, roleId);
      
      if (role && role.assignedComponentId) {
        const slice = get();
        const newQuantity = slice.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        set((state) => ({
          componentRoles: updateRoleRequiredCount(state.componentRoles, roleId, newQuantity)
        }));
      }
    },
    
    removeGPUFromComputeNode: (roleId: string, gpuId: string) => {
      // Update GPUs
      set((state) => {
        const updatedSelectedGPUs = removeGPU(roleId, gpuId, state.selectedGPUsByRole);
        return { selectedGPUsByRole: updatedSelectedGPUs };
      });
      
      // Recalculate quantity if component is assigned
      const state = get();
      const role = getRoleById(state.componentRoles, roleId);
      
      if (role && role.assignedComponentId) {
        const slice = get();
        const newQuantity = slice.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        set((state) => ({
          componentRoles: updateRoleRequiredCount(state.componentRoles, roleId, newQuantity)
        }));
      }
    }
  };
};
