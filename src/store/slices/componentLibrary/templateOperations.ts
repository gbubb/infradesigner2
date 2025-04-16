
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { StoreState } from '../../types';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import { saveComponent, deleteComponent } from '@/services/componentService';

export const handleTemplateOperations = (set: Function, get: () => StoreState) => ({
  addComponentTemplate: (component: InfrastructureComponent) => {
    // Log the component being added for debugging
    console.log('Adding component template:', component);
    
    set((state: StoreState) => {
      const newComponent = {
        ...component,
        id: component.id || uuidv4()
      } as InfrastructureComponent;
      
      return { componentTemplates: [...state.componentTemplates, newComponent] };
    });
    
    // Make sure we're saving the complete component
    saveComponent(component).then(success => {
      if (success) {
        toast.success(`Added component: ${component.name}`);
      }
    });
  },
  
  updateComponentTemplate: (id: string, updates: Partial<InfrastructureComponent>) => {
    set((state: StoreState) => {
      const index = state.componentTemplates.findIndex(c => c.id === id);
      
      if (index === -1) {
        toast.error("Component not found");
        return state;
      }
      
      // Get the existing component
      const existingComponent = state.componentTemplates[index];
      
      // Create the updated component with all properties preserved
      const updatedComponent = {
        ...existingComponent,
        ...updates
      } as InfrastructureComponent;
      
      // Log for debugging
      console.log('Updating component template:', { id, existing: existingComponent, updates, result: updatedComponent });
      
      const updatedTemplates = [...state.componentTemplates];
      updatedTemplates[index] = updatedComponent;
      
      // Save the full updated component to the database
      saveComponent(updatedComponent).then(success => {
        if (success) {
          toast.success(`Updated component: ${updatedComponent.name}`);
        }
      });
      
      return { componentTemplates: updatedTemplates };
    });
  },
  
  cloneComponentTemplate: (id: string) => {
    set((state: StoreState) => {
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
      
      saveComponent(clonedComponent).then(success => {
        if (success) {
          toast.success(`Cloned component: ${clonedComponent.name}`);
        }
      });
      
      return { 
        componentTemplates: [...state.componentTemplates, clonedComponent]
      };
    });
  },
  
  deleteComponentTemplate: (id: string) => {
    set((state: StoreState) => {
      const componentToDelete = state.componentTemplates.find(c => c.id === id);
      
      if (!componentToDelete) {
        toast.error("Component not found");
        return state;
      }
      
      if (componentToDelete.isDefault) {
        toast.error("Cannot delete a default component");
        return state;
      }
      
      deleteComponent(id).then(success => {
        if (success) {
          toast.success(`Deleted component: ${componentToDelete.name}`);
        }
      });
      
      return { 
        componentTemplates: state.componentTemplates.filter(c => c.id !== id)
      };
    });
  }
});
