
import { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { StoreState } from '../types';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';
import { loadComponents, saveComponent, saveComponents, deleteComponent } from '@/services/componentService';
import { defaultComponents } from '@/data/componentData';

export interface ComponentLibrarySlice {
  // Component templates array
  componentTemplates: InfrastructureComponent[];
  
  // Default component methods
  getDefaultComponent: (type: ComponentType, role: string) => InfrastructureComponent | undefined;
  setDefaultComponent: (type: ComponentType, role: string, id: string) => void;
  
  // Component library methods
  initializeComponentTemplates: () => void;
  loadComponentsFromDB: () => Promise<void>;
  saveAllComponentsToDB: () => Promise<void>;
  addComponentTemplate: (component: InfrastructureComponent) => void;
  updateComponentTemplate: (id: string, updates: Partial<InfrastructureComponent>) => void;
  cloneComponentTemplate: (id: string) => void;
  deleteComponentTemplate: (id: string) => void;
}

export const createComponentLibrarySlice: StateCreator<
  StoreState,
  [],
  [],
  ComponentLibrarySlice
> = (set, get) => ({
  componentTemplates: [],
  
  getDefaultComponent: (type: ComponentType, role: string) => {
    const state = get();
    return state.componentTemplates.find(c => 
      c.type === type && 
      ((c as any).serverRole === role || (c as any).switchRole === role) && 
      c.isDefault
    );
  },
  
  setDefaultComponent: (type: ComponentType, role: string, id: string) => {
    set((state) => {
      // First, unset any existing defaults for this type and role
      const updatedTemplates = state.componentTemplates.map(c => {
        if (c.type === type && ((c as any).serverRole === role || (c as any).switchRole === role)) {
          return { ...c, isDefault: c.id === id };
        }
        return c;
      });
      
      return { componentTemplates: updatedTemplates };
    });
    
    // Save to database
    get().saveAllComponentsToDB();
  },
  
  initializeComponentTemplates: () => {
    set({ componentTemplates: defaultComponents });
    
    // Save the initialized templates to database
    get().saveAllComponentsToDB();
  },
  
  loadComponentsFromDB: async () => {
    try {
      const components = await loadComponents();
      
      if (components && components.length > 0) {
        set({ componentTemplates: components });
        console.log(`Loaded ${components.length} components from database`);
      } else {
        // If no components found in DB, initialize with defaults
        get().initializeComponentTemplates();
      }
    } catch (error) {
      console.error("Error loading components from database:", error);
      toast.error("Failed to load component templates");
      
      // Fall back to default components
      get().initializeComponentTemplates();
    }
  },
  
  saveAllComponentsToDB: async () => {
    const { componentTemplates } = get();
    await saveComponents(componentTemplates);
    return;
  },
  
  addComponentTemplate: (component: InfrastructureComponent) => {
    set((state) => {
      // Ensure the component has an ID
      const newComponent = {
        ...component,
        id: component.id || uuidv4()
      } as InfrastructureComponent;
      
      // Add to state
      const updatedTemplates = [...state.componentTemplates, newComponent];
      
      return { componentTemplates: updatedTemplates };
    });
    
    // Save to database
    saveComponent(component).then(success => {
      if (success) {
        toast.success(`Added component: ${component.name}`);
      }
    });
  },
  
  updateComponentTemplate: (id: string, updates: Partial<InfrastructureComponent>) => {
    set((state) => {
      const index = state.componentTemplates.findIndex(c => c.id === id);
      
      if (index === -1) {
        toast.error("Component not found");
        return state;
      }
      
      const updatedComponent = {
        ...state.componentTemplates[index],
        ...updates
      } as InfrastructureComponent;
      
      const updatedTemplates = [...state.componentTemplates];
      updatedTemplates[index] = updatedComponent;
      
      // Save to database
      saveComponent(updatedComponent).then(success => {
        if (success) {
          toast.success(`Updated component: ${updatedComponent.name}`);
        }
      });
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  cloneComponentTemplate: (id: string) => {
    set((state) => {
      const componentToClone = state.componentTemplates.find(c => c.id === id);
      
      if (!componentToClone) {
        toast.error("Component not found");
        return state;
      }
      
      const clonedComponent = {
        ...componentToClone,
        id: uuidv4(),
        name: `${componentToClone.name} (Copy)`,
        isDefault: false
      } as InfrastructureComponent;
      
      const updatedTemplates = [...state.componentTemplates, clonedComponent];
      
      // Save to database
      saveComponent(clonedComponent).then(success => {
        if (success) {
          toast.success(`Cloned component: ${clonedComponent.name}`);
        }
      });
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  deleteComponentTemplate: (id: string) => {
    set((state) => {
      const componentToDelete = state.componentTemplates.find(c => c.id === id);
      
      if (!componentToDelete) {
        toast.error("Component not found");
        return state;
      }
      
      if (componentToDelete.isDefault) {
        toast.error("Cannot delete a default component");
        return state;
      }
      
      const updatedTemplates = state.componentTemplates.filter(c => c.id !== id);
      
      // Delete from database
      deleteComponent(id).then(success => {
        if (success) {
          toast.success(`Deleted component: ${componentToDelete.name}`);
        }
      });
      
      return { componentTemplates: updatedTemplates };
    });
  }
});
