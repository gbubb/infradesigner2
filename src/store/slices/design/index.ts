
import { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { StoreState } from '../../types';
import { DesignSlice } from './types';
import {
  saveDesignToDB,
  deleteDesignFromDB,
  loadDesignsFromDB,
  exportDesignToFile,
  importDesignFromFile,
  purgeAllDesignsFromDB,
  togglePublicAccessInDB,
  loadSharedDesignFromDB
} from './databaseOperations';
import {
  createNewDesignOperation,
  updateDesignOperation,
  updateActiveDesignOperation
} from './designOperations';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { ClusterAZAssignment, InfrastructureDesign } from '@/types/infrastructure';
import { debounce, DEBOUNCE_DELAYS } from '@/utils/debounce';

// Create debounced save function outside the slice to persist between renders
const debouncedSaveToDatabase = debounce(
  async (updatedDesign: InfrastructureDesign, userId?: string) => {
    const success = await saveDesignToDB(updatedDesign, userId);
    if (success) {
      toast.success(`Saved design: ${updatedDesign.name}`);
    }
  },
  DEBOUNCE_DELAYS.SAVE
);

export const createDesignSlice: StateCreator<
  StoreState,
  [],
  [],
  DesignSlice
> = (set, get) => ({
  savedDesigns: [],
  activeDesign: null,
  
  createNewDesign: (name, description, existingDesign = null) => {
    let newDesignId = '';
    
    set((state) => {
      const newDesign = createNewDesignOperation(name, description, existingDesign, state.requirements);
      newDesignId = newDesign.id;
      
      // Ensure the design has a sharing_id
      newDesign.sharing_id = uuidv4();
      
      const updatedDesigns = [...state.savedDesigns, newDesign];
      
      // Get the current user's ID
      const user = supabase.auth.getUser().then(({ data }) => {
        const userId = data?.user?.id;
        
        // Save with user ID if available
        saveDesignToDB(newDesign, userId).then(success => {
          if (success) {
            toast.success(`Created new design: ${name}`);
          }
        });
      });
      
      return {
        savedDesigns: updatedDesigns,
        activeDesign: newDesign
      };
    });
    
    return newDesignId;
  },
  
  updateActiveDesign: (components) => {
    set((state) => {
      if (!state.activeDesign) {
        toast.error("No active design to update");
        return state;
      }
      
      // Include current disk and GPU selections in the design update
      const designWithSelections = {
        ...state.activeDesign,
        selectedDisksByRole: state.selectedDisksByRole,
        selectedGPUsByRole: state.selectedGPUsByRole,
        componentRoles: state.componentRoles
      };
      
      const updatedDesign = updateActiveDesignOperation(designWithSelections, components);
      
      const updatedDesigns = state.savedDesigns.map(design => 
        design.id === updatedDesign.id ? updatedDesign : design
      );
      
      // Get the current user's ID
      supabase.auth.getUser().then(({ data }) => {
        const userId = data?.user?.id;
        
        // Save with user ID if available
        saveDesignToDB(updatedDesign, userId).then(success => {
          if (success) {
            // Commented out to reduce noise - too many updates happen automatically
            // toast.success(`Updated design: ${updatedDesign.name}`);
          }
        });
      });
      
      return {
        savedDesigns: updatedDesigns,
        activeDesign: updatedDesign
      };
    });
  },
  
  updateDesign: (id, updates) => {
    set((state) => {
      const existingDesignIndex = state.savedDesigns.findIndex(d => d.id === id);
      
      if (existingDesignIndex === -1) {
        toast.error("Design not found");
        return state;
      }
      
      const existingDesign = state.savedDesigns[existingDesignIndex];
      const updatedDesign = updateDesignOperation(existingDesign, updates);
      
      // Ensure the design has a sharing_id
      if (!updatedDesign.sharing_id) {
        updatedDesign.sharing_id = uuidv4();
      }
      
      const updatedDesigns = [...state.savedDesigns];
      updatedDesigns[existingDesignIndex] = updatedDesign;
      
      const newActiveDesign = 
        state.activeDesign && state.activeDesign.id === id 
          ? updatedDesign 
          : state.activeDesign;
      
      // Get the current user's ID
      supabase.auth.getUser().then(({ data }) => {
        const userId = data?.user?.id;
        
        // Save with user ID if available
        saveDesignToDB(updatedDesign, userId).then(success => {
          if (success) {
            // Commented out to reduce noise - too many updates happen automatically
            // toast.success(`Updated design: ${updatedDesign.name}`);
          }
        });
      });
      
      return {
        savedDesigns: updatedDesigns,
        activeDesign: newActiveDesign
      };
    });
  },
  
  deleteDesign: (id) => {
    set((state) => {
      const designToDelete = state.savedDesigns.find(d => d.id === id);
      
      if (!designToDelete) {
        toast.error("Design not found");
        return state;
      }
      
      const updatedDesigns = state.savedDesigns.filter(d => d.id !== id);
      
      let newActiveDesign = state.activeDesign;
      if (state.activeDesign && state.activeDesign.id === id) {
        newActiveDesign = updatedDesigns.length > 0 ? updatedDesigns[0] : null;
      }
      
      deleteDesignFromDB(id).then(success => {
        if (success) {
          toast.success(`Deleted design: ${designToDelete.name}`);
        }
      });
      
      return {
        savedDesigns: updatedDesigns,
        activeDesign: newActiveDesign
      };
    });
  },
  
  setActiveDesign: (id) => {
    set((state) => {
      const design = state.savedDesigns.find(d => d.id === id);
      
      if (!design) {
        toast.error("Design not found");
        return state;
      }
      
      toast.success(`Switched to design: ${design.name}`);
      
      // Debug log to track disk configuration when loading
      console.log('[setActiveDesign] Loading disk configuration:', {
        selectedDisksByRole: design.selectedDisksByRole || {},
        componentRoles: (design.componentRoles || []).filter(r => r.role === 'hyperConvergedNode').map(r => ({
          id: r.id,
          role: r.role,
          clusterId: r.clusterInfo?.clusterId
        }))
      });
      
      return { 
        activeDesign: design,
        componentRoles: design.componentRoles || [],
        requirements: design.requirements || state.requirements,
        selectedDisksByRole: design.selectedDisksByRole || {},
        selectedGPUsByRole: design.selectedGPUsByRole || {},
      };
    });
  },
  
  saveDesign: () => {
    const state = get();
    if (!state.activeDesign) {
      toast.error("No active design to save");
      return;
    }
    
    // Debug log to track disk configuration
    console.log('[saveDesign] Saving disk configuration:', {
      selectedDisksByRole: state.selectedDisksByRole,
      componentRoles: state.componentRoles.filter(r => r.role === 'hyperConvergedNode').map(r => ({
        id: r.id,
        role: r.role,
        clusterId: r.clusterInfo?.clusterId
      }))
    });
    
    const updatedDesign = {
      ...state.activeDesign,
      componentRoles: state.componentRoles,
      selectedDisksByRole: state.selectedDisksByRole,
      selectedGPUsByRole: state.selectedGPUsByRole,
      requirements: state.requirements,
      updatedAt: new Date()
    };
    
    // Ensure the design has a sharing_id
    if (!updatedDesign.sharing_id) {
      updatedDesign.sharing_id = uuidv4();
    }
    
    set((state) => {
      const updatedDesigns = state.savedDesigns.map(design => 
        design.id === updatedDesign.id ? updatedDesign : design
      );
      
      return {
        savedDesigns: updatedDesigns,
        activeDesign: updatedDesign
      };
    });
    
    // Get the current user's ID and use debounced save
    supabase.auth.getUser().then(({ data }) => {
      const userId = data?.user?.id;
      
      // Use debounced save to avoid excessive database writes
      debouncedSaveToDatabase(updatedDesign, userId);
    });
  },
  
  exportDesign: () => {
    const state = get();
    if (!state.activeDesign) {
      toast.error("No active design to export");
      return;
    }
    
    exportDesignToFile(state.activeDesign);
  },
  
  importDesign: async (file: File) => {
    const importedDesign = await importDesignFromFile(file);
    
    if (!importedDesign) {
      return;
    }
    
    set((state) => {
      const existingDesignIndex = state.savedDesigns.findIndex(d => d.id === importedDesign.id);
      
      if (existingDesignIndex !== -1) {
        const updatedDesigns = [...state.savedDesigns];
        updatedDesigns[existingDesignIndex] = importedDesign;
        
        // Get the current user's ID for saving
        supabase.auth.getUser().then(({ data }) => {
          const userId = data?.user?.id;
          saveDesignToDB(importedDesign, userId);
        });
        
        return {
          savedDesigns: updatedDesigns,
          activeDesign: importedDesign
        };
      } else {
        const updatedDesigns = [...state.savedDesigns, importedDesign];
        
        // Get the current user's ID for saving
        supabase.auth.getUser().then(({ data }) => {
          const userId = data?.user?.id;
          saveDesignToDB(importedDesign, userId);
        });
        
        return {
          savedDesigns: updatedDesigns,
          activeDesign: importedDesign
        };
      }
    });
  },
  
  loadDesignsFromDB: async () => {
    try {
      // Get the current user ID
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      
      // Load designs for this user
      const designs = userId ? await loadDesignsFromDB(userId) : [];
      
      if (designs && designs.length > 0) {
        set({ savedDesigns: designs });
        console.log(`Loaded ${designs.length} designs from database`);
      } else {
        set({ savedDesigns: [] });
      }
    } catch (error) {
      console.error("Error loading designs from database:", error);
      toast.error("Failed to load designs");
    }
  },
  
  loadSharedDesign: async (sharingId: string) => {
    try {
      const design = await loadSharedDesignFromDB(sharingId);
      
      if (design) {
        // Set the shared design as active but read-only
        set((state) => {
          // Add to designs list if not already present
          const existingDesignIndex = state.savedDesigns.findIndex(d => d.id === design.id);
          
          if (existingDesignIndex === -1) {
            return {
              activeDesign: design,
              componentRoles: design.componentRoles || [],
              requirements: design.requirements || state.requirements,
              selectedDisksByRole: design.selectedDisksByRole || {},
              selectedGPUsByRole: design.selectedGPUsByRole || {}
            };
          } else {
            return {
              activeDesign: design,
              componentRoles: design.componentRoles || [],
              requirements: design.requirements || state.requirements,
              selectedDisksByRole: design.selectedDisksByRole || {},
              selectedGPUsByRole: design.selectedGPUsByRole || {}
            };
          }
        });
        
        toast.success(`Loaded shared design: ${design.name}`);
        return true;
      } else {
        toast.error("Shared design not found or not public");
        return false;
      }
    } catch (error) {
      console.error("Error loading shared design:", error);
      toast.error("Failed to load shared design");
      return false;
    }
  },
  
  togglePublicAccess: async (id: string) => {
    set((state) => {
      const designIndex = state.savedDesigns.findIndex(d => d.id === id);
      
      if (designIndex === -1) {
        toast.error("Design not found");
        return state;
      }
      
      const design = state.savedDesigns[designIndex];
      const isPublic = !design.is_public;
      
      const updatedDesign = {
        ...design,
        is_public: isPublic
      };
      
      const updatedDesigns = [...state.savedDesigns];
      updatedDesigns[designIndex] = updatedDesign;
      
      const newActiveDesign = 
        state.activeDesign && state.activeDesign.id === id 
          ? updatedDesign 
          : state.activeDesign;
      
      // Update public access in DB
      togglePublicAccessInDB(id, isPublic).then(success => {
        if (success) {
          toast.success(`Design is now ${isPublic ? 'public' : 'private'}`);
        }
      });
      
      return {
        savedDesigns: updatedDesigns,
        activeDesign: newActiveDesign
      };
    });
  },
  
  purgeAllDesigns: async () => {
    try {
      const success = await purgeAllDesignsFromDB();
      if (success) {
        set({ 
          savedDesigns: [],
          activeDesign: null
        });
      }
    } catch (error) {
      console.error("Error purging designs from database:", error);
      toast.error("Failed to purge designs");
    }
  },
  
  updatePlacementRules: async (rules: ClusterAZAssignment[]) => {
    const state = get();
    
    if (!state.activeDesign) {
      toast.error("No active design to update");
      return;
    }
    
    const updatedDesign = {
      ...state.activeDesign,
      placementRules: rules,
      updatedAt: new Date()
    };
    
    const updatedDesigns = state.savedDesigns.map(design => 
      design.id === updatedDesign.id ? updatedDesign : design
    );
    
    set({
      savedDesigns: updatedDesigns,
      activeDesign: updatedDesign
    });
    
    // Get the current user's ID
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      
      // Save with user ID if available
      const success = await saveDesignToDB(updatedDesign, userId);
      if (!success) {
        toast.error("Failed to save placement rules");
      }
    } catch (error) {
      console.error("Error saving placement rules:", error);
      toast.error("Failed to save placement rules");
    }
  }
});
