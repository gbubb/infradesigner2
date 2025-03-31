
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';
import { StoreState } from '../types';
import { persistComponents } from '@/utils/persistenceUtils';

export interface ComponentLibrarySlice {
  // Available component templates
  componentTemplates: InfrastructureComponent[];
  
  // Add a component template
  addComponentTemplate: (component: InfrastructureComponent) => void;
  
  // Update a component template
  updateComponentTemplate: (id: string, updates: Partial<InfrastructureComponent>) => void;
  
  // Clone a component template
  cloneComponentTemplate: (id: string) => void;
  
  // Delete a component template
  deleteComponentTemplate: (id: string) => void;
  
  // Set a component as default for a role and type
  setDefaultComponent: (type: ComponentType, role: string, id: string) => void;
  
  // Get default component for a role and type
  getDefaultComponent: (type: ComponentType, role: string) => InfrastructureComponent | undefined;

  // Load component templates
  loadComponentTemplates: (components: InfrastructureComponent[]) => void;
}

export const createComponentLibrarySlice: StateCreator<
  StoreState,
  [],
  [],
  ComponentLibrarySlice
> = (set, get) => ({
  componentTemplates: [],
  
  addComponentTemplate: (component) => {
    set((state) => {
      // Ensure the component has an ID
      const componentWithId = {
        ...component,
        id: component.id || uuidv4()
      };
      
      const updatedTemplates = [...state.componentTemplates, componentWithId];
      
      // Persist components to database
      persistComponents(updatedTemplates).catch(err => {
        console.error('Failed to persist component addition:', err);
      });
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  updateComponentTemplate: (id, updates) => {
    set((state) => {
      const index = state.componentTemplates.findIndex(c => c.id === id);
      if (index === -1) return state;
      
      const updatedTemplates = [...state.componentTemplates];
      updatedTemplates[index] = {
        ...updatedTemplates[index],
        ...updates
      };
      
      // Persist components to database
      persistComponents(updatedTemplates).catch(err => {
        console.error('Failed to persist component update:', err);
      });
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  cloneComponentTemplate: (id) => {
    set((state) => {
      const componentToClone = state.componentTemplates.find(c => c.id === id);
      if (!componentToClone) return state;
      
      const clonedComponent = {
        ...componentToClone,
        id: uuidv4(),
        name: `${componentToClone.name} (Copy)`,
        isDefault: false
      };
      
      const updatedTemplates = [...state.componentTemplates, clonedComponent];
      
      // Persist components to database
      persistComponents(updatedTemplates).catch(err => {
        console.error('Failed to persist component clone:', err);
      });
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  deleteComponentTemplate: (id) => {
    set((state) => {
      const updatedTemplates = state.componentTemplates.filter(c => c.id !== id);
      
      // Persist components to database
      persistComponents(updatedTemplates).catch(err => {
        console.error('Failed to persist component deletion:', err);
      });
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  setDefaultComponent: (type, role, id) => {
    set((state) => {
      // First reset any existing defaults for this type and role
      const updatedTemplates = state.componentTemplates.map(c => {
        if (c.type === type && c.role === role) {
          return { ...c, isDefault: c.id === id };
        }
        return c;
      });
      
      // Persist components to database
      persistComponents(updatedTemplates).catch(err => {
        console.error('Failed to persist default component change:', err);
      });
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  getDefaultComponent: (type, role) => {
    const { componentTemplates } = get();
    return componentTemplates.find(c => c.type === type && c.role === role && c.isDefault);
  },
  
  loadComponentTemplates: (components) => {
    set({ componentTemplates: components });
  }
});
