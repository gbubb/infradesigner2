import { create } from 'zustand';
import { StoreState } from './types';
import { createRequirementsSlice, RequirementsSlice } from './slices/requirementsSlice';
import { createDesignSlice, DesignSlice } from './slices/designSlice';
import { createWorkspaceSlice, WorkspaceSlice } from './slices/workspaceSlice';
import { createComponentLibrarySlice, ComponentLibrarySlice } from './slices/componentLibrarySlice';
import { toast } from 'sonner';

// Combined store type
export type DesignStoreState = RequirementsSlice & DesignSlice & WorkspaceSlice & ComponentLibrarySlice;

// Create the store with all slices combined
export const useDesignStore = create<DesignStoreState>()((...a) => ({
  ...createRequirementsSlice(...a),
  ...createDesignSlice(...a),
  ...createWorkspaceSlice(...a),
  ...createComponentLibrarySlice(...a),
}));

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
    if (state.componentRoles.length === 0) {
      state.calculateComponentRoles();
    }
    
    // Initialize selectedDisksByRole if it's empty
    if (Object.keys(state.selectedDisksByRole).length === 0) {
      state.selectedDisksByRole = {};
    }
    
    // Initialize selectedGPUsByRole if it's empty
    if (Object.keys(state.selectedGPUsByRole).length === 0) {
      state.selectedGPUsByRole = {};
    }
    
    // Try to load designs from the database
    await state.loadDesignsFromDB();
    
    // Do NOT auto-create a design, keep activeDesign as null
    
    // Mark as initialized
    storeInitialized = true;
    console.log("Store initialized");
  } catch (error) {
    console.error("Error during store initialization:", error);
    toast.error("Error initializing application data");
    
    // Even if there's an error, initialize with defaults
    if (state.componentTemplates.length === 0) {
      state.initializeComponentTemplates();
    }
    
    // No longer auto-create a design on error
    
    storeInitialized = true;
  }
};

// Call initialization once
initializeStore();

// Export a function to recalculate when needed - with flag to prevent loops
let isRecalculating = false;
export const recalculateDesign = () => {
  // Prevent concurrent recalculations that can cause infinite loops
  if (isRecalculating) return;
  
  try {
    isRecalculating = true;
    console.log("Starting design recalculation");
    
    // Get the current state
    const state = useDesignStore.getState();
    
    // First calculate component roles
    state.calculateComponentRoles();
    
    // Then update the active design if it exists
    if (state.activeDesign) {
      // Get updated component data based on roles
      const updatedComponents = state.componentRoles
        .filter(role => role.assignedComponentId && role.adjustedRequiredCount && role.adjustedRequiredCount > 0)
        .map(role => {
          const componentTemplate = state.componentTemplates.find(
            c => c.id === role.assignedComponentId
          );
          
          if (!componentTemplate) return null;
          
          // Clone the component template and set the quantity and role
          const component = {
            ...componentTemplate,
            quantity: role.adjustedRequiredCount || role.requiredCount,
            role: role.role
          };
          
          // For storage nodes, calculate additional properties based on disk configuration
          if (role.role === 'storageNode') {
            const roleDiskConfigs = state.selectedDisksByRole[role.id] || [];
            
            // Calculate the total cost and power with attached disks
            let totalComponentCost = component.cost;
            let totalComponentPower = component.powerRequired;
            
            // Add disk details if we have them
            if (roleDiskConfigs.length > 0) {
              roleDiskConfigs.forEach(diskConfig => {
                const disk = state.componentTemplates.find(c => c.id === diskConfig.diskId);
                if (disk) {
                  totalComponentCost += disk.cost * diskConfig.quantity;
                  totalComponentPower += disk.powerRequired * diskConfig.quantity;
                }
              });
              
              component.cost = totalComponentCost;
              component.powerRequired = totalComponentPower;
              
              // You might want to add attached disks to the component for reference
              (component as any).attachedDisks = roleDiskConfigs.map(diskConfig => {
                const disk = state.componentTemplates.find(c => c.id === diskConfig.diskId);
                return {
                  ...disk,
                  quantity: diskConfig.quantity
                };
              }).filter(Boolean);
            }
            
            // Add cluster info to the storage node
            if (role.clusterInfo) {
              (component as any).clusterInfo = role.clusterInfo;
            }
          }
          
          // For GPU nodes, calculate additional properties based on GPU configuration
          if (role.role === 'gpuNode') {
            const roleGPUConfigs = state.selectedGPUsByRole[role.id] || [];
            
            // Calculate the total cost and power with attached GPUs
            let totalComponentCost = component.cost;
            let totalComponentPower = component.powerRequired;
            
            // Add GPU details if we have them
            if (roleGPUConfigs.length > 0) {
              roleGPUConfigs.forEach(gpuConfig => {
                const gpu = state.componentTemplates.find(c => c.id === gpuConfig.gpuId);
                if (gpu) {
                  totalComponentCost += gpu.cost * gpuConfig.quantity;
                  totalComponentPower += gpu.powerRequired * gpuConfig.quantity;
                }
              });
              
              component.cost = totalComponentCost;
              component.powerRequired = totalComponentPower;
              
              // Add attached GPUs to the component for reference
              (component as any).attachedGPUs = roleGPUConfigs.map(gpuConfig => {
                const gpu = state.componentTemplates.find(c => c.id === gpuConfig.gpuId);
                return {
                  ...gpu,
                  quantity: gpuConfig.quantity
                };
              }).filter(Boolean);
            }
            
            // Add cluster info to the GPU node
            if (role.clusterInfo) {
              (component as any).clusterInfo = role.clusterInfo;
            }
          }
          
          return component;
        })
        .filter(Boolean) as any[];
      
      // Only update if we have components to update with
      if (updatedComponents && updatedComponents.length > 0) {
        // Print debug info
        console.log(`Updating active design with ${updatedComponents.length} components`);
        
        // Update the active design with new components
        state.updateActiveDesign(updatedComponents);
      } else {
        console.warn("No components found to update design with");
        toast.warning("No components found to update design with. Please assign components to roles first.");
      }
    } else {
      console.warn("No active design to update");
      // Don't automatically create a design if none exists
      toast.info("Please create a new design or load an existing one.");
    }
  } catch (error) {
    console.error("Error during design recalculation:", error);
    toast.error("Error during design recalculation. Please try again.");
  } finally {
    isRecalculating = false;
    console.log("Design recalculation completed");
  }
};

// Export a manual recalculation function for UI usage
export const manualRecalculateDesign = () => {
  // Reset to ensure we can force a recalculation
  isRecalculating = false;
  recalculateDesign();
};
