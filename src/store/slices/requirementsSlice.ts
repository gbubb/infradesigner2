
import { StateCreator } from 'zustand';
import { StoreState } from '../types';
import { RequirementsSlice } from './requirements/types';
import { createRequirementsSliceOperations } from './requirements/operationsDispatcher';

/**
 * Creates the requirements slice for the store
 * This is now a thin wrapper around the actual implementation
 * which has been refactored into smaller files for better maintainability
 */
export const createRequirementsSlice: StateCreator<
  StoreState,
  [],
  [],
  RequirementsSlice
> = (set, get) => {
  return createRequirementsSliceOperations(set, get);
};

// Re-export for backward compatibility
export type { RequirementsSlice } from './requirements/types';
export { defaultRequirements } from './requirements/types';
