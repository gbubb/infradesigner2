import { useDesignStore } from './designStore';
import { toast } from 'sonner';

// Flag to track if initialization has occurred - prevents infinite loops
let storeInitialized = false;

// Initialize component templates - this should run only once
export const initializeStore = async () => {
  // Skip if already initialized
  if (storeInitialized) return;
  
  const state = useDesignStore.getState();
  
  try {
    // First try to load components from database
    await state.loadComponentsFromDB();
    
    // Calculate component roles if needed
    if (!state.componentRoles || !Array.isArray(state.componentRoles) || state.componentRoles.length === 0) {
      state.calculateComponentRoles();
    }
    
    // Initialize selectedDisksByRole if it's empty or undefined
    if (!state.selectedDisksByRole || typeof state.selectedDisksByRole !== 'object') {
      useDesignStore.setState({ selectedDisksByRole: {} });
    }
    
    // Initialize selectedGPUsByRole if it's empty or undefined
    if (!state.selectedGPUsByRole || typeof state.selectedGPUsByRole !== 'object') {
      useDesignStore.setState({ selectedGPUsByRole: {} });
    }
    
    // Try to load designs from the database
    await state.loadDesignsFromDB();
    
    // Do NOT auto-create a design, keep activeDesign as null
    
    // Mark as initialized
    storeInitialized = true;
    console.log("Store initialized successfully");
  } catch (error) {
    console.error("Error during store initialization:", error);
    toast.error("Error initializing application data");
    
    // Even if there's an error, initialize with defaults
    if (!state.componentTemplates || !Array.isArray(state.componentTemplates) || state.componentTemplates.length === 0) {
      state.initializeComponentTemplates();
    }
    
    // Initialize state with empty objects if they're missing
    const updates: any = {};
    
    if (!state.selectedDisksByRole || typeof state.selectedDisksByRole !== 'object') {
      updates.selectedDisksByRole = {};
    }
    
    if (!state.selectedGPUsByRole || typeof state.selectedGPUsByRole !== 'object') {
      updates.selectedGPUsByRole = {};
    }
    
    if (!state.componentRoles || !Array.isArray(state.componentRoles)) {
      updates.componentRoles = [];
    }
    
    if (Object.keys(updates).length > 0) {
      useDesignStore.setState(updates);
    }
    
    storeInitialized = true;
    console.log("Store initialized with defaults due to error");
  }
};
