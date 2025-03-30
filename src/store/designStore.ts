
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  InfrastructureComponent,
  DesignRequirements,
  InfrastructureDesign,
  ComponentType,
  ComponentRole,
  DeviceRoleType
} from '../types/infrastructure';

interface Position {
  x: number;
  y: number;
}

// Define ComponentWithPosition as InfrastructureComponent plus position
export type ComponentWithPosition = InfrastructureComponent & {
  position: Position;
};

interface DesignState {
  activeDesign: InfrastructureDesign | null;
  placedComponents: Record<string, ComponentWithPosition>;
  selectedComponentId: string | null;
  requirements: DesignRequirements;
  componentRoles: ComponentRole[];
  // Actions
  createNewDesign: (name: string, description?: string) => void;
  updateRequirements: (requirements: Partial<DesignRequirements>) => void;
  addComponent: (component: InfrastructureComponent, position: Position) => void;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, updates: Partial<InfrastructureComponent>) => void;
  updateComponentPosition: (id: string, position: Position) => void;
  selectComponent: (id: string | null) => void;
  saveDesign: () => void;
  calculateComponentRoles: () => void;
  assignComponentToRole: (roleId: string, componentId: string) => void;
}

// Initial requirements state with updated fields
const initialRequirements: DesignRequirements = {
  computeRequirements: {
    totalVCPUs: 0,
    totalMemoryTB: 0,
    availabilityZoneRedundancy: 'None',
    overcommitRatio: 1
  },
  storageRequirements: {
    totalCapacityTB: 0,
    availabilityZoneQuantity: 1,
    poolType: '3 Replica'
  },
  networkRequirements: {
    networkTopology: 'Spine-Leaf',
    managementNetwork: 'Single connection',
    ipmiNetwork: 'Management converged'
  },
  physicalConstraints: {
    rackQuantity: 1,
    totalAvailabilityZones: 1,
    racksPerAvailabilityZone: 1,
    rackUnitsPerRack: 42,
    powerPerRackWatts: 5000
  }
};

