
import { StateCreator } from 'zustand';
import { InfrastructureComponent } from '@/types/infrastructure';
import { StoreState } from '../../types';

export interface DesignComponentsSlice {
  // Get all available components for selection
  getAvailableComponents: () => InfrastructureComponent[];
}

export const createDesignComponentsSlice: StateCreator<
  StoreState,
  [],
  [],
  DesignComponentsSlice
> = (set, get) => ({
  // Method to get all available components
  getAvailableComponents: () => {
    const state = get();
    // Combine all component sources - custom components and template components
    return [...state.componentTemplates];
  }
});
