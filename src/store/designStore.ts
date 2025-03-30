
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  InfrastructureComponent,
  DesignRequirements,
  InfrastructureDesign,
  ComponentType
} from '../types/infrastructure';

interface Position {
  x: number;
  y: number;
}

interface ComponentWithPosition extends InfrastructureComponent {
  position: Position;
}

interface DesignState {
  activeDesign: InfrastructureDesign | null;
  placedComponents: Record<string, ComponentWithPosition>;
  selectedComponentId: string | null;
  requirements: DesignRequirements;
  // Actions
  createNewDesign: (name: string, description?: string) => void;
  updateRequirements: (requirements: Partial<DesignRequirements>) => void;
  addComponent: (component: InfrastructureComponent, position: Position) => void;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, updates: Partial<InfrastructureComponent>) => void;
  updateComponentPosition: (id: string, position: Position) => void;
  selectComponent: (id: string | null) => void;
  saveDesign: () => void;
}

// Initial requirements state
const initialRequirements: DesignRequirements = {
  computeRequirements: {
    totalVCPUs: 0,
    totalMemoryGB: 0,
    redundancyFactor: 1
  },
  storageRequirements: {
    totalCapacityTB: 0,
    performanceIOPS: 0,
    redundancyLevel: 'RAID5'
  },
  networkRequirements: {
    totalBandwidthGbps: 0,
    redundancyLevel: 'Dual-homed'
  },
  physicalConstraints: {
    availableRacks: 1,
    rackUnitsPerRack: 42,
    powerPerRackWatts: 5000,
    coolingBTU: 17000
  }
};

export const useDesignStore = create<DesignState>((set, get) => ({
  activeDesign: null,
  placedComponents: {},
  selectedComponentId: null,
  requirements: initialRequirements,

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
      requirements: initialRequirements
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
    const componentWithPosition: ComponentWithPosition = {
      ...component,
      id,
      position
    };
    
    set((state) => ({
      placedComponents: {
        ...state.placedComponents,
        [id]: componentWithPosition
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
    set((state) => ({
      placedComponents: {
        ...state.placedComponents,
        [id]: {
          ...state.placedComponents[id],
          ...updates
        }
      }
    }));
  },

  // Update component position
  updateComponentPosition: (id, position) => {
    set((state) => ({
      placedComponents: {
        ...state.placedComponents,
        [id]: {
          ...state.placedComponents[id],
          position
        }
      }
    }));
  },

  // Select a component
  selectComponent: (id) => {
    set({ selectedComponentId: id });
  },

  // Save the current design
  saveDesign: () => {
    const { activeDesign, placedComponents, requirements } = get();
    if (!activeDesign) return;

    const updatedDesign: InfrastructureDesign = {
      ...activeDesign,
      updatedAt: new Date(),
      requirements,
      components: Object.values(placedComponents).map(({ position, ...component }) => component)
    };

    set({ activeDesign: updatedDesign });

    // In a real app, you would save to a database here
    console.log('Design saved:', updatedDesign);

    // Show toast or notification
    alert('Design saved successfully!');
  }
}));
