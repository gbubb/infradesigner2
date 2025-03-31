
import { useDesignStore } from '../designStore';
import { toast } from 'sonner';

// Flag to track if initialization has occurred - prevents infinite loops
let storeInitialized = false;

// Initialize component templates - this should run only once
export const initializeStore = () => {
  // Skip if already initialized
  if (storeInitialized) return;
  
  const state = useDesignStore.getState();
  
  // Only initialize if not already initialized
  if (state.componentTemplates.length === 0) {
    console.log("Initializing component templates");
    state.initializeComponentTemplates();
  }
  
  // Calculate component roles if needed
  if (state.componentRoles.length === 0) {
    state.calculateComponentRoles();
  }
  
  // Initialize selectedDisksByRole if it's empty
  if (Object.keys(state.selectedDisksByRole).length === 0) {
    // This is already an empty object, but making sure it's initialized
    state.selectedDisksByRole = {};
  }
  
  // Initialize selectedGPUsByRole if it's empty
  if (Object.keys(state.selectedGPUsByRole).length === 0) {
    state.selectedGPUsByRole = {};
  }
  
  // Auto-create a default design if none exists
  if (!state.activeDesign) {
    console.log("Creating default design");
    state.createNewDesign("Scenario A", "Auto-generated design based on requirements");
  }
  
  // Mark as initialized
  storeInitialized = true;
  console.log("Store initialized");
};
