
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ComponentRole, DesignRequirements, ServerRole, SwitchRole } from '@/types/infrastructure';
import { StoreState } from '../types';
import { allComponentTemplates } from '@/data/componentData';

export interface RequirementsSlice {
  // Design requirements
  requirements: DesignRequirements;
  // Component roles based on requirements
  componentRoles: ComponentRole[];
  
  // Define requirements and constraints
  updateRequirements: (requirements: Partial<DesignRequirements>) => void;
  
  // Calculate required components based on requirements
  calculateComponentRoles: () => void;
  
  // Assign components to roles
  assignComponentToRole: (roleId: string, componentId: string) => void;
  
  // Calculate quantity based on component specs
  calculateRequiredQuantity: (roleId: string, componentId: string) => number;
}

export const createRequirementsSlice: StateCreator<
  StoreState,
  [],
  [],
  RequirementsSlice
> = (set, get) => {
  // Define the calculateRequiredQuantity function separately to avoid circular references
  const calculateRequiredQuantity = (roleId: string, componentId: string, state: StoreState): number => {
    const role = state.componentRoles.find(r => r.id === roleId);
    
    // Find the component from all available sources (templates and custom components)
    const component = state.componentTemplates.find(c => c.id === componentId);
    
    if (!role || !component) return role?.requiredCount || 0;
    
    // Default to the base required count
    let adjustedCount = role.requiredCount;
    
    // Apply capacity factors for different component types
    if (role.role === 'computeNode' && component.type === 'server') {
      const totalVCPUs = state.requirements.computeRequirements.totalVCPUs || 0;
      const totalMemoryTB = state.requirements.computeRequirements.totalMemoryTB || 0;
      const totalMemoryGB = totalMemoryTB * 1024; // Convert TB to GB
      
      // Calculate based on CPU requirements
      // Extract CPU data handling both property naming conventions
      const cpuSockets = component.cpuSockets || ('cpuCount' in component ? component.cpuCount : 1);
      const coresPerSocket = component.cpuCoresPerSocket || ('coreCount' in component ? component.coreCount : 0);
      const totalCoresPerServer = cpuSockets * coresPerSocket;
      
      // Get memory per server - handle different property names
      const memoryPerServerGB = component.memoryCapacity || ('memoryGB' in component ? component.memoryGB : 0);
      
      // Overcommit ratio
      const overcommitRatio = state.requirements.computeRequirements.overcommitRatio || 1;
      
      // Calculate effective vCPUs
      const effectiveVCPUsPerServer = totalCoresPerServer * overcommitRatio;
      
      // Calculate AZ distribution
      const azCount = state.requirements.physicalConstraints.totalAvailabilityZones || 1;
      
      // Calculate nodes needed for CPU requirements
      let cpuBasedNodes = 0;
      if (effectiveVCPUsPerServer > 0) {
        // Calculate total nodes required
        const rawNodeCount = Math.ceil(totalVCPUs / effectiveVCPUsPerServer);
        
        // Ensure the node count is divisible by AZ count
        cpuBasedNodes = Math.ceil(rawNodeCount / azCount) * azCount;
      }
      
      // Calculate nodes needed for memory requirements
      let memoryBasedNodes = 0;
      if (memoryPerServerGB > 0) {
        // Calculate total nodes required
        const rawNodeCount = Math.ceil(totalMemoryGB / memoryPerServerGB);
        
        // Ensure the node count is divisible by AZ count
        memoryBasedNodes = Math.ceil(rawNodeCount / azCount) * azCount;
      }
      
      // Use the larger of CPU or memory based requirements
      adjustedCount = Math.max(cpuBasedNodes, memoryBasedNodes);
      
      // Apply availability zone redundancy if required
      const redundancy = state.requirements.computeRequirements.availabilityZoneRedundancy;
      if (redundancy === 'N+1') {
        adjustedCount += azCount; // Add 1 node per AZ
      } else if (redundancy === 'N+2') {
        adjustedCount += (azCount * 2); // Add 2 nodes per AZ
      }
    } else if (role.role === 'storageNode' && component.type === 'server') {
      const totalCapacity = state.requirements.storageRequirements.totalCapacityTB || 0;
      const serverCapacity = (component as any).storageCapacityTB || 0;
      
      if (serverCapacity > 0) {
        // Calculate raw capacity needed based on storage pool type
        let capacityMultiplier = 1;
        const poolType = state.requirements.storageRequirements.poolType;
        
        if (poolType === '3 Replica') {
          capacityMultiplier = 3; // Need 3x the capacity for 3 replicas
        } else if (poolType === '2 Replica') {
          capacityMultiplier = 2; // Need 2x the capacity for 2 replicas
        } else if (poolType === 'Erasure Coding 4+2') {
          capacityMultiplier = 1.5; // EC 4+2 has ~1.5x overhead
        } else if (poolType === 'Erasure Coding 8+3') {
          capacityMultiplier = 1.375; // EC 8+3 has ~1.375x overhead
        } else if (poolType === 'Erasure Coding 8+4') {
          capacityMultiplier = 1.5; // EC 8+4 has ~1.5x overhead
        } else if (poolType === 'Erasure Coding 10+4') {
          capacityMultiplier = 1.4; // EC 10+4 has ~1.4x overhead
        }
        
        const rawCapacityNeeded = totalCapacity * capacityMultiplier;
        
        // Calculate AZ distribution
        const azCount = state.requirements.storageRequirements.availabilityZoneQuantity || 1;
        
        // Calculate raw count and ensure it's divisible by AZ count
        const rawNodeCount = Math.ceil(rawCapacityNeeded / serverCapacity);
        adjustedCount = Math.ceil(rawNodeCount / azCount) * azCount;
        
        // Apply availability zone distribution if specified
        if (azCount > 1) {
          // Ensure minimum nodes per AZ for the storage technology
          const minNodesPerAZ = 3; // Most storage systems need min 3 nodes
          adjustedCount = Math.max(adjustedCount, azCount * minNodesPerAZ);
        }
      }
    } else if (role.role === 'managementSwitch' && component.type === 'switch') {
      // Calculate management switch quantity
      const azCount = state.requirements.physicalConstraints.totalAvailabilityZones || 1;
      const dualHome = state.requirements.networkRequirements.managementNetwork === 'Dual Home';
      
      // Each AZ gets at least 1 management switch, 2 if dual home
      adjustedCount = azCount * (dualHome ? 2 : 1);
    } else if (role.role === 'spineSwitch' && component.type === 'switch') {
      // Calculate spine switch quantity - minimum 2 for redundancy
      if (state.requirements.networkRequirements.networkTopology === 'Spine-Leaf') {
        adjustedCount = 2; // Minimum for redundancy
        
        // Add more spine switches if we have many leaf switches
        const leafCount = state.componentRoles.find(r => r.role === 'computeSwitch')?.adjustedRequiredCount || 0;
        if (leafCount > 4) {
          adjustedCount = Math.min(4, Math.ceil(leafCount / 4) * 2); // Add more in pairs
        }
      } else {
        adjustedCount = 0; // No spine switches for other topologies
      }
    } else if (role.role === 'computeSwitch' && component.type === 'switch') {
      // Calculate compute switch quantity
      const azCount = state.requirements.physicalConstraints.totalAvailabilityZones || 1;
      
      // If user has set a specific number of leaf switches per AZ in spine-leaf topology
      if (state.requirements.networkRequirements.networkTopology === 'Spine-Leaf' && 
          state.requirements.networkRequirements.leafSwitchesPerAZ) {
        const leafSwitchesPerAZ = state.requirements.networkRequirements.leafSwitchesPerAZ || 2;
        // Multiply by number of AZs
        adjustedCount = leafSwitchesPerAZ * azCount;
        return adjustedCount;
      }
      
      // Calculate total server connections
      let totalServerPorts = 0;
      
      // For compute switches, count ports from compute nodes
      const computeRoles = state.componentRoles.find(r => r.role === 'computeNode');
      const computeComponentId = computeRoles?.assignedComponentId;
      
      if (computeComponentId) {
        const computeComponent = state.componentTemplates.find(c => c.id === computeComponentId);
        if (computeComponent && computeComponent.type === 'server') {
          const portsPerServer = (computeComponent as any).portsConsumedQuantity || 2; // Default to 2 ports per server
          const serverCount = computeRoles?.adjustedRequiredCount || 0;
          totalServerPorts = portsPerServer * serverCount;
        }
      }
      
      // If dedicated storage network is disabled, add storage node ports too
      if (state.requirements.networkRequirements.dedicatedStorageNetwork !== true) {
        const storageRoles = state.componentRoles.find(r => r.role === 'storageNode');
        const storageComponentId = storageRoles?.assignedComponentId;
        
        if (storageComponentId) {
          const storageComponent = state.componentTemplates.find(c => c.id === storageComponentId);
          if (storageComponent && storageComponent.type === 'server') {
            const portsPerServer = (storageComponent as any).portsConsumedQuantity || 2; // Default to 2 ports per server
            const serverCount = storageRoles?.adjustedRequiredCount || 0;
            totalServerPorts += portsPerServer * serverCount;
          }
        }
      }
      
      // Calculate number of switches needed
      if (totalServerPorts > 0 && component.type === 'switch') {
        const portsPerSwitch = (component as any).portsProvidedQuantity || (component as any).portCount || 0;
        
        if (portsPerSwitch > 0) {
          // Reserve ports for uplinks - typically 25% for leaf switches
          const usablePortsPerSwitch = Math.floor(portsPerSwitch * 0.75);
          
          // Calculate raw switch count
          const rawSwitchCount = Math.ceil(totalServerPorts / usablePortsPerSwitch);
          
          // Each AZ gets a minimum of 2 switches for redundancy, and more if needed
          const switchesPerAZ = Math.max(2, Math.ceil(rawSwitchCount / azCount));
          adjustedCount = switchesPerAZ * azCount;
        } else {
          // Default to 2 switches per AZ if we can't calculate
          adjustedCount = 2 * azCount;
        }
      } else {
        // Default to 2 switches per AZ if we can't calculate
        adjustedCount = 2 * azCount;
      }
    } else if (role.role === 'storageSwitch' && component.type === 'switch') {
      // Only calculate storage switches if dedicated storage network is enabled
      if (state.requirements.networkRequirements.dedicatedStorageNetwork === true) {
        const azCount = state.requirements.physicalConstraints.totalAvailabilityZones || 1;
        
        // Calculate total server connections
        let totalServerPorts = 0;
        
        // For storage switches, count ports from storage nodes
        const storageRoles = state.componentRoles.find(r => r.role === 'storageNode');
        const storageComponentId = storageRoles?.assignedComponentId;
        
        if (storageComponentId) {
          const storageComponent = state.componentTemplates.find(c => c.id === storageComponentId);
          if (storageComponent && storageComponent.type === 'server') {
            const portsPerServer = (storageComponent as any).portsConsumedQuantity || 2; // Default to 2 ports per server
            const serverCount = storageRoles?.adjustedRequiredCount || 0;
            totalServerPorts = portsPerServer * serverCount;
          }
        }
        
        // Calculate number of switches needed
        if (totalServerPorts > 0 && component.type === 'switch') {
          const portsPerSwitch = (component as any).portsProvidedQuantity || (component as any).portCount || 0;
          
          if (portsPerSwitch > 0) {
            // Reserve ports for uplinks - typically 25% for leaf switches
            const usablePortsPerSwitch = Math.floor(portsPerSwitch * 0.75);
            
            // Calculate raw switch count
            const rawSwitchCount = Math.ceil(totalServerPorts / usablePortsPerSwitch);
            
            // Each AZ gets a minimum of 2 switches for redundancy, and more if needed
            const switchesPerAZ = Math.max(2, Math.ceil(rawSwitchCount / azCount));
            adjustedCount = switchesPerAZ * azCount;
          } else {
            // Default to 2 switches per AZ if we can't calculate
            adjustedCount = 2 * azCount;
          }
        } else {
          // Default to 2 switches per AZ if we can't calculate
          adjustedCount = 2 * azCount;
        }
      } else {
        // If dedicated storage network is not enabled, no storage switches are needed
        adjustedCount = 0;
      }
    }
    
    // Consider component's capacity factor if defined
    if (component.capacityFactor && component.capacityFactor > 0) {
      adjustedCount = Math.ceil(adjustedCount / component.capacityFactor);
    }
    
    // Always ensure a minimum of the original required count
    // This handles cases where calculations might result in fewer components than needed
    return Math.max(adjustedCount, role.requiredCount);
  };

  return {
    requirements: {
      computeRequirements: {},
      storageRequirements: {},
      networkRequirements: {
        physicalFirewalls: false,
        dedicatedStorageNetwork: false,
        dedicatedNetworkCoreRacks: false,
        leafSwitchesPerAZ: 2,
      },
      physicalConstraints: {},
    },
    componentRoles: [],

    updateRequirements: (newRequirements) => {
      set((state) => ({
        requirements: {
          ...state.requirements,
          computeRequirements: {
            ...state.requirements.computeRequirements,
            ...newRequirements.computeRequirements,
          },
          storageRequirements: {
            ...state.requirements.storageRequirements,
            ...newRequirements.storageRequirements,
          },
          networkRequirements: {
            ...state.requirements.networkRequirements,
            ...newRequirements.networkRequirements,
          },
          physicalConstraints: {
            ...state.requirements.physicalConstraints,
            ...newRequirements.physicalConstraints,
          },
        },
      }));
    },
    
    calculateComponentRoles: () => {
      set((state) => {
        const { requirements } = state;
        const roles: ComponentRole[] = [];
        
        // Define control nodes (always 3 for HA)
        roles.push({
          id: uuidv4(),
          role: 'controllerNode',
          description: 'Controller nodes run management services',
          requiredCount: 3,
          adjustedRequiredCount: 3,
        });
        
        // Calculate compute nodes - but only if we have requirements
        // Don't set a default count without component selection
        if (requirements.computeRequirements.totalVCPUs) {
          roles.push({
            id: uuidv4(),
            role: 'computeNode',
            description: 'Compute nodes provide CPU and memory resources',
            requiredCount: 0, // Don't predefine a count, it will be calculated when component is selected
            adjustedRequiredCount: 0,
          });
        }
        
        // Calculate storage nodes
        if (requirements.storageRequirements.totalCapacityTB) {
          // Use a standard ratio of 10TB per node as default if no component selected
          const storageCount = Math.ceil(requirements.storageRequirements.totalCapacityTB / 10);
          roles.push({
            id: uuidv4(),
            role: 'storageNode',
            description: 'Storage nodes provide distributed storage capacity',
            requiredCount: storageCount,
            adjustedRequiredCount: storageCount,
          });
        }
        
        // Network switches - simple topology with redundancy
        // Management switch pair (always have at least 1 per AZ, 2 if dual home)
        const azCount = requirements.physicalConstraints.totalAvailabilityZones || 1;
        const dualHome = requirements.networkRequirements.managementNetwork === 'Dual Home';
        roles.push({
          id: uuidv4(),
          role: 'managementSwitch',
          description: 'Switches for management network traffic',
          requiredCount: azCount * (dualHome ? 2 : 1),
          adjustedRequiredCount: azCount * (dualHome ? 2 : 1),
        });
        
        // Compute switches (always at least 2 per AZ for redundancy)
        if (requirements.computeRequirements.totalVCPUs) {
          // If user has specified leaf switches per AZ in spine-leaf topology
          let computeSwitchCount = azCount * 2; // Default: 2 per AZ
          
          if (requirements.networkRequirements.networkTopology === 'Spine-Leaf' &&
              requirements.networkRequirements.leafSwitchesPerAZ) {
            computeSwitchCount = azCount * (requirements.networkRequirements.leafSwitchesPerAZ || 2);
          }
          
          roles.push({
            id: uuidv4(),
            role: 'computeSwitch',
            description: 'Switches for compute network traffic',
            requiredCount: computeSwitchCount,
            adjustedRequiredCount: computeSwitchCount,
          });
        }
        
        // Storage switches (always at least 2 per AZ for redundancy)
        // Only add if dedicated storage network is enabled
        if (requirements.storageRequirements.totalCapacityTB && 
            requirements.networkRequirements.dedicatedStorageNetwork) {
          roles.push({
            id: uuidv4(),
            role: 'storageSwitch',
            description: 'Switches for storage network traffic',
            requiredCount: azCount * 2, // 2 per AZ
            adjustedRequiredCount: azCount * 2,
          });
        }
        
        // If spine-leaf topology is selected
        if (requirements.networkRequirements.networkTopology === 'Spine-Leaf') {
          // Add spine switches
          roles.push({
            id: uuidv4(),
            role: 'spineSwitch',
            description: 'Core spine switches for network fabric',
            requiredCount: 2, // Redundant spine switches
            adjustedRequiredCount: 2,
          });
          
          // Add border leaf switches for external connectivity
          roles.push({
            id: uuidv4(),
            role: 'borderLeafSwitch',
            description: 'Border leaf switches for external connectivity',
            requiredCount: 2, // Redundant border switches
            adjustedRequiredCount: 2,
          });
        }
        
        // Add firewalls if required
        if (requirements.networkRequirements.physicalFirewalls) {
          roles.push({
            id: uuidv4(),
            role: 'firewall',
            description: 'Physical firewall appliances',
            requiredCount: 2, // Redundant firewalls
            adjustedRequiredCount: 2,
          });
        }
        
        // If existing roles exist with assigned components, preserve those assignments
        if (state.componentRoles.length > 0) {
          roles.forEach(newRole => {
            const existingRole = state.componentRoles.find(r => r.role === newRole.role);
            if (existingRole && existingRole.assignedComponentId) {
              newRole.assignedComponentId = existingRole.assignedComponentId;
              // Recalculate the adjusted required count based on assigned component
              if (existingRole.assignedComponentId) {
                newRole.adjustedRequiredCount = calculateRequiredQuantity(
                  newRole.id, 
                  existingRole.assignedComponentId,
                  state
                );
              }
            }
          });
        }
        
        return { componentRoles: roles };
      });
    },
    
    assignComponentToRole: (roleId, componentId) => {
      set((state) => {
        const updatedRoles = state.componentRoles.map(role => {
          if (role.id === roleId) {
            const adjustedCount = calculateRequiredQuantity(roleId, componentId, state);
            return { 
              ...role, 
              assignedComponentId: componentId,
              adjustedRequiredCount: adjustedCount
            };
          }
          return role;
        });
        
        return { componentRoles: updatedRoles };
      });
    },
    
    calculateRequiredQuantity: (roleId, componentId) => {
      const state = get();
      return calculateRequiredQuantity(roleId, componentId, state);
    },
  };
};