export const useDesignStore = create<DesignState>((set, get) => ({
  activeDesign: null,
  placedComponents: {},
  selectedComponentId: null,
  requirements: initialRequirements,
  componentRoles: [],

  // Create a new design
  createNewDesign: (name, description) => {
    const newDesign: InfrastructureDesign = {
      id: uuidv4(),
      name,
      description,
      createdAt: new Date(),
      requirements: initialRequirements,
      components: []
    };
    set({ 
      activeDesign: newDesign,
      placedComponents: {},
      selectedComponentId: null,
      requirements: initialRequirements,
      componentRoles: []
    });
  },

  // Update requirements
  updateRequirements: (requirements) => {
    set((state) => ({
      requirements: {
        ...state.requirements,
        computeRequirements: {
          ...state.requirements.computeRequirements,
          ...requirements.computeRequirements
        },
        storageRequirements: {
          ...state.requirements.storageRequirements,
          ...requirements.storageRequirements
        },
        networkRequirements: {
          ...state.requirements.networkRequirements,
          ...requirements.networkRequirements
        },
        physicalConstraints: {
          ...state.requirements.physicalConstraints,
          ...requirements.physicalConstraints
        }
      }
    }));
  },

  // Add a component to the design
  addComponent: (component, position) => {
    const id = uuidv4();
    const componentWithPosition = {
      ...component,
      id,
      position
    };
    
    set((state) => ({
      placedComponents: {
        ...state.placedComponents,
        [id]: componentWithPosition as ComponentWithPosition
      }
    }));
  },

  // Remove a component from the design
  removeComponent: (id) => {
    set((state) => {
      const newPlacedComponents = { ...state.placedComponents };
      delete newPlacedComponents[id];
      return { 
        placedComponents: newPlacedComponents,
        selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId 
      };
    });
  },

  // Update a component
  updateComponent: (id, updates) => {
    set((state) => {
      const component = state.placedComponents[id];
      if (!component) return state;
      
      return {
        placedComponents: {
          ...state.placedComponents,
          [id]: {
            ...component,
            ...updates
          }
        }
      };
    });
  },

  // Update component position
  updateComponentPosition: (id, position) => {
    set((state) => {
      const component = state.placedComponents[id];
      if (!component) return state;
      
      return {
        placedComponents: {
          ...state.placedComponents,
          [id]: {
            ...component,
            position
          }
        }
      };
    });
  },

  // Select a component
  selectComponent: (id) => {
    set({ selectedComponentId: id });
  },

  // Calculate required component roles based on requirements
  calculateComponentRoles: () => {
    const { requirements } = get();
    const roles: ComponentRole[] = [];
    
    // Controller nodes - always need at least 3 for HA
    roles.push({
      id: uuidv4(),
      role: DeviceRoleType.ControllerNode,
      description: 'Control plane node for orchestration and management',
      requiredCount: 3
    });
    
    // Compute nodes based on vCPU and memory requirements
    const vcpusPerNode = 32; // Example: assume 32 vCPUs per compute node
    const memoryPerNode = 0.5; // Example: assume 0.5 TB memory per compute node
    
    let computeNodeCount = 0;
    if (requirements.computeRequirements.totalVCPUs && requirements.computeRequirements.totalMemoryTB) {
      const vcpuBasedCount = Math.ceil(requirements.computeRequirements.totalVCPUs / vcpusPerNode);
      const memoryBasedCount = Math.ceil(requirements.computeRequirements.totalMemoryTB / memoryPerNode);
      
      // Take the higher of the two calculations to ensure we meet both requirements
      computeNodeCount = Math.max(vcpuBasedCount, memoryBasedCount);
      
      // Factor in overcommit ratio if present
      if (requirements.computeRequirements.overcommitRatio && requirements.computeRequirements.overcommitRatio > 1) {
        computeNodeCount = Math.ceil(computeNodeCount / requirements.computeRequirements.overcommitRatio);
      }
    }
    
    roles.push({
      id: uuidv4(),
      role: DeviceRoleType.ComputeNode,
      description: 'Hypervisor node for running virtual machines',
      requiredCount: Math.max(computeNodeCount, 1) // At least 1 compute node
    });
    
    // Storage nodes based on capacity and pool type
    let storageNodeCount = 0;
    if (requirements.storageRequirements.totalCapacityTB) {
      const capacityPerNode = 10; // Example: 10 TB usable per storage node
      storageNodeCount = Math.ceil(requirements.storageRequirements.totalCapacityTB / capacityPerNode);
      
      // Adjust based on pool type for minimum replica counts
      const poolType = requirements.storageRequirements.poolType || '3 Replica';
      switch (poolType) {
        case '3 Replica':
          storageNodeCount = Math.max(storageNodeCount, 3);
          break;
        case '2 Replica':
          storageNodeCount = Math.max(storageNodeCount, 2);
          break;
        case 'Erasure Coding 4+2':
          storageNodeCount = Math.max(storageNodeCount, 6);
          break;
        case 'Erasure Coding 8+3':
          storageNodeCount = Math.max(storageNodeCount, 11);
          break;
        case 'Erasure Coding 8+4':
          storageNodeCount = Math.max(storageNodeCount, 12);
          break;
        case 'Erasure Coding 10+4':
          storageNodeCount = Math.max(storageNodeCount, 14);
          break;
      }
    }
    
    roles.push({
      id: uuidv4(),
      role: DeviceRoleType.StorageNode,
      description: 'Storage node for distributed storage cluster',
      requiredCount: Math.max(storageNodeCount, 1) // At least 1 storage node
    });
    
    // Network equipment based on topology
    const totalNodes = 3 + computeNodeCount + storageNodeCount;
    const topology = requirements.networkRequirements.networkTopology || 'Spine-Leaf';
    
    if (topology === 'Spine-Leaf') {
      // Add spine switches - typically 2 for redundancy
      roles.push({
        id: uuidv4(),
        role: DeviceRoleType.SpineSwitch,
        description: 'Core spine switch for Spine-Leaf topology',
        requiredCount: 2
      });
      
      // Add leaf switches - 1 pair per rack typically
      const rackCount = requirements.physicalConstraints.rackQuantity || 1;
      roles.push({
        id: uuidv4(),
        role: DeviceRoleType.ComputeSwitch,
        description: 'Leaf switch for compute traffic',
        requiredCount: rackCount * 2 // Two per rack for redundancy
      });
    } else if (topology === 'Three-Tier') {
      // For Three-Tier: Core, Distribution, Access
      roles.push({
        id: uuidv4(),
        role: DeviceRoleType.BorderLeafSwitch,
        description: 'Core switch for three-tier topology',
        requiredCount: 2
      });
      
      roles.push({
        id: uuidv4(),
        role: DeviceRoleType.ManagementSwitch,
        description: 'Distribution switch for three-tier topology',
        requiredCount: 2
      });
      
      const rackCount = requirements.physicalConstraints.rackQuantity || 1;
      roles.push({
        id: uuidv4(),
        role: DeviceRoleType.ToRSwitch,
        description: 'Access/ToR switch for three-tier topology',
        requiredCount: rackCount
      });
    }
    
    // Add management switches based on management network type
    const mgmtNetworkType = requirements.networkRequirements.managementNetwork || 'Single connection';
    roles.push({
      id: uuidv4(),
      role: DeviceRoleType.ManagementSwitch,
      description: 'Switch for management network traffic',
      requiredCount: mgmtNetworkType === 'Dual Home' ? 2 : 1
    });
    
    // Add IPMI switches if dedicated
    const ipmiNetworkType = requirements.networkRequirements.ipmiNetwork || 'Management converged';
    if (ipmiNetworkType === 'Dedicated IPMI switch') {
      roles.push({
        id: uuidv4(),
        role: DeviceRoleType.ManagementSwitch,
        description: 'Dedicated switch for IPMI/BMC traffic',
        requiredCount: 1
      });
    }
    
    set({ componentRoles: roles });
  },
  
  // Assign a component to a role
  assignComponentToRole: (roleId, componentId) => {
    set((state) => ({
      componentRoles: state.componentRoles.map(role => 
        role.id === roleId 
          ? { ...role, assignedComponentId: componentId } 
          : role
      )
    }));
  },

  // Save the current design
  saveDesign: () => {
    const { activeDesign, placedComponents, requirements, componentRoles } = get();
    if (!activeDesign) return;

    // Extract assigned components from roles
    const assignedComponents: InfrastructureComponent[] = [];
    
    // For each role, add the assigned component with the required quantity
    componentRoles.forEach(role => {
      if (role.assignedComponentId) {
        const component = Object.values(placedComponents).find(
          c => c.id === role.assignedComponentId
        );
        
        if (component) {
          // Add the component with the quantity equal to the required count
          const { position, ...componentWithoutPosition } = component;
          assignedComponents.push({
            ...componentWithoutPosition,
            quantity: role.requiredCount
          });
        }
      }
    });

    const updatedDesign: InfrastructureDesign = {
      ...activeDesign,
      updatedAt: new Date(),
      requirements,
      components: assignedComponents
    };

    set({ activeDesign: updatedDesign });

    // In a real app, you would save to a database here
    console.log('Design saved:', updatedDesign);

    // Show toast or notification
    alert('Design saved successfully!');
  }
}));
