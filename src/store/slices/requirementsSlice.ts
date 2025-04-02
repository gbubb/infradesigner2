
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
  calculateComputeNodeQuantity,
  calculateStorageNodeQuantity,
  calculateStorageNodeCapacity
} from './requirements/calculationUtils';
import {
  addDiskToStorageNode as addDisk,
  removeDiskFromStorageNode as removeDisk,
  addGPUToComputeNode as addGPU,
  removeGPUFromComputeNode as removeGPU
} from './requirements/diskAndGPUOperations';

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
  // Create a reference to the slice object to use its methods
  const slice = {
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
      
      slice.calculateComponentRoles();
    },
    
    calculateComponentRoles: () => {
      const { requirements } = get();
      const newRoles = calculateRoles(requirements);
      set({ componentRoles: newRoles });
    },
    
    calculateRequiredQuantity: (roleId: string, componentId: string): number => {
      const state = get();
      const { requirements, componentRoles } = state;
      const componentTemplates = state.componentTemplates || [];
      
      const role = componentRoles.find(r => r.id === roleId);
      if (!role) return 0;
      
      const component = componentTemplates.find(c => c.id === componentId);
      if (!component) return 0;
      
      let requiredQuantity = role.requiredCount || 1;
      let calculationSteps: string[] = [];
      
      // Handle compute node quantity calculation
      if (role.role === 'computeNode' || role.role === 'gpuNode') {
        if (!role.clusterInfo) {
          calculationSteps.push(`No cluster info available - using default count of ${requiredQuantity} nodes`);
        } else {
          const computeClusters = requirements.computeRequirements?.computeClusters || [];
          const cluster = computeClusters.find(c => c.id === role.clusterInfo?.clusterId);
          
          if (cluster) {
            const totalAvailabilityZones = requirements.physicalConstraints?.totalAvailabilityZones || 8;
            const result = calculateComputeNodeQuantity(role, component, cluster, totalAvailabilityZones);
            requiredQuantity = result.requiredQuantity;
            calculationSteps = result.calculationSteps;
          } else {
            calculationSteps.push(`Cluster not found - using default count of ${requiredQuantity} nodes`);
          }
        }
      } 
      // Handle storage node quantity calculation
      else if (role.role === 'storageNode') {
        if (role.clusterInfo && role.clusterInfo.clusterId) {
          const storageCluster = requirements.storageRequirements?.storageClusters.find(
            cluster => cluster.id === role.clusterInfo?.clusterId
          );
          
          if (storageCluster) {
            // Use the imported utility function directly
            const storageNodeCapacityTiB = calculateStorageNodeCapacity(
              roleId, 
              state.selectedDisksByRole, 
              componentTemplates
            );
            
            if (storageNodeCapacityTiB > 0) {
              const result = calculateStorageNodeQuantity(role, storageCluster, roleId, storageNodeCapacityTiB);
              requiredQuantity = result.requiredQuantity;
              calculationSteps = result.calculationSteps;
            } else {
              calculationSteps.push(`No capacity calculation available - using default count of ${requiredQuantity} nodes`);
            }
          }
        }
      }
      
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
      set((state) => {
        const updatedRoles = state.componentRoles.map(role => {
          if (role.id === roleId) {
            return {
              ...role,
              assignedComponentId: componentId,
              adjustedRequiredCount: undefined
            };
          }
          return role;
        });
        
        return { componentRoles: updatedRoles };
      });
      
      // Call the calculateRequiredQuantity method directly from the slice
      const newQuantity = slice.calculateRequiredQuantity(roleId, componentId);
      
      set((state) => ({
        componentRoles: state.componentRoles.map(r => {
          if (r.id === roleId) {
            return {
              ...r,
              adjustedRequiredCount: newQuantity
            };
          }
          return r;
        })
      }));
    },
    
    addDiskToStorageNode: (roleId: string, diskId: string, quantity: number) => {
      set((state) => {
        const updatedSelectedDisks = addDisk(roleId, diskId, quantity, state.selectedDisksByRole);
        return { selectedDisksByRole: updatedSelectedDisks };
      });
      
      const state = get();
      const role = state.componentRoles.find(r => r.id === roleId);
      
      if (role && role.assignedComponentId) {
        // Call the calculateRequiredQuantity method directly from the slice
        const newQuantity = slice.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        set((state) => ({
          componentRoles: state.componentRoles.map(r => {
            if (r.id === roleId) {
              return {
                ...r,
                adjustedRequiredCount: newQuantity
              };
            }
            return r;
          })
        }));
      }
    },
    
    removeDiskFromStorageNode: (roleId: string, diskId: string) => {
      set((state) => {
        const updatedSelectedDisks = removeDisk(roleId, diskId, state.selectedDisksByRole);
        return { selectedDisksByRole: updatedSelectedDisks };
      });
      
      const state = get();
      const role = state.componentRoles.find(r => r.id === roleId);
      
      if (role && role.assignedComponentId) {
        // Call the calculateRequiredQuantity method directly from the slice
        const newQuantity = slice.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        set((state) => ({
          componentRoles: state.componentRoles.map(r => {
            if (r.id === roleId) {
              return {
                ...r,
                adjustedRequiredCount: newQuantity
              };
            }
            return r;
          })
        }));
      }
    },
    
    addGPUToComputeNode: (roleId: string, gpuId: string, quantity: number) => {
      set((state) => {
        const updatedSelectedGPUs = addGPU(roleId, gpuId, quantity, state.selectedGPUsByRole);
        return { selectedGPUsByRole: updatedSelectedGPUs };
      });
      
      const state = get();
      const role = state.componentRoles.find(r => r.id === roleId);
      
      if (role && role.assignedComponentId) {
        // Call the calculateRequiredQuantity method directly from the slice
        const newQuantity = slice.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        set((state) => ({
          componentRoles: state.componentRoles.map(r => {
            if (r.id === roleId) {
              return {
                ...r,
                adjustedRequiredCount: newQuantity
              };
            }
            return r;
          })
        }));
      }
    },
    
    removeGPUFromComputeNode: (roleId: string, gpuId: string) => {
      set((state) => {
        const updatedSelectedGPUs = removeGPU(roleId, gpuId, state.selectedGPUsByRole);
        return { selectedGPUsByRole: updatedSelectedGPUs };
      });
      
      const state = get();
      const role = state.componentRoles.find(r => r.id === roleId);
      
      if (role && role.assignedComponentId) {
        // Call the calculateRequiredQuantity method directly from the slice
        const newQuantity = slice.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        set((state) => ({
          componentRoles: state.componentRoles.map(r => {
            if (r.id === roleId) {
              return {
                ...r,
                adjustedRequiredCount: newQuantity
              };
            }
            return r;
          })
        }));
      }
    }
  };
  
  return slice;
};
