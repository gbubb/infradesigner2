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
    
    // No longer auto-create a design on error
    
    storeInitialized = true;
    console.log("Store initialized with defaults due to error");
  }
};

// Call initialization once
initializeStore().catch(error => {
  console.error("Failed to initialize store:", error);
});

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
    
    // Safety check for component roles
    if (!state.componentRoles || !Array.isArray(state.componentRoles)) {
      useDesignStore.setState({ componentRoles: [] });
      console.log("Initialized componentRoles array");
    }
    
    // First calculate component roles
    state.calculateComponentRoles();
    
    // Then update the active design if it exists
    if (state.activeDesign) {
      // Check if we have stored configurations in the active design
      if (state.activeDesign.componentRoles && Array.isArray(state.activeDesign.componentRoles) && state.activeDesign.componentRoles.length > 0) {
        // Restore component roles from the design
        useDesignStore.setState({ componentRoles: state.activeDesign.componentRoles });
      }
      
      // Restore disk configurations if they exist
      if (state.activeDesign.selectedDisksByRole && typeof state.activeDesign.selectedDisksByRole === 'object') {
        useDesignStore.setState({ selectedDisksByRole: state.activeDesign.selectedDisksByRole });
      }
      
      // Restore GPU configurations if they exist
      if (state.activeDesign.selectedGPUsByRole && typeof state.activeDesign.selectedGPUsByRole === 'object') {
        useDesignStore.setState({ selectedGPUsByRole: state.activeDesign.selectedGPUsByRole });
      }
      
      // Get fresh state after updates
      const updatedState = useDesignStore.getState();
      
      // Recalculate all component quantities to ensure calculations are fresh
      if (Array.isArray(updatedState.componentRoles)) {
        updatedState.componentRoles.forEach(role => {
          if (role && role.id && role.assignedComponentId) {
            try {
              const newQuantity = updatedState.calculateRequiredQuantity(role.id, role.assignedComponentId);
              console.log(`Recalculated ${role.role}: ${newQuantity} units required`);
            } catch (error) {
              console.error(`Error calculating quantity for role ${role.role}:`, error);
            }
          }
        });
      }
      
      // Safety check for components array
      if (!state.activeDesign.components || !Array.isArray(state.activeDesign.components)) {
        console.warn("Active design has no components array");
        state.updateActiveDesign([]);
        return;
      }
      
      // Get updated component data based on roles
      const updatedComponents = updatedState.componentRoles
        .filter(role => role && role.assignedComponentId && role.adjustedRequiredCount && role.adjustedRequiredCount > 0)
        .map(role => {
          try {
            // Clone the component template and set the quantity and role
            const componentTemplate = updatedState.componentTemplates.find(
              c => c && c.id === role.assignedComponentId
            );
            
            if (!componentTemplate) return null;
            
            const component = {
              ...componentTemplate,
              quantity: role.adjustedRequiredCount || role.requiredCount,
              role: role.role
            };
            
            // For storage nodes, calculate additional properties based on disk configuration
            if (role.role === 'storageNode') {
              const roleDiskConfigs = updatedState.selectedDisksByRole[role.id] || [];
              
              // Calculate the total cost and power with attached disks
              let totalComponentCost = component.cost;
              let totalComponentPower = component.powerRequired;
              
              // Add disk details if we have them
              if (roleDiskConfigs.length > 0) {
                roleDiskConfigs.forEach(diskConfig => {
                  if (!diskConfig) return;
                  
                  const disk = updatedState.componentTemplates.find(c => c && c.id === diskConfig.diskId);
                  if (disk) {
                    totalComponentCost += disk.cost * (diskConfig.quantity || 1);
                    totalComponentPower += disk.powerRequired * (diskConfig.quantity || 1);
                  }
                });
                
                component.cost = totalComponentCost;
                component.powerRequired = totalComponentPower;
                
                // You might want to add attached disks to the component for reference
                (component as any).attachedDisks = roleDiskConfigs
                  .filter(diskConfig => diskConfig) // Filter out undefined configs
                  .map(diskConfig => {
                    const disk = updatedState.componentTemplates.find(c => c && c.id === diskConfig.diskId);
                    if (!disk) return null;
                    
                    return {
                      ...disk,
                      quantity: diskConfig.quantity || 1
                    };
                  })
                  .filter(Boolean); // Filter out nulls
              }
              
              // Add cluster info to the storage node
              if (role.clusterInfo) {
                (component as any).clusterInfo = role.clusterInfo;
              }
            }
            
            // For GPU nodes, calculate additional properties based on GPU configuration
            if (role.role === 'gpuNode') {
              const roleGPUConfigs = updatedState.selectedGPUsByRole[role.id] || [];
              
              // Calculate the total cost and power with attached GPUs
              let totalComponentCost = component.cost;
              let totalComponentPower = component.powerRequired;
              
              // Add GPU details if we have them
              if (roleGPUConfigs.length > 0) {
                roleGPUConfigs.forEach(gpuConfig => {
                  if (!gpuConfig) return;
                  
                  const gpu = updatedState.componentTemplates.find(c => c && c.id === gpuConfig.gpuId);
                  if (gpu) {
                    totalComponentCost += gpu.cost * (gpuConfig.quantity || 1);
                    totalComponentPower += gpu.powerRequired * (gpuConfig.quantity || 1);
                  }
                });
                
                component.cost = totalComponentCost;
                component.powerRequired = totalComponentPower;
                
                // Add attached GPUs to the component for reference
                (component as any).attachedGPUs = roleGPUConfigs
                  .filter(gpuConfig => gpuConfig) // Filter out undefined configs
                  .map(gpuConfig => {
                    const gpu = updatedState.componentTemplates.find(c => c && c.id === gpuConfig.gpuId);
                    if (!gpu) return null;
                    
                    return {
                      ...gpu,
                      quantity: gpuConfig.quantity || 1
                    };
                  })
                  .filter(Boolean); // Filter out nulls
              }
              
              // Add cluster info to the GPU node
              if (role.clusterInfo) {
                (component as any).clusterInfo = role.clusterInfo;
              }
            }
            
            return component;
          } catch (error) {
            console.error(`Error processing component for role ${role.role}:`, error);
            return null;
          }
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
// Export a manual recalculation function for UI usage that adds additional debugging
export const manualRecalculateDesign = () => {
  // Reset to ensure we can force a recalculation
  isRecalculating = false;
  
  // Add more logging for debugging
  console.log("Manual recalculation requested");
  
  // Get current state for logging
  const state = useDesignStore.getState();
  console.log("Current calculation state:", {
    roleCount: state.componentRoles.length,
    assignedRoles: state.componentRoles.filter(r => r.assignedComponentId).length,
    hasBreakdowns: Object.keys(state.calculationBreakdowns).length > 0
  });
  
  recalculateDesign();
  
  // Log verification after recalculation
  setTimeout(() => {
    const newState = useDesignStore.getState();
    console.log("After recalculation:", {
      roleCount: newState.componentRoles.length,
      assignedRoles: newState.componentRoles.filter(r => r.assignedComponentId).length,
      hasBreakdowns: Object.keys(newState.calculationBreakdowns).length > 0
    });
  }, 100);
};
