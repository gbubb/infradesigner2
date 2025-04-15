import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { InfrastructureComponent, InfrastructureDesign } from '@/types/infrastructure';
import { StoreState } from '../types';
import { 
  saveDesign as saveDesignToDb, 
  deleteDesign as deleteDesignFromDb, 
  loadDesigns,
  exportDesign as exportDesignToFile,
  importDesign as importDesignFromFile,
  purgeAllDesigns
} from '@/services/designService';

export interface DesignSlice {
  // All saved designs
  savedDesigns: InfrastructureDesign[];
  
  // Currently active design
  activeDesign: InfrastructureDesign | null;
  
  // Create a new design
  createNewDesign: (name: string, description?: string, existingDesign?: InfrastructureDesign) => string;
  
  // Update the active design components
  updateActiveDesign: (components: InfrastructureComponent[]) => void;
  
  // Update an existing design
  updateDesign: (id: string, updates: Partial<InfrastructureDesign>) => void;
  
  // Delete a design
  deleteDesign: (id: string) => void;
  
  // Set active design
  setActiveDesign: (id: string) => void;
  
  // Save design to database
  saveDesign: () => void;
  
  // Export design to a file
  exportDesign: () => void;
  
  // Import design from a file
  importDesign: (file: File) => Promise<void>;
  
  // Load designs from database
  loadDesignsFromDB: () => Promise<void>;
  
  // Purge all designs from database
  purgeAllDesigns: () => Promise<void>;
}

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
      const requirements = existingDesign?.requirements || { ...state.requirements };
      
      newDesignId = uuidv4();
      
      const newDesign: InfrastructureDesign = {
        id: newDesignId,
        name,
        description: description || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        requirements,
        components: existingDesign?.components || [],
        componentRoles: existingDesign?.componentRoles || [],
        selectedDisksByRole: existingDesign?.selectedDisksByRole || {},
        selectedGPUsByRole: existingDesign?.selectedGPUsByRole || {}
      };
      
      const updatedDesigns = [...state.savedDesigns, newDesign];
      
      // Save to Supabase
      saveDesignToDb(newDesign).then(success => {
        if (success) {
          toast.success(`Created new design: ${name}`);
        }
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
      
      const updatedDesign: InfrastructureDesign = {
        ...state.activeDesign,
        components,
        updatedAt: new Date()
      };
      
      // Update in the saved designs list
      const updatedDesigns = state.savedDesigns.map(design => 
        design.id === updatedDesign.id ? updatedDesign : design
      );
      
      // Save to Supabase
      saveDesignToDb(updatedDesign).then(success => {
        if (success) {
          toast.success(`Updated design: ${updatedDesign.name}`);
        }
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
      const updatedDesign = {
        ...existingDesign,
        ...updates,
        updatedAt: new Date()
      };
      
      const updatedDesigns = [...state.savedDesigns];
      updatedDesigns[existingDesignIndex] = updatedDesign;
      
      // If this was the active design, update that too
      const newActiveDesign = 
        state.activeDesign && state.activeDesign.id === id 
          ? updatedDesign 
          : state.activeDesign;
      
      // Save to Supabase
      saveDesignToDb(updatedDesign).then(success => {
        if (success) {
          toast.success(`Updated design: ${updatedDesign.name}`);
        }
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
      
      // If this was the active design, set active to null or the first available
      let newActiveDesign = state.activeDesign;
      if (state.activeDesign && state.activeDesign.id === id) {
        newActiveDesign = updatedDesigns.length > 0 ? updatedDesigns[0] : null;
      }
      
      // Delete from Supabase
      deleteDesignFromDb(id).then(success => {
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
      
      // Set active design and restore component roles and disk/gpu configurations
      return { 
        activeDesign: design,
        // Reset component roles based on the design requirements
        componentRoles: design.componentRoles || [], // Use design's component roles if available
        requirements: design.requirements || state.requirements,
        // Restore disk configurations
        selectedDisksByRole: design.selectedDisksByRole || {},
        // Restore GPU configurations
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
    
    // Save current component roles and configurations to the design
    const updatedDesign = {
      ...state.activeDesign,
      // Save the component roles
      componentRoles: state.componentRoles,
      // Save disk configurations
      selectedDisksByRole: state.selectedDisksByRole,
      // Save GPU configurations
      selectedGPUsByRole: state.selectedGPUsByRole,
      // Save the requirements
      requirements: state.requirements,
      // Update timestamp
      updatedAt: new Date()
    };
    
    // Update the active design in the store
    set((state) => {
      const updatedDesigns = state.savedDesigns.map(design => 
        design.id === updatedDesign.id ? updatedDesign : design
      );
      
      return {
        savedDesigns: updatedDesigns,
        activeDesign: updatedDesign
      };
    });
    
    // Save to Supabase
    saveDesignToDb(updatedDesign).then(success => {
      if (success) {
        toast.success(`Saved design: ${updatedDesign.name}`);
      }
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
      // Check if a design with the same ID already exists
      const existingDesignIndex = state.savedDesigns.findIndex(d => d.id === importedDesign.id);
      
      if (existingDesignIndex !== -1) {
        // Update the existing design in the list
        const updatedDesigns = [...state.savedDesigns];
        updatedDesigns[existingDesignIndex] = importedDesign;
        
        // Save to Supabase
        saveDesignToDb(importedDesign);
        
        return {
          savedDesigns: updatedDesigns,
          activeDesign: importedDesign
        };
      } else {
        // Add as a new design
        const updatedDesigns = [...state.savedDesigns, importedDesign];
        
        // Save to Supabase
        saveDesignToDb(importedDesign);
        
        return {
          savedDesigns: updatedDesigns,
          activeDesign: importedDesign
        };
      }
    });
  },
  
  loadDesignsFromDB: async () => {
    try {
      const designs = await loadDesigns();
      
      if (designs && designs.length > 0) {
        set({ 
          savedDesigns: designs,
          // Don't automatically set active design
        });
        console.log(`Loaded ${designs.length} designs from database`);
      } else {
        set({ savedDesigns: [] });
      }
    } catch (error) {
      console.error("Error loading designs from database:", error);
      toast.error("Failed to load designs");
    }
  },
  
  purgeAllDesigns: async () => {
    try {
      const success = await purgeAllDesigns();
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
  }
});
