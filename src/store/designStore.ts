
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

export type { ComponentWithPosition, Position };

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
  activeDesign: {
    id: string;
    name: string;
    components: InfrastructureComponent[];
  } | null;
  selectedComponentId: string | null;
  placedComponents: Record<string, InfrastructureComponent>;
  editingComponentId: string | null;
  setRequirements: (requirements: Partial<DesignRequirements>) => void;
  updateRequirements: (requirements: Partial<DesignRequirements>) => void;
  calculateComponentRoles: () => void;
  assignComponentToRole: (roleId: string, componentId: string) => void;
  saveDesign: () => void;
  createNewDesign: (name: string, description?: string) => void;
  addComponentToWorkspace: (component: InfrastructureComponent, position: Position) => void;
  updateComponentPosition: (id: string, position: Position) => void;
  removeComponentFromWorkspace: (id: string) => void;
  selectComponent: (id: string | null) => void;
  addComponent: (component: InfrastructureComponent, position: Position) => void;
  removeComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;
  startEditingComponent: (id: string) => void;
  cancelEditingComponent: () => void;
  updateComponent: (id: string, updatedComponent: Partial<InfrastructureComponent>) => void;
  calculateRequiredQuantity: (roleId: string, componentId: string) => number;
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
      physicalFirewalls: true,
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
  activeDesign: null,
  selectedComponentId: null,
  placedComponents: {},
  editingComponentId: null,

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

  updateRequirements: (newRequirements) => 
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
      
      // Firewall - only add if physical firewalls are required
      if (requirements.networkRequirements.physicalFirewalls) {
        roles.push({
          id: uuidv4(),
          role: DeviceRoleType.Firewall,
          description: 'Security and traffic filtering',
          requiredCount: 2, // Redundant pair
        });
      }

      return { componentRoles: roles };
    });
  },

  calculateRequiredQuantity: (roleId, componentId) => {
    const state = get();
    const role = state.componentRoles.find(r => r.id === roleId);
    if (!role) return 0;
    
    const component = allComponentTemplates.find(c => c.id === componentId);
    if (!component) return 0;
    
    // Get base required count from role
    const baseCount = role.requiredCount;
    
    // Check if component has capacity factor
    if (component.capacityFactor && component.capacityFactor > 0) {
      // For compute nodes, adjust based on CPU/memory capacity
      if (role.role === DeviceRoleType.ComputeNode) {
        const baseVCPUs = 40; // Standard server vCPU count
        const baseMemory = 0.384; // Standard server memory in TB (384GB)
        
        if (component.type === ComponentType.Server) {
          const server = component as any; // Type as any to access server-specific properties
          
          // Calculate capacity ratios
          const cpuRatio = server.coreCount * server.cpuCount * 2 / baseVCPUs; // Assuming 2 vCPUs per core
          const memoryRatio = (server.memoryGB / 1024) / baseMemory;
          
          // Use the lower ratio (bottleneck) to determine how many nodes needed
          const capacityRatio = Math.min(cpuRatio, memoryRatio);
          
          if (capacityRatio > 0) {
            return Math.ceil(baseCount / capacityRatio);
          }
        }
      }
      
      // For storage nodes, adjust based on capacity
      if (role.role === DeviceRoleType.StorageNode) {
        const baseCapacity = 20; // Standard storage node capacity in TB
        
        if (component.type === ComponentType.StorageArray || component.type === ComponentType.Server) {
          let storageCapacity = 0;
          
          if (component.type === ComponentType.StorageArray && 'driveCapacity' in component) {
            storageCapacity = (component as any).driveCapacity;
          } else if (component.type === ComponentType.Server && 'storageCapacityTB' in component) {
            storageCapacity = (component as any).storageCapacityTB || 0;
          }
          
          if (storageCapacity > 0) {
            const capacityRatio = storageCapacity / baseCapacity;
            return Math.ceil(baseCount / capacityRatio);
          }
        }
      }
    }
    
    // Default to base count if no capacity adjustments
    return baseCount;
  },

  assignComponentToRole: (roleId, componentId) => {
    set((state) => {
      const { calculateRequiredQuantity } = get();
      const updatedRoles = state.componentRoles.map((role) => {
        if (role.id === roleId) {
          const component = allComponentTemplates.find(c => c.id === componentId);
          const adjustedQuantity = calculateRequiredQuantity(roleId, componentId);
          
          return {
            ...role,
            assignedComponentId: componentId,
            assignedComponent: component,
            // Update the quantity based on component capacity
            adjustedRequiredCount: adjustedQuantity
          };
        }
        return role;
      });
      
      return { componentRoles: updatedRoles };
    });
    
    // After assigning component, recalculate required quantities
    const { componentRoles } = get();
    componentRoles.forEach(role => {
      if (role.assignedComponentId) {
        get().calculateRequiredQuantity(role.id, role.assignedComponentId);
      }
    });
  },

  createNewDesign: (name, description) => {
    set({
      activeDesign: {
        id: uuidv4(),
        name,
        components: []
      }
    });
    toast.success(`Created new design: ${name}`);
  },

  saveDesign: () => {
    set((state) => {
      try {
        // Here, we need to properly type the components
        const assignedComponents: InfrastructureComponent[] = state.componentRoles
          .filter(role => role.assignedComponentId)
          .map(role => {
            const componentTemplate = allComponentTemplates.find(
              c => c.id === role.assignedComponentId
            );
            
            if (!componentTemplate) {
              throw new Error(`Component not found for role: ${role.role}`);
            }

            // Clone and return with proper typing
            return {
              ...componentTemplate,
              quantity: role.adjustedRequiredCount || role.requiredCount
            } as InfrastructureComponent;
          });

        // Create or update activeDesign
        const designToSave = state.activeDesign ? 
          { ...state.activeDesign, components: assignedComponents } : 
          {
            id: uuidv4(),
            name: `Design ${state.savedDesigns.length + 1}`,
            components: assignedComponents
          };

        // Save the design - now with properly typed components
        const updatedDesigns = [...state.savedDesigns, {
          id: designToSave.id,
          name: designToSave.name,
          createdAt: new Date(),
          requirements: state.requirements,
          components: assignedComponents
        }];
        
        toast.success("Design saved successfully!");
        return { 
          savedDesigns: updatedDesigns,
          activeDesign: designToSave
        };
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
  },

  selectComponent: (id) => {
    set({ selectedComponentId: id });
  },

  addComponent: (component, position) => {
    const id = uuidv4();
    set((state) => ({
      placedComponents: {
        ...state.placedComponents,
        [id]: component
      },
      workspaceComponents: [
        ...state.workspaceComponents,
        {
          id,
          component,
          position
        }
      ]
    }));
  },

  removeComponent: (id) => {
    set((state) => {
      const { [id]: _, ...rest } = state.placedComponents;
      return { 
        placedComponents: rest,
        workspaceComponents: state.workspaceComponents.filter(comp => comp.id !== id),
        selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId
      };
    });
    toast.success("Component removed");
  },
  
  duplicateComponent: (id) => {
    set((state) => {
      const componentToDuplicate = state.placedComponents[id];
      if (!componentToDuplicate) return state;
      
      const positionRef = state.workspaceComponents.find(c => c.id === id)?.position || { x: 0, y: 0 };
      const newPosition = { x: positionRef.x + 20, y: positionRef.y + 20 };
      
      const newId = uuidv4();
      
      return {
        placedComponents: {
          ...state.placedComponents,
          [newId]: { ...componentToDuplicate }
        },
        workspaceComponents: [
          ...state.workspaceComponents,
          {
            id: newId,
            component: { ...componentToDuplicate },
            position: newPosition
          }
        ]
      };
    });
    toast.success("Component duplicated");
  },
  
  startEditingComponent: (id) => {
    set({ editingComponentId: id });
  },
  
  cancelEditingComponent: () => {
    set({ editingComponentId: null });
  },
  
  updateComponent: (id, updatedComponent) => {
    set((state) => {
      const component = state.placedComponents[id];
      if (!component) return state;
      
      const updatedData = {
        ...component,
        ...updatedComponent
      };
      
      // Update in placed components
      const updatedPlacedComponents = {
        ...state.placedComponents,
        [id]: updatedData
      };
      
      // Update in workspace components
      const updatedWorkspaceComponents = state.workspaceComponents.map(comp => {
        if (comp.id === id) {
          return {
            ...comp,
            component: updatedData
          };
        }
        return comp;
      });
      
      return {
        placedComponents: updatedPlacedComponents,
        workspaceComponents: updatedWorkspaceComponents,
        editingComponentId: null
      };
    });
    toast.success("Component updated");
  }
}));
