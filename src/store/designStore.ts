
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

// Export a function to recalculate when needed - but don't trigger it automatically
export const recalculateDesign = () => {
  useDesignStore.getState().calculateComponentRoles();
};
