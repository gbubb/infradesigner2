
import { create } from 'zustand';
import { StoreState } from './types';
import { createRequirementsSlice, RequirementsSlice } from './slices/requirementsSlice';
import { createDesignSlice, DesignSlice } from './slices/designSlice';
import { createWorkspaceSlice, WorkspaceSlice } from './slices/workspaceSlice';
import { createComponentLibrarySlice, ComponentLibrarySlice } from './slices/componentLibrarySlice';

// Combined store type
export type DesignStoreState = RequirementsSlice & DesignSlice & WorkspaceSlice & ComponentLibrarySlice;

// Create the store with all slices combined
export const useDesignStore = create<DesignStoreState>()((...a) => ({
  ...createRequirementsSlice(...a),
  ...createDesignSlice(...a),
  ...createWorkspaceSlice(...a),
  ...createComponentLibrarySlice(...a),
}));

// Flag to track if initialization has occurred - prevents infinite loops
let storeInitialized = false;

// Initialize component templates - this should run only once
export const initializeStore = () => {
  // Skip if already initialized
  if (storeInitialized) return;
  
  const state = useDesignStore.getState();
  
  // Only initialize if not already initialized
  if (state.componentTemplates.length === 0) {
    state.initializeComponentTemplates();
  }
  
  // Calculate component roles if needed
  if (state.componentRoles.length === 0) {
    state.calculateComponentRoles();
  }
  
  // Mark as initialized
  storeInitialized = true;
};

// Call initialization once
initializeStore();

// Export a function to recalculate when needed - with flag to prevent loops
let isRecalculating = false;
export const recalculateDesign = () => {
  // Prevent concurrent recalculations that can cause infinite loops
  if (isRecalculating) return;
  
  try {
    isRecalculating = true;
    
    // Get the current state
    const state = useDesignStore.getState();
    
    // First calculate component roles
    state.calculateComponentRoles();
    
    // Then update the active design if it exists
    if (state.activeDesign) {
      // Get updated component data based on roles
      const updatedComponents = state.componentRoles
        .filter(role => role.assignedComponentId && role.adjustedRequiredCount && role.adjustedRequiredCount > 0)
        .map(role => {
          const componentTemplate = state.componentTemplates.find(
            c => c.id === role.assignedComponentId
          );
          
          if (!componentTemplate) return null;
          
          return {
            ...componentTemplate,
            quantity: role.adjustedRequiredCount || role.requiredCount,
            role: role.role
          };
        })
        .filter(Boolean);
      
      // Only update if we have components to update with
      if (updatedComponents.length > 0) {
        // Update the active design with new components
        state.updateActiveDesign(updatedComponents);
        console.log(`Updated design with ${updatedComponents.length} components`);
      } else {
        console.warn("No components found to update design with");
      }
    } else {
      console.warn("No active design to update");
    }
  } catch (error) {
    console.error("Error during design recalculation:", error);
  } finally {
    isRecalculating = false;
  }
};

// Export a manual recalculation function for UI usage
export const manualRecalculateDesign = () => {
  // Reset to ensure we can force a recalculation
  isRecalculating = false;
  recalculateDesign();
};
