
import { useDesignStore } from '../designStore';
import { toast } from 'sonner';

// Flag to track if initialization has occurred
let storeInitialized = false;

export const initializeStore = async () => {
  if (storeInitialized) return;
  
  const state = useDesignStore.getState();
  
  try {
    // Set loading state
    state.setInitializing(true);
    
    await state.loadComponentsFromDB();
    
    if (state.componentRoles.length === 0) {
      state.calculateComponentRoles();
    }
    
    // Initialize role configurations if empty
    if (Object.keys(state.selectedDisksByRole).length === 0) {
      state.selectedDisksByRole = {};
    }
    
    if (Object.keys(state.selectedGPUsByRole).length === 0) {
      state.selectedGPUsByRole = {};
    }
    
    if (Object.keys(state.selectedCassettesByRole).length === 0) {
      state.selectedCassettesByRole = {};
    }
    
    await state.loadDesignsFromDB();
    
    storeInitialized = true;
    console.log("Store initialized");
  } catch (error) {
    console.error("Error during store initialization:", error);
    toast.error("Error initializing application data");
    
    if (state.componentTemplates.length === 0) {
      state.initializeComponentTemplates();
    }
    
    storeInitialized = true;
  } finally {
    // Clear loading state
    state.setInitializing(false);
  }
};

