
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

// Initialize component templates - this should run only once
const initializeStore = () => {
  const state = useDesignStore.getState();
  
  // Only initialize if not already initialized
  if (state.componentTemplates.length === 0) {
    state.initializeComponentTemplates();
  }
  
  // Calculate component roles if needed
  if (state.componentRoles.length === 0) {
    state.calculateComponentRoles();
  }
};

// Call initialization once
initializeStore();

// Export a function to recalculate when needed
export const recalculateDesign = () => {
  useDesignStore.getState().calculateComponentRoles();
};
