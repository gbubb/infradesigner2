
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
  purgeAllDesignsFromDB
} from './databaseOperations';
import {
  createNewDesignOperation,
  updateDesignOperation,
  updateActiveDesignOperation
} from './designOperations';

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
      
      const updatedDesigns = [...state.savedDesigns, newDesign];
      
      saveDesignToDB(newDesign).then(success => {
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
      
      const updatedDesign = updateActiveDesignOperation(state.activeDesign, components);
      
      const updatedDesigns = state.savedDesigns.map(design => 
        design.id === updatedDesign.id ? updatedDesign : design
      );
      
      saveDesignToDB(updatedDesign).then(success => {
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
      const updatedDesign = updateDesignOperation(existingDesign, updates);
      
      const updatedDesigns = [...state.savedDesigns];
      updatedDesigns[existingDesignIndex] = updatedDesign;
      
      const newActiveDesign = 
        state.activeDesign && state.activeDesign.id === id 
          ? updatedDesign 
          : state.activeDesign;
      
      saveDesignToDB(updatedDesign).then(success => {
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
    
    const updatedDesign = {
      ...state.activeDesign,
      componentRoles: state.componentRoles,
      selectedDisksByRole: state.selectedDisksByRole,
      selectedGPUsByRole: state.selectedGPUsByRole,
      requirements: state.requirements,
      updatedAt: new Date()
    };
    
    set((state) => {
      const updatedDesigns = state.savedDesigns.map(design => 
        design.id === updatedDesign.id ? updatedDesign : design
      );
      
      return {
        savedDesigns: updatedDesigns,
        activeDesign: updatedDesign
      };
    });
    
    saveDesignToDB(updatedDesign).then(success => {
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
      const existingDesignIndex = state.savedDesigns.findIndex(d => d.id === importedDesign.id);
      
      if (existingDesignIndex !== -1) {
        const updatedDesigns = [...state.savedDesigns];
        updatedDesigns[existingDesignIndex] = importedDesign;
        
        saveDesignToDB(importedDesign);
        
        return {
          savedDesigns: updatedDesigns,
          activeDesign: importedDesign
        };
      } else {
        const updatedDesigns = [...state.savedDesigns, importedDesign];
        
        saveDesignToDB(importedDesign);
        
        return {
          savedDesigns: updatedDesigns,
          activeDesign: importedDesign
        };
      }
    });
  },
  
  loadDesignsFromDB: async () => {
    try {
      const designs = await loadDesignsFromDB();
      
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
  }
});

