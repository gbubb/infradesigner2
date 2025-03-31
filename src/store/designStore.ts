
import { create } from 'zustand';
import { StoreState } from './types';
import { createRequirementsSlice, RequirementsSlice } from './slices/requirementsSlice';
import { createDesignSlice, DesignSlice } from './slices/designSlice';
import { createWorkspaceSlice, WorkspaceSlice } from './slices/workspaceSlice';
import { createComponentLibrarySlice, ComponentLibrarySlice } from './slices/componentLibrarySlice';
import { initializeStore } from './initialization/storeInitialization';
import { recalculateDesign, manualRecalculateDesign } from './calculation/designRecalculation';

// Combined store type
export type DesignStoreState = RequirementsSlice & DesignSlice & WorkspaceSlice & ComponentLibrarySlice;

// Create the store with all slices combined
export const useDesignStore = create<DesignStoreState>()((...a) => ({
  ...createRequirementsSlice(...a),
  ...createDesignSlice(...a),
  ...createWorkspaceSlice(...a),
  ...createComponentLibrarySlice(...a),
}));

// Call initialization once
initializeStore();

// Re-export the recalculation functions for convenience
export { recalculateDesign, manualRecalculateDesign };
