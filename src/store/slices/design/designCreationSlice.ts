
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { InfrastructureDesign } from '@/types/infrastructure';
import { StoreState } from '../../types';
import { persistDesign } from '@/utils/persistenceUtils';

export interface DesignCreationSlice {
  // Create a new design
  createNewDesign: (name: string, description?: string) => void;
}

export const createDesignCreationSlice: StateCreator<
  StoreState,
  [],
  [],
  DesignCreationSlice
> = (set, get, api) => ({
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
    
    // Persist the new design
    persistDesign(newDesign).catch(err => {
      console.error('Failed to persist new design:', err);
    });
    
    toast.success("New design created");
    
    // Calculate roles immediately after creating a new design
    setTimeout(() => {
      try {
        const state = get();
        if (state.calculateComponentRoles) {
          state.calculateComponentRoles();
        }
      } catch (error) {
        console.error("Error calculating roles for new design:", error);
      }
    }, 100);
  }
});
