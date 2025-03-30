
import { StateCreator } from 'zustand';
import { DesignRequirements, DeviceRoleType, NetworkTopology, StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/types/infrastructure';
import { StoreState, RequirementsState } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface RequirementsSlice {
  requirements: DesignRequirements;
  componentRoles: any[];
  selectedDisksByRole: Record<string, { diskId: string, quantity: number }[]>;
  
  updateRequirements: (newRequirements: Partial<DesignRequirements>) => void;
  calculateComponentRoles: () => void;
  calculateRequiredQuantity: (roleId: string, componentId: string) => number;
  assignComponentToRole: (roleId: string, componentId: string) => void;
  addDiskToStorageNode: (roleId: string, diskId: string, quantity: number) => void;
  removeDiskFromStorageNode: (roleId: string, diskId: string) => void;
  calculateStorageNodeCapacity: (roleId: string) => number;
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
      const dedicatedStorageNetwork = getValue(requirements, 'networkRequirements.dedicatedStorageNetwork', false) || false;
      const managementNetwork = getValue(requirements, 'networkRequirements.managementNetwork', 'Dual Home') || 'Dual Home';
      
      // Calculate number of management switches based on availability zones and network type
      const mgmtSwitchesPerAZ = managementNetwork === 'Dual Home' ? 2 : 1;
      const managementSwitchCount = totalAvailabilityZones * mgmtSwitchesPerAZ;
      
      // Calculate number of leaf switches based on AZs and switches per AZ setting
      const leafSwitchCount = totalAvailabilityZones * leafSwitchesPerAZ;
      
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
        }
      ];
      
      // Only add storage nodes if there's storage capacity needed
      if (totalCapacityTB > 0) {
        newRoles.push({
          id: uuidv4(),
          role: 'storageNode',
          description: 'Provides storage resources for the cluster',
          requiredCount: storageAvailabilityZoneQuantity
        });
      }
      
      if (infrastructureClusterRequired) {
        newRoles.push({
          id: uuidv4(),
          role: 'infrastructureNode',
          description: 'Provides infrastructure services for the cluster',
          requiredCount: infrastructureNodeCount
        });
      }
      
      // Add management switches
      newRoles.push({
        id: uuidv4(),
        role: 'managementSwitch',
        description: 'Provides network connectivity for management interfaces',
        requiredCount: managementSwitchCount
      });
      
      // Add appropriate network components based on network topology
      if (networkTopology === 'Spine-Leaf') {
        // Add leaf switches for compute - rename based on topology
        newRoles.push({
          id: uuidv4(),
          role: 'leafSwitch',
          description: 'Provides network connectivity for compute nodes',
          requiredCount: leafSwitchCount
        });
        
        // Only add storage switches if dedicated storage network is enabled
        if (dedicatedStorageNetwork) {
          newRoles.push({
            id: uuidv4(),
            role: 'storageSwitch',
            description: 'Provides network connectivity for storage nodes',
            requiredCount: storageAvailabilityZoneQuantity * 2 // 2 switches per AZ for redundancy
          });
        }
        
        // Add border leaf switches
        newRoles.push({
          id: uuidv4(),
          role: 'borderLeafSwitch',
          description: 'Connects the internal network to external networks',
          requiredCount: 2
        });
        
        // Add spine switches
        newRoles.push({
          id: uuidv4(),
          role: 'spineSwitch',
          description: 'Provides high-speed connectivity between leaf switches',
          requiredCount: 2
        });
      } else {
        // For other topologies like three-tier, we would have different switch types
        // Only add these when network topology is not Spine-Leaf
        newRoles.push({
          id: uuidv4(),
          role: 'torSwitch',
          description: 'Provides top-of-rack switching for servers',
          requiredCount: computeNodeCount
        });
      }
      
      // Only add firewalls if physical firewalls are required
      if (physicalFirewalls) {
        newRoles.push({
          id: uuidv4(),
          role: 'firewall',
          description: 'Provides network security and traffic filtering',
          requiredCount: 2
        });
      }
      
      set({ componentRoles: newRoles });
    },
    
    calculateRequiredQuantity: (roleId: string, componentId: string): number => {
      const state = get();
      const { requirements, componentRoles, selectedDisksByRole } = state;
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
        const poolType = requirements.storageRequirements?.poolType || '3 Replica';
        const maxFillFactor = requirements.storageRequirements?.maxFillFactor || 80;
        
        // If we have disks assigned to this storage node
        const roleDiskConfigs = selectedDisksByRole[roleId] || [];
        
        if (roleDiskConfigs.length > 0) {
          // Calculate total usable capacity per node
          const storageNodeCapacityTiB = sliceMethods.calculateStorageNodeCapacity(roleId);
          
          if (storageNodeCapacityTiB > 0) {
            // Calculate how many nodes we need to meet the total capacity requirement
            // Apply efficiency factors for replication/EC and fill factor
            const poolEfficiencyFactor = StoragePoolEfficiencyFactors[poolType] || (1/3);
            const fillFactorAdjustment = maxFillFactor / 100;
            
            // Convert total required capacity from TB to TiB
            const totalRequiredCapacityTiB = totalCapacityTB * TB_TO_TIB_FACTOR;
            
            // Calculate effective capacity per node after all adjustments
            const effectiveCapacityPerNodeTiB = storageNodeCapacityTiB * poolEfficiencyFactor * fillFactorAdjustment;
            
            // Calculate required node count
            const requiredNodeCount = Math.ceil(totalRequiredCapacityTiB / effectiveCapacityPerNodeTiB);
            
            // Return at least the minimum number of nodes specified by role.requiredCount
            requiredQuantity = Math.max(requiredNodeCount, role.requiredCount);
          }
        }
      }
      
      return requiredQuantity;
    },
    
    calculateStorageNodeCapacity: (roleId: string): number => {
      const state = get();
      const { selectedDisksByRole, componentTemplates } = state;
      
      const roleDiskConfigs = selectedDisksByRole[roleId] || [];
      let totalCapacityTiB = 0;
      
      // Calculate raw capacity in TiB
      roleDiskConfigs.forEach(diskConfig => {
        const disk = componentTemplates.find(c => c.id === diskConfig.diskId);
        if (disk && disk.type === ComponentType.Disk && 'capacityTB' in disk) {
          // Convert TB to TiB and multiply by quantity
          const diskCapacityTiB = disk.capacityTB * TB_TO_TIB_FACTOR * diskConfig.quantity;
          totalCapacityTiB += diskCapacityTiB;
        }
      });
      
      return totalCapacityTiB;
    }
  };
  
  return {
    requirements: defaultRequirements,
    componentRoles: [],
    selectedDisksByRole: {},
    
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
    
    calculateStorageNodeCapacity: sliceMethods.calculateStorageNodeCapacity,
    
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
    },
    
    addDiskToStorageNode: (roleId: string, diskId: string, quantity: number) => {
      set((state) => {
        // Find if this disk is already added to this role
        const currentDisks = state.selectedDisksByRole[roleId] || [];
        const existingDiskIndex = currentDisks.findIndex(d => d.diskId === diskId);
        
        let updatedDisks;
        if (existingDiskIndex >= 0) {
          // Update existing disk quantity
          updatedDisks = [...currentDisks];
          updatedDisks[existingDiskIndex] = { 
            ...updatedDisks[existingDiskIndex], 
            quantity 
          };
        } else {
          // Add new disk
          updatedDisks = [...currentDisks, { diskId, quantity }];
        }
        
        const updatedSelectedDisks = {
          ...state.selectedDisksByRole,
          [roleId]: updatedDisks
        };
        
        return { selectedDisksByRole: updatedSelectedDisks };
      });
      
      // Recalculate storage node quantities after disk changes
      const state = get();
      const role = state.componentRoles.find(r => r.id === roleId);
      
      if (role && role.assignedComponentId) {
        const newQuantity = sliceMethods.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
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
        const currentDisks = state.selectedDisksByRole[roleId] || [];
        const updatedDisks = currentDisks.filter(d => d.diskId !== diskId);
        
        const updatedSelectedDisks = {
          ...state.selectedDisksByRole,
          [roleId]: updatedDisks
        };
        
        return { selectedDisksByRole: updatedSelectedDisks };
      });
      
      // Recalculate storage node quantities after disk changes
      const state = get();
      const role = state.componentRoles.find(r => r.id === roleId);
      
      if (role && role.assignedComponentId) {
        const newQuantity = sliceMethods.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
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
