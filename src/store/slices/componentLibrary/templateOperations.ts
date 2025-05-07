
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { StoreState } from '../../types';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import { saveComponent, deleteComponent } from '@/services/componentService';

export const handleTemplateOperations = (set: Function, get: () => StoreState) => ({
  addComponentTemplate: (component: InfrastructureComponent) => {
    // Log the component being added for debugging
    console.log('Adding component template:', component);
    
    // Generate default naming prefix if not provided
    if (!component.namingPrefix) {
      switch(component.type) {
        case ComponentType.Server: component.namingPrefix = 'SRV'; break;
        case ComponentType.Switch: component.namingPrefix = 'SW'; break;
        case ComponentType.Router: component.namingPrefix = 'RTR'; break;
        case ComponentType.Firewall: component.namingPrefix = 'FW'; break;
        case ComponentType.Disk: component.namingPrefix = 'DSK'; break;
        case ComponentType.GPU: component.namingPrefix = 'GPU'; break;
        case ComponentType.FiberPatchPanel: component.namingPrefix = 'FPP'; break;
        case ComponentType.CopperPatchPanel: component.namingPrefix = 'CPP'; break;
        case ComponentType.Cassette: component.namingPrefix = 'CAS'; break;
        case ComponentType.Cable: component.namingPrefix = 'CBL'; break;
        default: component.namingPrefix = component.type.substring(0,3).toUpperCase();
      }
    }
    
    // Ensure placement is properly set
    if (!component.placement && ['Server', 'Switch', 'Router', 'Firewall', 'FiberPatchPanel', 'CopperPatchPanel'].includes(component.type)) {
      const physicalConstraints = get().activeDesign?.requirements?.physicalConstraints;
      const maxRackUnits = physicalConstraints?.rackUnitsPerRack || 42;
      
      component.placement = {
        validRUStart: component.validRUStart || 1,
        validRUEnd: component.validRUEnd || maxRackUnits,
        preferredRU: component.preferredRU || 1,
        preferredRack: component.preferredRack || 1
      };
      
      // Remove temporary form fields
      delete component.validRUStart;
      delete component.validRUEnd;
      delete component.preferredRU;
      delete component.preferredRack;
    }
    
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
      
      // Process placement fields if they exist in the form data
      if ('validRUStart' in updates || 'validRUEnd' in updates || 'preferredRU' in updates || 'preferredRack' in updates) {
        const physicalConstraints = get().activeDesign?.requirements?.physicalConstraints;
        const maxRackUnits = physicalConstraints?.rackUnitsPerRack || 42;
        
        updates.placement = {
          validRUStart: updates.validRUStart || existingComponent.placement?.validRUStart || 1,
          validRUEnd: updates.validRUEnd || existingComponent.placement?.validRUEnd || maxRackUnits,
          preferredRU: updates.preferredRU || existingComponent.placement?.preferredRU,
          preferredRack: updates.preferredRack || existingComponent.placement?.preferredRack
        };
        
        // Remove temporary form fields
        delete updates.validRUStart;
        delete updates.validRUEnd;
        delete updates.preferredRU;
        delete updates.preferredRack;
      }
      
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
