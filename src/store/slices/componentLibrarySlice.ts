
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { InfrastructureComponent, ComponentType, Server, Switch } from '@/types/infrastructure';
import { StoreState } from '../types';
import { allComponentTemplates } from '@/data/componentData';
import { saveComponent, deleteComponent, loadComponents, saveComponents } from '@/services/componentService';

export interface ComponentLibrarySlice {
  // All available component templates
  componentTemplates: InfrastructureComponent[];
  
  // Initialize component templates
  initializeComponentTemplates: () => void;
  
  // Load components from database
  loadComponentsFromDB: () => Promise<void>;
  
  // Save all components to database
  saveAllComponentsToDB: () => Promise<void>;
  
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
    const templates = [...allComponentTemplates];
    
    // Set the first component of each unique type/role combination as default
    const typeRoleCombos = new Map();
    
    templates.forEach(template => {
      // Determine the role based on component type
      let role = template.role || 'default';
      
      // For servers, check serverRole
      if (template.type === ComponentType.Server) {
        const serverComponent = template as Server;
        if (serverComponent.serverRole) {
          role = serverComponent.serverRole;
        }
      }
      
      // For switches, check switchRole
      if (template.type === ComponentType.Switch) {
        const switchComponent = template as Switch;
        if (switchComponent.switchRole) {
          role = switchComponent.switchRole;
        }
      }
      
      // Create a unique key for the type-role combination
      const key = `${template.type}-${role}`;
      
      if (!typeRoleCombos.has(key)) {
        typeRoleCombos.set(key, template.id);
        template.isDefault = true;
      } else {
        template.isDefault = false;
      }
    });
    
    set({ componentTemplates: templates });
    
    // Save initialized templates to database
    const state = get();
    state.saveAllComponentsToDB();
  },
  
  loadComponentsFromDB: async () => {
    const components = await loadComponents();
    
    if (components && components.length > 0) {
      set({ componentTemplates: components });
      toast.success(`Loaded ${components.length} components from database`);
    } else {
      // If no components in DB, initialize with default data
      const state = get();
      if (state.componentTemplates.length === 0) {
        state.initializeComponentTemplates();
      }
    }
  },
  
  saveAllComponentsToDB: async () => {
    const state = get();
    const success = await saveComponents(state.componentTemplates);
    
    if (success) {
      toast.success(`Saved ${state.componentTemplates.length} components to database`);
    }
  },
  
  addComponentTemplate: (component) => {
    set((state) => {
      // Ensure component has all required properties
      const newComponent = {
        ...component,
        id: component.id || uuidv4(),
      } as InfrastructureComponent;
      
      // Determine the role based on component type
      let role = newComponent.role || 'default';
      
      if (newComponent.type === ComponentType.Server) {
        const serverComponent = newComponent as Server;
        if (serverComponent.serverRole) {
          role = serverComponent.serverRole;
        }
      }
      
      if (newComponent.type === ComponentType.Switch) {
        const switchComponent = newComponent as Switch;
        if (switchComponent.switchRole) {
          role = switchComponent.switchRole;
        }
      }
      
      // If the component is set as default, clear any existing defaults for this type/role
      let updatedTemplates = [...state.componentTemplates];
      if (newComponent.isDefault) {
        updatedTemplates = updatedTemplates.map(c => {
          // Check type first
          if (c.type === newComponent.type) {
            // Then determine the role of the existing component
            let existingRole = c.role || 'default';
            
            if (c.type === ComponentType.Server) {
              const serverComponent = c as Server;
              if (serverComponent.serverRole) {
                existingRole = serverComponent.serverRole;
              }
            }
            
            if (c.type === ComponentType.Switch) {
              const switchComponent = c as Switch;
              if (switchComponent.switchRole) {
                existingRole = switchComponent.switchRole;
              }
            }
            
            // If roles match, ensure only the new component is default
            if (existingRole === role && c.id !== newComponent.id) {
              return { ...c, isDefault: false };
            }
          }
          return c;
        });
      }
      
      updatedTemplates.push(newComponent);
      
      // Save the new component to database
      saveComponent(newComponent);
      
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
      
      // Ensure type stays the same during update
      const type = existingComponent.type;
      
      const updatedComponent = {
        ...existingComponent,
        ...updates,
        type // Explicitly preserve the original type
      } as InfrastructureComponent;
      
      // Determine roles for comparison
      let updatedRole = updatedComponent.role || 'default';
      
      if (updatedComponent.type === ComponentType.Server) {
        const serverComponent = updatedComponent as Server;
        if (serverComponent.serverRole) {
          updatedRole = serverComponent.serverRole;
        }
      }
      
      if (updatedComponent.type === ComponentType.Switch) {
        const switchComponent = updatedComponent as Switch;
        if (switchComponent.switchRole) {
          updatedRole = switchComponent.switchRole;
        }
      }
      
      let updatedTemplates = [...state.componentTemplates];
      updatedTemplates[existingIndex] = updatedComponent;
      
      // If this component is being set as default, clear other defaults for same type/role
      if (updates.isDefault) {
        updatedTemplates = updatedTemplates.map(c => {
          if (c.id !== id) {
            // Determine the role of the existing component
            let existingRole = c.role || 'default';
            
            if (c.type === ComponentType.Server && updatedComponent.type === ComponentType.Server) {
              const serverComponent = c as Server;
              if (serverComponent.serverRole) {
                existingRole = serverComponent.serverRole;
              }
            }
            
            if (c.type === ComponentType.Switch && updatedComponent.type === ComponentType.Switch) {
              const switchComponent = c as Switch;
              if (switchComponent.switchRole) {
                existingRole = switchComponent.switchRole;
              }
            }
            
            // If types and roles match, ensure only the updated component is default
            if (c.type === updatedComponent.type && existingRole === updatedRole) {
              return { ...c, isDefault: false };
            }
          }
          return c;
        });
      }
      
      // Save the updated component to database
      saveComponent(updatedComponent);
      
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
      
      // Save the cloned component to database
      saveComponent(newComponent);
      
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
      
      // Delete the component from database
      deleteComponent(id);
      
      toast.success(`Deleted ${componentToDelete.name}`);
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  setDefaultComponent: (type, role, id) => {
    set((state) => {
      // First, clear the default flag for any component with the same type/role
      let updatedTemplates = state.componentTemplates.map(c => {
        // Determine the role of the existing component
        let componentRole = c.role || 'default';
        
        if (c.type === ComponentType.Server && type === ComponentType.Server) {
          const serverComponent = c as Server;
          if (serverComponent.serverRole) {
            componentRole = serverComponent.serverRole;
          }
        }
        
        if (c.type === ComponentType.Switch && type === ComponentType.Switch) {
          const switchComponent = c as Switch;
          if (switchComponent.switchRole) {
            componentRole = switchComponent.switchRole;
          }
        }
        
        if (c.type === type && componentRole === role) {
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
    return state.componentTemplates.find(c => {
      // Check if the component is of the requested type
      if (c.type !== type) return false;
      
      // Determine the role of the component
      let componentRole = c.role || 'default';
      
      if (c.type === ComponentType.Server) {
        const serverComponent = c as Server;
        if (serverComponent.serverRole) {
          componentRole = serverComponent.serverRole;
        }
      }
      
      if (c.type === ComponentType.Switch) {
        const switchComponent = c as Switch;
        if (switchComponent.switchRole) {
          componentRole = switchComponent.switchRole;
        }
      }
      
      return componentRole === role && c.isDefault;
    });
  }
});

