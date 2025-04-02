import { StateCreator } from 'zustand';
import { StoreState, WorkspaceState } from '../types';
import { InfrastructureComponent } from '@/types/infrastructure';
import { ComponentWithPosition, Position } from '@/types/workspace';
import { v4 as uuidv4 } from 'uuid';

export interface WorkspaceSlice {
  // Components placed in the workspace
  placedComponents: Record<string, InfrastructureComponent>;
  // Components with position in the workspace
  workspaceComponents: ComponentWithPosition[];
  // Currently editing component ID
  editingComponentId: string | null;
  // Currently selected component ID
  selectedComponentId: string | null;
  
  // Add a component to the workspace
  addComponent: (component: InfrastructureComponent, position: Position) => void;
  
  // Update component position
  updateComponentPosition: (id: string, position: Position) => void;
  
  // Select component
  selectComponent: (id: string | null) => void;
  
  // Select component for editing
  selectComponentForEditing: (id: string | null) => void;
  
  // Start editing a component
  startEditingComponent: (id: string) => void;
  
  // Cancel editing a component
  cancelEditingComponent: () => void;
  
  // Update a component's properties
  updateComponent: (id: string, updates: Partial<InfrastructureComponent>) => void;
  
  // Clone a component in the workspace
  cloneComponent: (id: string) => void;
  
  // Duplicate a component
  duplicateComponent: (id: string) => void;
  
  // Delete a component from the workspace
  deleteComponent: (id: string) => void;
  
  // Remove a component
  removeComponent: (id: string) => void;
}

export const createWorkspaceSlice: StateCreator<
  StoreState,
  [],
  [],
  WorkspaceSlice
> = (set, get) => ({
  placedComponents: {},
  workspaceComponents: [],
  editingComponentId: null,
  selectedComponentId: null,
  
  addComponent: (component, position) => {
    set((state) => {
      const componentId = uuidv4();
      
      // Use type assertion to ensure we're working with a proper InfrastructureComponent
      const newComponent = { ...component } as InfrastructureComponent;
      
      const updatedPlacedComponents: Record<string, InfrastructureComponent> = {
        ...state.placedComponents,
        [componentId]: newComponent,
      };
      
      const updatedWorkspaceComponents: ComponentWithPosition[] = [
        ...state.workspaceComponents,
        {
          component: newComponent,
          id: componentId,
          position,
        },
      ];
      
      return {
        placedComponents: updatedPlacedComponents,
        workspaceComponents: updatedWorkspaceComponents,
      };
    });
  },
  
  updateComponentPosition: (id, position) => {
    set((state) => {
      const updatedWorkspaceComponents = state.workspaceComponents.map(comp => 
        comp.id === id ? { ...comp, position } : comp
      );
      
      return { workspaceComponents: updatedWorkspaceComponents };
    });
  },
  
  selectComponent: (id) => {
    set({ selectedComponentId: id });
  },
  
  selectComponentForEditing: (id) => {
    set({ editingComponentId: id });
  },
  
  startEditingComponent: (id) => {
    set({ editingComponentId: id });
  },
  
  cancelEditingComponent: () => {
    set({ editingComponentId: null });
  },
  
  updateComponent: (id, updates) => {
    set((state) => {
      const component = state.placedComponents[id];
      if (!component) return state;
      
      // Ensure proper typing with type assertion
      const updatedComponent = {
        ...component,
        ...updates
      } as InfrastructureComponent;
      
      const updatedPlacedComponents: Record<string, InfrastructureComponent> = {
        ...state.placedComponents,
        [id]: updatedComponent
      };
      
      const updatedWorkspaceComponents: ComponentWithPosition[] = state.workspaceComponents.map(comp => 
        comp.id === id ? { ...comp, component: updatedComponent } : comp
      );
      
      return {
        placedComponents: updatedPlacedComponents,
        workspaceComponents: updatedWorkspaceComponents,
        editingComponentId: null
      };
    });
  },
  
  cloneComponent: (id) => {
    set((state) => {
      const componentToClone = state.workspaceComponents.find(c => c.id === id);
      
      if (!componentToClone) return state;
      
      const newComponentId = uuidv4();
      const newPosition = {
        x: componentToClone.position.x + 20,
        y: componentToClone.position.y + 20,
      };
      
      // Use type assertion to ensure proper typing
      const componentCopy = { 
        ...componentToClone.component 
      } as InfrastructureComponent;
      
      const updatedPlacedComponents: Record<string, InfrastructureComponent> = {
        ...state.placedComponents,
        [newComponentId]: componentCopy,
      };
      
      const updatedWorkspaceComponents: ComponentWithPosition[] = [
        ...state.workspaceComponents,
        {
          component: componentCopy,
          id: newComponentId,
          position: newPosition,
        },
      ];
      
      return {
        placedComponents: updatedPlacedComponents,
        workspaceComponents: updatedWorkspaceComponents,
      };
    });
  },
  
  duplicateComponent: (id) => {
    // Use the cloneComponent implementation directly instead of calling get().cloneComponent
    // which would try to access the method before it's fully defined
    const { workspaceComponents, placedComponents } = get();
    
    const componentToClone = workspaceComponents.find(c => c.id === id);
    if (!componentToClone) return;
    
    const newComponentId = uuidv4();
    const newPosition = {
      x: componentToClone.position.x + 20,
      y: componentToClone.position.y + 20,
    };
    
    // Use type assertion to ensure proper typing
    const componentCopy = { 
      ...componentToClone.component 
    } as InfrastructureComponent;
    
    set({
      placedComponents: {
        ...placedComponents,
        [newComponentId]: componentCopy,
      },
      workspaceComponents: [
        ...workspaceComponents,
        {
          component: componentCopy,
          id: newComponentId,
          position: newPosition,
        },
      ]
    });
  },
  
  deleteComponent: (id) => {
    set((state) => {
      const updatedWorkspaceComponents = state.workspaceComponents.filter(
        (component) => component.id !== id
      );
      
      const updatedPlacedComponents = { ...state.placedComponents };
      delete updatedPlacedComponents[id];
      
      // If the deleted component was being edited, clear the editing ID
      const editingComponentId = 
        state.editingComponentId === id ? null : state.editingComponentId;
      const selectedComponentId = 
        state.selectedComponentId === id ? null : state.selectedComponentId;
      
      return {
        placedComponents: updatedPlacedComponents,
        workspaceComponents: updatedWorkspaceComponents,
        editingComponentId,
        selectedComponentId
      };
    });
  },
  
  removeComponent: (id) => {
    // Fixed: Use the deleteComponent implementation directly rather than trying
    // to call the method through get() which created a circular reference
    set((state) => {
      const updatedWorkspaceComponents = state.workspaceComponents.filter(
        (component) => component.id !== id
      );
      
      const updatedPlacedComponents = { ...state.placedComponents };
      delete updatedPlacedComponents[id];
      
      // If the deleted component was being edited, clear the editing ID
      const editingComponentId = 
        state.editingComponentId === id ? null : state.editingComponentId;
      const selectedComponentId = 
        state.selectedComponentId === id ? null : state.selectedComponentId;
      
      return {
        placedComponents: updatedPlacedComponents,
        workspaceComponents: updatedWorkspaceComponents,
        editingComponentId,
        selectedComponentId
      };
    });
  }
});
