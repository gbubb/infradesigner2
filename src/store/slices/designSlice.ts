
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { InfrastructureDesign, InfrastructureComponent } from '@/types/infrastructure';
import { StoreState } from '../types';
import { allComponentTemplates } from '@/data/componentData';

export interface DesignSlice {
  // Saved designs
  savedDesigns: InfrastructureDesign[];
  // Currently active design
  activeDesign: InfrastructureDesign | null;
  
  // Save the current design
  saveDesign: () => void;
  
  // Create a new design
  createNewDesign: (name: string, description?: string) => void;
}

export const createDesignSlice: StateCreator<
  StoreState,
  [],
  [],
  DesignSlice
> = (set, get) => ({
  savedDesigns: [],
  activeDesign: null,
  
  createNewDesign: (name, description) => {
    const newDesign: InfrastructureDesign = {
      id: uuidv4(),
      name: name || `Design ${get().savedDesigns.length + 1}`,
      description,
      createdAt: new Date(),
      requirements: get().requirements,
      components: []
    };
    
    set({
      activeDesign: newDesign,
      placedComponents: {},
      workspaceComponents: []
    });
    
    toast.success("New design created");
  },

  saveDesign: () => {
    set((state) => {
      try {
        // Here, we need to properly type the components
        const assignedComponents: InfrastructureComponent[] = state.componentRoles
          .filter(role => role.assignedComponentId)
          .map(role => {
            const componentTemplate = allComponentTemplates.find(
              c => c.id === role.assignedComponentId
            );
            
            if (!componentTemplate) {
              throw new Error(`Component not found for role: ${role.role}`);
            }

            // Clone and return with proper typing - add role to the component
            const component: InfrastructureComponent = {
              ...componentTemplate,
              quantity: role.adjustedRequiredCount || role.requiredCount,
              role: role.role // Add the role to the component
            };
            
            return component;
          });

        // Create or update activeDesign
        let designToSave: InfrastructureDesign;
        
        if (state.activeDesign) {
          designToSave = { 
            ...state.activeDesign, 
            components: assignedComponents,
            updatedAt: new Date()
          };
        } else {
          designToSave = {
            id: uuidv4(),
            name: `Design ${state.savedDesigns.length + 1}`,
            createdAt: new Date(),
            requirements: state.requirements,
            components: assignedComponents
          };
        }

        // Save the design - now with properly typed components
        const updatedDesigns = [...state.savedDesigns, designToSave];
        
        toast.success("Design saved successfully!");
        return { 
          savedDesigns: updatedDesigns,
          activeDesign: designToSave
        };
      } catch (error) {
        console.error("Failed to save design:", error);
        toast.error("Failed to save design");
        return state;
      }
    });
  },
});
