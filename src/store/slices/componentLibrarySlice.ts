
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
      
      const updatedTemplates = [
        ...state.componentTemplates,
        newComponent
      ];
      
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
      
      const updatedTemplates = [...state.componentTemplates];
      updatedTemplates[existingIndex] = updatedComponent;
      
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
  }
});
