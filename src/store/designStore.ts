import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  DesignRequirements, 
  InfrastructureComponent, 
  ComponentRole,
  DeviceRoleType,
  ComponentType
} from '@/types/infrastructure';
import { ComponentWithPosition, Position } from '@/types/workspace';
import { toast } from 'sonner';
import { allComponentTemplates } from '@/data/componentData';

interface DesignState {
  requirements: DesignRequirements;
  componentRoles: ComponentRole[];
  savedDesigns: {
    id: string;
    name: string;
    createdAt: Date;
    requirements: DesignRequirements;
    components: InfrastructureComponent[];
  }[];
  workspaceComponents: ComponentWithPosition[];
  setRequirements: (requirements: Partial<DesignRequirements>) => void;
  calculateComponentRoles: () => void;
  assignComponentToRole: (roleId: string, componentId: string) => void;
  saveDesign: () => void;
  addComponentToWorkspace: (component: InfrastructureComponent, position: Position) => void;
  updateComponentPosition: (id: string, position: Position) => void;
  removeComponentFromWorkspace: (id: string) => void;
}

export const useDesignStore = create<DesignState>((set, get) => ({
  requirements: {
    computeRequirements: {
      totalVCPUs: 100,
      totalMemoryTB: 1,
      availabilityZoneRedundancy: 'N+1',
      overcommitRatio: 4,
    },
    storageRequirements: {
      totalCapacityTB: 100,
      availabilityZoneQuantity: 3,
      poolType: '3 Replica',
    },
    networkRequirements: {
      networkTopology: 'Spine-Leaf',
      managementNetwork: 'Dual Home',
      ipmiNetwork: 'Dedicated IPMI switch',
    },
    physicalConstraints: {
      rackQuantity: 3,
      totalAvailabilityZones: 3,
      racksPerAvailabilityZone: 1,
      rackUnitsPerRack: 42,
      powerPerRackWatts: 10000,
    },
  },
  componentRoles: [],
  savedDesigns: [],
  workspaceComponents: [],

  setRequirements: (newRequirements) => 
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
    })),

  calculateComponentRoles: () => {
    set((state) => {
      const { requirements } = state;
      const roles: ComponentRole[] = [];

      // Calculate controller nodes
      const controllerCount = 3; // Typically 3 for HA
      roles.push({
        id: uuidv4(),
        role: DeviceRoleType.ControllerNode,
        description: 'Hosts control plane services',
        requiredCount: controllerCount,
      });

      // Calculate compute nodes based on vCPU and memory requirements
      let computeNodeCount = 0;
      if (requirements.computeRequirements.totalVCPUs && requirements.computeRequirements.totalMemoryTB) {
        // Assuming a standard compute node has 40 vCPUs and 384GB RAM
        const vcpusPerNode = 40;
        const memoryPerNodeTB = 0.384;
        
        // Calculate nodes needed for CPU and memory
        const nodesForCPU = Math.ceil(
          requirements.computeRequirements.totalVCPUs / 
          (vcpusPerNode * (requirements.computeRequirements.overcommitRatio || 1))
        );
        
        const nodesForMemory = Math.ceil(
          requirements.computeRequirements.totalMemoryTB / memoryPerNodeTB
        );
        
        // Take the higher of the two requirements
        computeNodeCount = Math.max(nodesForCPU, nodesForMemory);
        
        // Apply redundancy factor
        if (requirements.computeRequirements.availabilityZoneRedundancy === 'N+1') {
          computeNodeCount += 1;
        } else if (requirements.computeRequirements.availabilityZoneRedundancy === 'N+2') {
          computeNodeCount += 2;
        }
      }
      
      roles.push({
        id: uuidv4(),
        role: DeviceRoleType.ComputeNode,
        description: 'Provides compute resources for VMs',
        requiredCount: Math.max(computeNodeCount, 1), // At least 1 compute node
      });

      // Calculate storage nodes based on capacity requirements
      let storageNodeCount = 0;
      if (requirements.storageRequirements.totalCapacityTB) {
        // Assuming each storage node provides 20TB of raw capacity
        const capacityPerNodeTB = 20;
        
        // Calculate raw capacity needed based on storage pool type
        let rawCapacityMultiplier = 1;
        switch (requirements.storageRequirements.poolType) {
          case '3 Replica':
            rawCapacityMultiplier = 3;
            break;
          case '2 Replica':
            rawCapacityMultiplier = 2;
            break;
          case 'Erasure Coding 4+2':
            rawCapacityMultiplier = 1.5; // 6/4 = 1.5x overhead
            break;
          case 'Erasure Coding 8+3':
            rawCapacityMultiplier = 1.375; // 11/8 = 1.375x overhead
            break;
          case 'Erasure Coding 8+4':
            rawCapacityMultiplier = 1.5; // 12/8 = 1.5x overhead
            break;
          case 'Erasure Coding 10+4':
            rawCapacityMultiplier = 1.4; // 14/10 = 1.4x overhead
            break;
          default:
            rawCapacityMultiplier = 3; // Default to 3x for safety
        }
        
        const rawCapacityNeeded = requirements.storageRequirements.totalCapacityTB * rawCapacityMultiplier;
        storageNodeCount = Math.ceil(rawCapacityNeeded / capacityPerNodeTB);
        
        // Ensure minimum nodes for the selected pool type
        if (requirements.storageRequirements.poolType?.includes('Erasure Coding')) {
          const [dataChunks, parityChunks] = requirements.storageRequirements.poolType
            .split('Erasure Coding ')[1]
            .split('+')
            .map(Number);
          
          storageNodeCount = Math.max(storageNodeCount, dataChunks + parityChunks);
        } else if (requirements.storageRequirements.poolType === '3 Replica') {
          storageNodeCount = Math.max(storageNodeCount, 3);
        } else if (requirements.storageRequirements.poolType === '2 Replica') {
          storageNodeCount = Math.max(storageNodeCount, 2);
        }
      }
      
      roles.push({
        id: uuidv4(),
        role: DeviceRoleType.StorageNode,
        description: 'Provides storage capacity',
        requiredCount: Math.max(storageNodeCount, 3), // At least 3 storage nodes for redundancy
      });

      // Network components based on topology
      if (requirements.networkRequirements.networkTopology === 'Spine-Leaf') {
        // Spine switches - typically 2 for redundancy
        roles.push({
          id: uuidv4(),
          role: DeviceRoleType.SpineSwitch,
          description: 'Core network connectivity between leaf switches',
          requiredCount: 2,
        });
        
        // Border leaf switches - typically 2 for redundancy
        roles.push({
          id: uuidv4(),
          role: DeviceRoleType.BorderLeafSwitch,
          description: 'Connects to external networks',
          requiredCount: 2,
        });
        
        // ToR switches - one per rack
        const rackCount = requirements.physicalConstraints.rackQuantity || 1;
        roles.push({
          id: uuidv4(),
          role: DeviceRoleType.ToRSwitch,
          description: 'Top-of-Rack switch for server connectivity',
          requiredCount: rackCount * 2, // 2 per rack for redundancy
        });
      } else {
        // For other topologies, add generic switches
        roles.push({
          id: uuidv4(),
          role: DeviceRoleType.ComputeSwitch,
          description: 'Network connectivity for compute nodes',
          requiredCount: 2, // Redundant pair
        });
        
        roles.push({
          id: uuidv4(),
          role: DeviceRoleType.StorageSwitch,
          description: 'Network connectivity for storage nodes',
          requiredCount: 2, // Redundant pair
        });
      }
      
      // Management network
      roles.push({
        id: uuidv4(),
        role: DeviceRoleType.ManagementSwitch,
        description: 'Network connectivity for management traffic',
        requiredCount: 2, // Redundant pair
      });
      
      // Firewall
      roles.push({
        id: uuidv4(),
        role: DeviceRoleType.Firewall,
        description: 'Security and traffic filtering',
        requiredCount: 2, // Redundant pair
      });

      return { componentRoles: roles };
    });
  },

  assignComponentToRole: (roleId, componentId) => {
    set((state) => {
      const updatedRoles = state.componentRoles.map((role) => {
        if (role.id === roleId) {
          const component = allComponentTemplates.find(c => c.id === componentId);
          return {
            ...role,
            assignedComponentId: componentId,
            assignedComponent: component
          };
        }
        return role;
      });
      
      return { componentRoles: updatedRoles };
    });
  },

  saveDesign: () => {
    set((state) => {
      try {
        // Here, we need to properly type the components
        const assignedComponents: InfrastructureComponent[] = state.componentRoles
          .filter(role => role.assignedComponentId)
          .map(role => {
            const componentTemplate = state.componentRoles.find(
              r => r.id === role.id
            )?.assignedComponent;
            
            if (!componentTemplate) {
              throw new Error(`Component not found for role: ${role.role}`);
            }

            // Clone and return with proper typing
            return {
              ...componentTemplate,
              quantity: role.requiredCount
            } as InfrastructureComponent;
          });

        // Save the design - now with properly typed components
        const updatedDesigns = [...state.savedDesigns, {
          id: uuidv4(),
          name: `Design ${state.savedDesigns.length + 1}`,
          createdAt: new Date(),
          requirements: state.requirements,
          components: assignedComponents
        }];
        
        toast.success("Design saved successfully!");
        return { savedDesigns: updatedDesigns };
      } catch (error) {
        console.error("Failed to save design:", error);
        toast.error("Failed to save design");
        return state;
      }
    });
  },

  addComponentToWorkspace: (component, position) => {
    set((state) => {
      const newComponent: ComponentWithPosition = {
        id: uuidv4(),
        component,
        position
      };
      
      return {
        workspaceComponents: [...state.workspaceComponents, newComponent]
      };
    });
  },

  updateComponentPosition: (id, position) => {
    set((state) => {
      const updatedComponents = state.workspaceComponents.map((comp) => {
        if (comp.id === id) {
          return { ...comp, position };
        }
        return comp;
      });
      
      return { workspaceComponents: updatedComponents };
    });
  },

  removeComponentFromWorkspace: (id) => {
    set((state) => ({
      workspaceComponents: state.workspaceComponents.filter((comp) => comp.id !== id)
    }));
  }
}));
