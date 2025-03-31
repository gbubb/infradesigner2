
import { StateCreator } from 'zustand';
import { InfrastructureComponent } from '@/types/infrastructure';
import { StoreState } from '../../types';

export interface DesignUpdateSlice {
  // Method to directly update the active design
  updateActiveDesign: (components: InfrastructureComponent[]) => void;
}

export const createDesignUpdateSlice: StateCreator<
  StoreState,
  [],
  [],
  DesignUpdateSlice
> = (set, get, api) => ({
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
      
      console.log(`Updating active design with ${components.length} components`);
      
      // Create updated design with new components
      const updatedDesign = {
        ...state.activeDesign,
        components,
        updatedAt: new Date()
      };
      
      return {
        activeDesign: updatedDesign
      };
    });
  }
});
