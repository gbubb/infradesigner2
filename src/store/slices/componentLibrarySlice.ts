
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import { StoreState } from '../types';
import { allComponentTemplates } from '@/data/componentData';

export interface ComponentLibrarySlice {
  // All available component templates
  componentTemplates: InfrastructureComponent[];
  
  // Initialize component templates
  initializeComponentTemplates: () => void;
  
  // Add a component template
  addComponentTemplate: (component: InfrastructureComponent) => void;
  
  // Update a component template
  updateComponentTemplate: (id: string, updates: Partial<InfrastructureComponent>) => void;
  
  // Clone a component template
  cloneComponentTemplate: (id: string) => void;
  
  // Delete a component template
  deleteComponentTemplate: (id: string) => void;
  
  // Set a component as the default for its type/role
  setDefaultComponent: (type: ComponentType, role: string, id: string) => void;
  
  // Get the default component for a type/role combination
  getDefaultComponent: (type: ComponentType, role: string) => InfrastructureComponent | undefined;
}

export const createComponentLibrarySlice: StateCreator<
  StoreState,
  [],
  [],
  ComponentLibrarySlice
> = (set, get) => ({
  componentTemplates: [],
  
  initializeComponentTemplates: () => {
    set({ componentTemplates: [...allComponentTemplates] });
  },
  
  addComponentTemplate: (component) => {
    set((state) => {
      // Ensure component has all required properties
      const newComponent = {
        ...component,
        id: component.id || uuidv4(),
      } as InfrastructureComponent;
      
      // If the component is set as default, clear any existing defaults for this type/role
      let updatedTemplates = [...state.componentTemplates];
      if (newComponent.isDefault) {
        updatedTemplates = updatedTemplates.map(c => {
          if (c.type === newComponent.type && c.role === newComponent.role && c.id !== newComponent.id) {
            return { ...c, isDefault: false };
          }
          return c;
        });
      }
      
      updatedTemplates.push(newComponent);
      
      toast.success(`Added ${newComponent.name} to library`);
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  updateComponentTemplate: (id, updates) => {
    set((state) => {
      const existingIndex = state.componentTemplates.findIndex(c => c.id === id);
      
      if (existingIndex === -1) {
        toast.error("Component not found");
        return state;
      }
      
      const existingComponent = state.componentTemplates[existingIndex];
      const updatedComponent = {
        ...existingComponent,
        ...updates
      } as InfrastructureComponent;
      
      let updatedTemplates = [...state.componentTemplates];
      updatedTemplates[existingIndex] = updatedComponent;
      
      // If this component is being set as default, clear other defaults for same type/role
      if (updates.isDefault) {
        updatedTemplates = updatedTemplates.map(c => {
          if (c.id !== id && c.type === updatedComponent.type && c.role === updatedComponent.role) {
            return { ...c, isDefault: false };
          }
          return c;
        });
      }
      
      toast.success(`Updated ${updatedComponent.name}`);
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  cloneComponentTemplate: (id) => {
    set((state) => {
      const componentToClone = state.componentTemplates.find(c => c.id === id);
      
      if (!componentToClone) {
        toast.error("Component not found");
        return state;
      }
      
      const newComponent = {
        ...componentToClone,
        id: uuidv4(),
        name: `${componentToClone.name} (Copy)`,
        isDefault: false, // Cloned components are never default
      } as InfrastructureComponent;
      
      const updatedTemplates = [...state.componentTemplates, newComponent];
      
      toast.success(`Cloned ${componentToClone.name}`);
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  deleteComponentTemplate: (id) => {
    set((state) => {
      const componentToDelete = state.componentTemplates.find(c => c.id === id);
      
      if (!componentToDelete) {
        toast.error("Component not found");
        return state;
      }
      
      const updatedTemplates = state.componentTemplates.filter(c => c.id !== id);
      
      toast.success(`Deleted ${componentToDelete.name}`);
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  setDefaultComponent: (type, role, id) => {
    set((state) => {
      // First, clear the default flag for any component with the same type/role
      let updatedTemplates = state.componentTemplates.map(c => {
        if (c.type === type && c.role === role) {
          return { ...c, isDefault: c.id === id };
        }
        return c;
      });
      
      toast.success("Default component updated");
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  getDefaultComponent: (type, role) => {
    const state = get();
    return state.componentTemplates.find(c => 
      c.type === type && c.role === role && c.isDefault
    );
  }
});
