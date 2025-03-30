import { StateCreator } from 'zustand';
import { DesignRequirements } from '@/types/infrastructure';
import { StoreState } from '../types';
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
    totalVCPUs: 16,
    totalMemoryTB: 0.128,
    availabilityZoneRedundancy: 'N+1',
    overcommitRatio: 2
  },
  storageRequirements: {
    totalCapacityTB: 100,
    availabilityZoneQuantity: 2,
    poolType: 'Erasure Coding 4+2',
    maxFillFactor: 75,
    selectedDiskIds: [],
    diskQuantities: {}
  },
  networkRequirements: {
    networkTopology: 'Spine-Leaf',
    managementNetwork: 'Single connection',
    ipmiNetwork: 'Management converged',
    physicalFirewalls: true,
    leafSwitchesPerAZ: 2,
    dedicatedStorageNetwork: true,
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
> = (set, get) => ({
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
    get().calculateComponentRoles(); // Recalculate roles when requirements change
  },
  
  calculateComponentRoles: () => {
    const { requirements } = get();
    
    // Helper function to safely access nested properties
    const getValue = <T>(obj: any, path: string, defaultValue: T): T => {
      try {
        return path.split('.').reduce((o, key) => o[key], obj) || defaultValue;
      } catch (error) {
        return defaultValue;
      }
    };
    
    const totalVCPUs = getValue(requirements, 'computeRequirements.totalVCPUs', 16) || 16;
    const totalMemoryTB = getValue(requirements, 'computeRequirements.totalMemoryTB', 0.128) || 0.128;
    const availabilityZoneRedundancy = getValue(requirements, 'computeRequirements.availabilityZoneRedundancy', 'N+1') || 'N+1';
    const totalAvailabilityZones = getValue(requirements, 'physicalConstraints.totalAvailabilityZones', 2) || 2;
    
    // Determine compute node count based on redundancy
    let computeNodeCount = totalAvailabilityZones;
    if (availabilityZoneRedundancy === 'N+1') {
      computeNodeCount = totalAvailabilityZones + 1;
    } else if (availabilityZoneRedundancy === 'N+2') {
      computeNodeCount = totalAvailabilityZones + 2;
    }
    
    // Storage requirements
    const totalCapacityTB = getValue(requirements, 'storageRequirements.totalCapacityTB', 100) || 100;
    const storageAvailabilityZoneQuantity = getValue(requirements, 'storageRequirements.availabilityZoneQuantity', 2) || 2;
    
    // Network requirements
    const networkTopology = getValue(requirements, 'networkRequirements.networkTopology', 'Spine-Leaf') || 'Spine-Leaf';
    const physicalFirewalls = getValue(requirements, 'networkRequirements.physicalFirewalls', true) || true;
    const leafSwitchesPerAZ = getValue(requirements, 'networkRequirements.leafSwitchesPerAZ', 2) || 2;
    
    // Define roles based on requirements
    const newRoles = [
      {
        id: uuidv4(),
        role: 'controllerNode',
        description: 'Handles cluster management and monitoring',
        requiredCount: totalAvailabilityZones // One controller node per availability zone
      },
      {
        id: uuidv4(),
        role: 'computeNode',
        description: 'Provides compute resources for the cluster',
        requiredCount: computeNodeCount // Determined by redundancy
      },
      {
        id: uuidv4(),
        role: 'storageNode',
        description: 'Provides storage resources for the cluster',
        requiredCount: storageAvailabilityZoneQuantity // One storage node per availability zone
      },
      {
        id: uuidv4(),
        role: 'managementSwitch',
        description: 'Provides network connectivity for management interfaces',
        requiredCount: 1 // Assuming one management switch for the entire infrastructure
      },
      {
        id: uuidv4(),
        role: 'computeSwitch',
        description: 'Provides network connectivity for compute nodes',
        requiredCount: computeNodeCount // One switch per compute node
      },
      {
        id: uuidv4(),
        role: 'storageSwitch',
        description: 'Provides network connectivity for storage nodes',
        requiredCount: storageAvailabilityZoneQuantity // One switch per storage node
      },
      {
        id: uuidv4(),
        role: 'borderLeafSwitch',
        description: 'Connects the internal network to external networks',
        requiredCount: 2 // Assuming two border leaf switches for redundancy
      },
      {
        id: uuidv4(),
        role: 'spineSwitch',
        description: 'Provides high-speed connectivity between leaf switches',
        requiredCount: networkTopology === 'Spine-Leaf' ? 2 : 0 // Two spine switches for spine-leaf topology
      },
      {
        id: uuidv4(),
        role: 'torSwitch',
        description: 'Provides top-of-rack switching for servers',
        requiredCount: networkTopology === 'Three-Tier' ? computeNodeCount : 0 // One ToR switch per server in three-tier topology
      },
      {
        id: uuidv4(),
        role: 'firewall',
        description: 'Provides network security and traffic filtering',
        requiredCount: physicalFirewalls ? 2 : 0 // Two firewalls for redundancy if physical firewalls are required
      }
    ];
    
    set({ componentRoles: newRoles });
  },
  
  calculateRequiredQuantity: (roleId: string, componentId: string): number => {
    const { requirements, componentRoles, componentTemplates } = get();
    
    // Find the role
    const role = componentRoles.find(r => r.id === roleId);
    if (!role) return 0;
    
    // Find the selected component
    const component = componentTemplates.find(c => c.id === componentId);
    if (!component) return 0;
    
    let requiredQuantity = role.requiredCount || 1; // Default to 1 if base requirement is not set
    
    // Adjust quantity based on component and design requirements
    if (role.role === 'computeNode') {
      const totalVCPUs = requirements.computeRequirements?.totalVCPUs || 16;
      const totalMemoryTB = requirements.computeRequirements?.totalMemoryTB || 0.128;
      
      // Ensure component has the necessary properties
      if ('cpuCount' in component && 'coreCount' in component && 'memoryGB' in component) {
        const vCPUsPerNode = component.cpuCount * component.coreCount;
        const memoryGBPerNode = component.memoryGB;
        
        // Calculate the number of nodes required based on vCPU and memory requirements
        const requiredNodesByCPU = Math.ceil(totalVCPUs / vCPUsPerNode);
        const requiredNodesByMemory = Math.ceil((totalMemoryTB * 1024) / memoryGBPerNode); // Convert TB to GB
        
        // Take the maximum of the two calculations to ensure both vCPU and memory requirements are met
        requiredQuantity = Math.max(requiredNodesByCPU, requiredNodesByMemory);
      }
    } else if (role.role === 'storageNode') {
      const totalCapacityTB = requirements.storageRequirements?.totalCapacityTB || 100;
      
      // Ensure component has the necessary properties
      if ('capacityTB' in component) {
        const capacityTBPerNode = component.capacityTB;
        
        // Calculate the number of nodes required based on storage capacity
        requiredQuantity = Math.ceil(totalCapacityTB / capacityTBPerNode);
      }
    }
    
    return requiredQuantity;
  },
  
  assignComponentToRole: (roleId: string, componentId: string) => {
    set((state) => {
      const updatedRoles = state.componentRoles.map(role => {
        if (role.id === roleId) {
          return {
            ...role,
            assignedComponentId: componentId,
            adjustedRequiredCount: undefined // Reset adjusted count when component changes
          };
        }
        return role;
      });
      
      return { componentRoles: updatedRoles };
    });
    
    // Trigger recalculation of quantities
    const state = get();
    const role = state.componentRoles.find(r => r.id === roleId);
    if (role) {
      const newQuantity = state.calculateRequiredQuantity(roleId, componentId);
      
      // Update the role with the new quantity
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
});
