
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
        default: {
          // Fix: Create a safe string version of the type
          const typeStr = String(component.type);
          component.namingPrefix = typeStr.substring(0, 3).toUpperCase();
        }
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
    
    // Set default ruHeight if it's a rack-mountable device and doesn't have ruHeight already
    if (!component.ruHeight && ['Server', 'Switch', 'Router', 'Firewall'].includes(component.type)) {
      // Default to 1U if not specified
      component.ruHeight = 1;
    }
    
    // For patch panels, map ruSize to ruHeight for consistency
    if ((component.type === ComponentType.FiberPatchPanel || component.type === ComponentType.CopperPatchPanel) && 
        'ruSize' in component && !component.ruHeight) {
      component.ruHeight = component.ruSize;
    }
    
    // Ensure we have a component ID
    const componentToAdd = {
      ...component,
      id: component.id || uuidv4()
    } as InfrastructureComponent;
    
    set((state: StoreState) => {
      return { componentTemplates: [...state.componentTemplates, componentToAdd] };
    });
    
    // Make sure we're saving the complete component
    saveComponent(componentToAdd).then(success => {
      if (success) {
        toast.success(`Added component: ${component.name}`);
      }
    });
  },
  
  updateComponentTemplate: (id: string, updates: Partial<InfrastructureComponent>) => {
    // Log the update operation
    console.log('Starting update of component template:', { id, updates });
    
    set((state: StoreState) => {
      const index = state.componentTemplates.findIndex(c => c.id === id);
      
      if (index === -1) {
        toast.error("Component not found");
        return state;
      }
      
      // Get the existing component
      const existingComponent = state.componentTemplates[index];
      console.log('Existing component before update:', existingComponent);
      console.log('Updates to apply:', updates);
      
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
      
      // Ensure switchRole is updated properly if it's included in the updates
      if (updates.switchRole) {
        console.log('Explicitly setting switchRole to:', updates.switchRole);
        updatedComponent.switchRole = updates.switchRole;
      }
      
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
