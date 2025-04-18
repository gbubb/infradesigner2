
import { create } from 'zustand';
import { DesignStoreState } from './types/designStoreTypes';
import { createRequirementsSlice } from './slices/requirementsSlice';
import { createDesignSlice } from './slices/designSlice';
import { createWorkspaceSlice } from './slices/workspaceSlice';
import { createComponentLibrarySlice } from './slices/componentLibrary';
import { initializeStore } from './initialization/storeInitializer';
import { recalculateDesign, manualRecalculateDesign } from './calculations/designCalculator';

// Create the store with all slices combined
export const useDesignStore = create<DesignStoreState>()((...a) => ({
  ...createRequirementsSlice(...a),
  ...createDesignSlice(...a),
  ...createWorkspaceSlice(...a),
  ...createComponentLibrarySlice(...a),
}));

// Export initialization function
export { initializeStore };

// Export calculation functions
export { recalculateDesign, manualRecalculateDesign };
