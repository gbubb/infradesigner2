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
      // Store existing component assignments before recalculation
      const existingAssignments = {};
      
      // First map component IDs from current roles
      if (state.componentRoles && state.componentRoles.length > 0) {
        state.componentRoles.forEach(role => {
          if (role.assignedComponentId) {
            existingAssignments[role.role] = role.assignedComponentId;
            console.log(`Preserving assignment for ${role.role}: ${role.assignedComponentId}`);
          }
        });
      }
      
      // If the design has stored component roles with assignments, use those instead
      if (state.activeDesign.componentRoles && state.activeDesign.componentRoles.length > 0) {
        state.activeDesign.componentRoles.forEach(role => {
          if (role.assignedComponentId) {
            existingAssignments[role.role] = role.assignedComponentId;
            console.log(`Found assignment in design for ${role.role}: ${role.assignedComponentId}`);
          }
        });
      }

      // Log what assignments we're preserving
      console.log("Preserved component assignments:", existingAssignments);
      
      // Restore the assignments to the newly calculated roles
      const updatedRoles = state.componentRoles.map(role => {
        // If we have a stored assignment for this role type, restore it
        if (existingAssignments[role.role]) {
          console.log(`Restoring assignment for ${role.role}: ${existingAssignments[role.role]}`);
          return {
            ...role,
            assignedComponentId: existingAssignments[role.role]
          };
        }
        return role;
      });
      
      // Update component roles with restored assignments
      useDesignStore.setState({ componentRoles: updatedRoles });
      console.log(`Restored assignments to ${updatedRoles.filter(r => r.assignedComponentId).length} roles`);
      
      // Restore disk configurations if they exist
      if (state.activeDesign.selectedDisksByRole) {
        state.selectedDisksByRole = state.activeDesign.selectedDisksByRole;
      }
      
      // Restore GPU configurations if they exist
      if (state.activeDesign.selectedGPUsByRole) {
        state.selectedGPUsByRole = state.activeDesign.selectedGPUsByRole;
      }
      
      // Recalculate all component quantities to ensure calculations are fresh
      updatedRoles.forEach(role => {
        if (role.assignedComponentId) {
          const newQuantity = state.calculateRequiredQuantity(role.id, role.assignedComponentId);
          console.log(`Recalculated ${role.role}: ${newQuantity} units required`);
        }
      });
      
      // Get updated component data based on roles
      const updatedComponents = updatedRoles
        .filter(role => role.assignedComponentId && role.adjustedRequiredCount && role.adjustedRequiredCount > 0)
        .map(role => {
          // Clone the component template and set the quantity and role
          const componentTemplate = state.componentTemplates.find(
            c => c.id === role.assignedComponentId
          );
          
          if (!componentTemplate) return null;
          
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
