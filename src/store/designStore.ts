
import { create } from 'zustand';
import { StoreState } from './types';
import { createRequirementsSlice, RequirementsSlice } from './slices/requirementsSlice';
import { createDesignSlice, DesignSlice } from './slices/designSlice';
import { createWorkspaceSlice, WorkspaceSlice } from './slices/workspaceSlice';

// Combined store type
export type DesignStoreState = RequirementsSlice & DesignSlice & WorkspaceSlice;

// Create the store with all slices combined
export const useDesignStore = create<DesignStoreState>()((...a) => ({
  ...createRequirementsSlice(...a),
  ...createDesignSlice(...a),
  ...createWorkspaceSlice(...a),
}));
