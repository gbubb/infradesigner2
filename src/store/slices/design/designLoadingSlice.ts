
import { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { InfrastructureDesign } from '@/types/infrastructure';
import { StoreState } from '../../types';
import { loadPersistedData } from '@/utils/persistenceUtils';

export interface DesignLoadingSlice {
  // Load all designs from database
  loadDesigns: () => Promise<void>;
  
  // Load a specific design by ID
  loadDesign: (id: string) => void;
}

export const createDesignLoadingSlice: StateCreator<
  StoreState,
  [],
  [],
  DesignLoadingSlice
> = (set, get, api) => ({
  loadDesigns: async () => {
    try {
      const { designs } = await loadPersistedData();
      set({ savedDesigns: designs });
      toast.success(`Loaded ${designs.length} designs`);
    } catch (error) {
      console.error("Failed to load designs:", error);
      toast.error("Failed to load designs");
    }
  },
  
  loadDesign: (id) => {
    set((state) => {
      const design = state.savedDesigns.find(d => d.id === id);
      
      if (!design) {
        toast.error(`Design with ID ${id} not found`);
        return state;
      }
      
      toast.success(`Loaded design: ${design.name}`);
      
      return { 
        activeDesign: design,
        // Reset workspace when loading a new design
        placedComponents: {},
        workspaceComponents: []
      };
    });
    
    // Calculate roles immediately after loading a design
    setTimeout(() => {
      try {
        const state = get();
        if (state.calculateComponentRoles) {
          state.calculateComponentRoles();
        }
      } catch (error) {
        console.error("Error calculating roles for loaded design:", error);
      }
    }, 100);
  }
});
