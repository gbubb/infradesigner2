
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { InfrastructureDesign } from '@/types/infrastructure';
import { StoreState } from '../../types';

export interface DesignCreationSlice {
  // Create a new design
  createNewDesign: (name: string, description?: string) => void;
}

export const createDesignCreationSlice: StateCreator<
  StoreState,
  [],
  [],
  DesignCreationSlice
> = (set, get) => ({
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
