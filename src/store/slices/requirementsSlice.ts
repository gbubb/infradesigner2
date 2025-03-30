
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ComponentRole, DesignRequirements } from '@/types/infrastructure';
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
    const component = allComponentTemplates.find(c => c.id === componentId);
    
    if (!role || !component) return role?.requiredCount || 0;
    
    // Default to the base required count
    let adjustedCount = role.requiredCount;
    
    // Apply capacity factors for different component types
    if (role.role === 'computeNode' && component.type === 'server') {
      const totalVCPUs = state.requirements.computeRequirements.totalVCPUs || 0;
      const serverVCPUs = (component as any).coreCount * (component as any).cpuCount;
      
      if (serverVCPUs > 0) {
        // Calculate how many servers we need to meet vCPU requirements
        // Include overcommit ratio if specified
        const overcommitRatio = state.requirements.computeRequirements.overcommitRatio || 1;
        const effectiveVCPUs = serverVCPUs * overcommitRatio;
        adjustedCount = Math.ceil(totalVCPUs / effectiveVCPUs);
        
        // Apply availability zone redundancy if required
        const redundancy = state.requirements.computeRequirements.availabilityZoneRedundancy;
        if (redundancy === 'N+1') {
          adjustedCount += 1;
        } else if (redundancy === 'N+2') {
          adjustedCount += 2;
        }
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
        adjustedCount = Math.ceil(rawCapacityNeeded / serverCapacity);
        
        // Apply availability zone distribution if specified
        const azCount = state.requirements.storageRequirements.availabilityZoneQuantity || 1;
        if (azCount > 1) {
          // Ensure minimum nodes per AZ for the storage technology
          const minNodesPerAZ = 3; // Most storage systems need min 3 nodes
          adjustedCount = Math.max(adjustedCount, azCount * minNodesPerAZ);
        }
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
        
        // Calculate compute nodes
        if (requirements.computeRequirements.totalVCPUs) {
          // Use a standard ratio of 10 vCPUs per node as default if no component selected
          const computeCount = Math.ceil(requirements.computeRequirements.totalVCPUs / 10);
          roles.push({
            id: uuidv4(),
            role: 'computeNode',
            description: 'Compute nodes provide CPU and memory resources',
            requiredCount: computeCount,
            adjustedRequiredCount: computeCount,
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
        // Management switch pair (always have 2 for redundancy)
        roles.push({
          id: uuidv4(),
          role: 'managementSwitch',
          description: 'Switches for management network traffic',
          requiredCount: 2,
          adjustedRequiredCount: 2,
        });
        
        // Compute switches
        if (requirements.computeRequirements.totalVCPUs) {
          roles.push({
            id: uuidv4(),
            role: 'computeSwitch',
            description: 'Switches for compute network traffic',
            requiredCount: 2, // Always redundant
            adjustedRequiredCount: 2,
          });
        }
        
        // Storage switches
        if (requirements.storageRequirements.totalCapacityTB) {
          roles.push({
            id: uuidv4(),
            role: 'storageSwitch',
            description: 'Switches for storage network traffic',
            requiredCount: 2, // Always redundant
            adjustedRequiredCount: 2,
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
