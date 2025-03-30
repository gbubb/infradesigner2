
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { InfrastructureDesign, InfrastructureComponent } from '@/types/infrastructure';
import { StoreState } from '../types';

export interface DesignSlice {
  // Saved designs
  savedDesigns: InfrastructureDesign[];
  // Currently active design
  activeDesign: InfrastructureDesign | null;
  
  // Save the current design
  saveDesign: () => void;
  
  // Create a new design
  createNewDesign: (name: string, description?: string) => void;
  
  // Get all available components for selection
  getAvailableComponents: () => InfrastructureComponent[];
  
  // Update the active design
  updateActiveDesign: (components: InfrastructureComponent[]) => void;
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
        // Filter out component roles that don't have an assigned component
        const assignedComponents: InfrastructureComponent[] = state.componentRoles
          .filter(role => role.assignedComponentId && role.adjustedRequiredCount && role.adjustedRequiredCount > 0)
          .map(role => {
            // Look in all component sources (templates and custom components)
            const componentTemplate = state.componentTemplates.find(
              c => c.id === role.assignedComponentId
            );
            
            if (!componentTemplate) {
              console.error(`Component not found for role: ${role.role}`);
              return null;
            }

            // Clone and return with proper typing - add role to the component
            const component: InfrastructureComponent = {
              ...componentTemplate,
              quantity: role.adjustedRequiredCount || role.requiredCount,
              role: role.role // Add the role to the component
            };
            
            return component;
          })
          .filter(Boolean) as InfrastructureComponent[]; // Filter out any null values

        // Create or update activeDesign
        let designToSave: InfrastructureDesign;
        
        if (state.activeDesign) {
          designToSave = { 
            ...state.activeDesign, 
            components: assignedComponents,
            requirements: state.requirements,
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

  // Method to directly update the active design
  updateActiveDesign: (components) => {
    set((state) => {
      if (!state.activeDesign) {
        console.warn("Cannot update: No active design");
        return state;
      }
      
      // Make sure components isn't empty - if it is, preserve the existing components
      if (!components || components.length === 0) {
        console.warn("No components provided for update - preserving existing components");
        return state; // Return state unchanged
      }
      
      // Create updated design with new components
      const updatedDesign = {
        ...state.activeDesign,
        components,
        updatedAt: new Date()
      };
      
      console.log(`Updated design with ${components.length} components`);
      
      return {
        activeDesign: updatedDesign
      };
    });
  },

  // Method to get all available components
  getAvailableComponents: () => {
    const state = get();
    // Combine all component sources - custom components and template components
    return [...state.componentTemplates];
  }
});
