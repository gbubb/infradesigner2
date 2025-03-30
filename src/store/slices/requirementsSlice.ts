import { StateCreator } from 'zustand';
import { DesignRequirements, DeviceRoleType, NetworkTopology } from '@/types/infrastructure';
import { StoreState, RequirementsState } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface RequirementsSlice {
  requirements: DesignRequirements;
  componentRoles: any[];
  
  updateRequirements: (newRequirements: Partial<DesignRequirements>) => void;
  calculateComponentRoles: () => void;
  calculateRequiredQuantity: (roleId: string, componentId: string) => number;
  assignComponentToRole: (roleId: string, componentId: string) => void;
}

const defaultRequirements: DesignRequirements = {
  computeRequirements: {
    totalVCPUs: 5000,
    totalMemoryTB: 30,
    availabilityZoneRedundancy: 'N+1',
    overcommitRatio: 2,
    controllerNodeCount: 3,
    infrastructureClusterRequired: false,
    infrastructureNodeCount: 3
  },
  storageRequirements: {
    totalCapacityTB: 100,
    availabilityZoneQuantity: 3,
    poolType: '3 Replica',
    maxFillFactor: 80,
    selectedDiskIds: [],
    diskQuantities: {}
  },
  networkRequirements: {
    networkTopology: 'Spine-Leaf',
    managementNetwork: 'Dual Home',
    ipmiNetwork: 'Management converged',
    physicalFirewalls: false,
    leafSwitchesPerAZ: 2,
    dedicatedStorageNetwork: false,
    dedicatedNetworkCoreRacks: true
  },
  physicalConstraints: {
    computeStorageRackQuantity: 2,
    totalAvailabilityZones: 2,
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
  const sliceMethods = {
    calculateComponentRoles: () => {
      const { requirements } = get();
      
      const getValue = <T>(obj: any, path: string, defaultValue: T): T => {
        try {
          return path.split('.').reduce((o, key) => o[key], obj) || defaultValue;
        } catch (error) {
          return defaultValue;
        }
      };
      
      const totalVCPUs = getValue(requirements, 'computeRequirements.totalVCPUs', 5000) || 5000;
      const totalMemoryTB = getValue(requirements, 'computeRequirements.totalMemoryTB', 30) || 30;
      const availabilityZoneRedundancy = getValue(requirements, 'computeRequirements.availabilityZoneRedundancy', 'N+1') || 'N+1';
      const totalAvailabilityZones = getValue(requirements, 'physicalConstraints.totalAvailabilityZones', 2) || 2;
      const controllerNodeCount = getValue(requirements, 'computeRequirements.controllerNodeCount', 3) || 3;
      const infrastructureClusterRequired = getValue(requirements, 'computeRequirements.infrastructureClusterRequired', false) || false;
      const infrastructureNodeCount = getValue(requirements, 'computeRequirements.infrastructureNodeCount', 3) || 3;
      
      let computeNodeCount = totalAvailabilityZones;
      if (availabilityZoneRedundancy === 'N+1') {
        computeNodeCount = totalAvailabilityZones + 1;
      } else if (availabilityZoneRedundancy === 'N+2') {
        computeNodeCount = totalAvailabilityZones + 2;
      }
      
      const totalCapacityTB = getValue(requirements, 'storageRequirements.totalCapacityTB', 100) || 100;
      const storageAvailabilityZoneQuantity = getValue(requirements, 'storageRequirements.availabilityZoneQuantity', 3) || 3;
      
      const networkTopology = getValue(requirements, 'networkRequirements.networkTopology', 'Spine-Leaf') || 'Spine-Leaf';
      const physicalFirewalls = getValue(requirements, 'networkRequirements.physicalFirewalls', false) || false;
      const leafSwitchesPerAZ = getValue(requirements, 'networkRequirements.leafSwitchesPerAZ', 2) || 2;
      
      const newRoles = [
        {
          id: uuidv4(),
          role: 'controllerNode',
          description: 'Handles cluster management and monitoring',
          requiredCount: controllerNodeCount
        },
        {
          id: uuidv4(),
          role: 'computeNode',
          description: 'Provides compute resources for the cluster',
          requiredCount: computeNodeCount
        },
        {
          id: uuidv4(),
          role: 'storageNode',
          description: 'Provides storage resources for the cluster',
          requiredCount: storageAvailabilityZoneQuantity
        }
      ];
      
      if (infrastructureClusterRequired) {
        newRoles.push({
          id: uuidv4(),
          role: 'infrastructureNode',
          description: 'Provides infrastructure services for the cluster',
          requiredCount: infrastructureNodeCount
        });
      }
      
      newRoles.push(
        {
          id: uuidv4(),
          role: 'managementSwitch',
          description: 'Provides network connectivity for management interfaces',
          requiredCount: 1
        },
        {
          id: uuidv4(),
          role: 'computeSwitch',
          description: 'Provides network connectivity for compute nodes',
          requiredCount: computeNodeCount
        },
        {
          id: uuidv4(),
          role: 'storageSwitch',
          description: 'Provides network connectivity for storage nodes',
          requiredCount: storageAvailabilityZoneQuantity
        },
        {
          id: uuidv4(),
          role: 'borderLeafSwitch',
          description: 'Connects the internal network to external networks',
          requiredCount: 2
        },
        {
          id: uuidv4(),
          role: 'spineSwitch',
          description: 'Provides high-speed connectivity between leaf switches',
          requiredCount: networkTopology === 'Spine-Leaf' ? 2 : 0
        },
        {
          id: uuidv4(),
          role: 'torSwitch',
          description: 'Provides top-of-rack switching for servers',
          requiredCount: networkTopology !== 'Spine-Leaf' ? computeNodeCount : 0
        },
        {
          id: uuidv4(),
          role: 'firewall',
          description: 'Provides network security and traffic filtering',
          requiredCount: physicalFirewalls ? 2 : 0
        }
      );
      
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
      
      if (role.role === 'computeNode') {
        const totalVCPUs = requirements.computeRequirements?.totalVCPUs || 5000;
        const totalMemoryTB = requirements.computeRequirements?.totalMemoryTB || 30;
        
        if ('cpuCount' in component && 'coreCount' in component && 'memoryGB' in component) {
          const vCPUsPerNode = component.cpuCount * component.coreCount;
          const memoryGBPerNode = component.memoryGB;
          
          const requiredNodesByCPU = Math.ceil(totalVCPUs / vCPUsPerNode);
          const requiredNodesByMemory = Math.ceil((totalMemoryTB * 1024) / memoryGBPerNode);
          
          requiredQuantity = Math.max(requiredNodesByCPU, requiredNodesByMemory);
        }
      } else if (role.role === 'storageNode') {
        const totalCapacityTB = requirements.storageRequirements?.totalCapacityTB || 100;
        
        if ('capacityTB' in component) {
          const capacityTBPerNode = component.capacityTB;
          
          requiredQuantity = Math.ceil(totalCapacityTB / capacityTBPerNode);
        }
      }
      
      return requiredQuantity;
    }
  };
  
  return {
    requirements: defaultRequirements,
    componentRoles: [],
    
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
      
      sliceMethods.calculateComponentRoles();
    },
    
    calculateComponentRoles: sliceMethods.calculateComponentRoles,
    
    calculateRequiredQuantity: sliceMethods.calculateRequiredQuantity,
    
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
      
      const state = get();
      const role = state.componentRoles.find(r => r.id === roleId);
      
      if (role) {
        const newQuantity = sliceMethods.calculateRequiredQuantity(roleId, componentId);
        
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
};
