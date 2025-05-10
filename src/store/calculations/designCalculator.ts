
import { useDesignStore } from '../designStore';
import { toast } from 'sonner';

let isRecalculating = false;

export const recalculateDesign = () => {
  if (isRecalculating) return;
  
  try {
    isRecalculating = true;
    console.log("Starting design recalculation");
    
    const state = useDesignStore.getState();
    
    state.calculateComponentRoles();
    
    if (state.activeDesign) {
      const existingAssignments = {};
      
      if (state.componentRoles && state.componentRoles.length > 0) {
        state.componentRoles.forEach(role => {
          if (role.assignedComponentId) {
            existingAssignments[role.role] = role.assignedComponentId;
            console.log(`Preserving assignment for ${role.role}: ${role.assignedComponentId}`);
          }
        });
      }
      
      if (state.activeDesign.componentRoles && state.activeDesign.componentRoles.length > 0) {
        state.activeDesign.componentRoles.forEach(role => {
          if (role.assignedComponentId) {
            existingAssignments[role.role] = role.assignedComponentId;
            console.log(`Found assignment in design for ${role.role}: ${role.assignedComponentId}`);
          }
        });
      }

      console.log("Preserved component assignments:", existingAssignments);
      
      const updatedRoles = state.componentRoles.map(role => {
        if (existingAssignments[role.role]) {
          console.log(`Restoring assignment for ${role.role}: ${existingAssignments[role.role]}`);
          return {
            ...role,
            assignedComponentId: existingAssignments[role.role]
          };
        }
        return role;
      });
      
      useDesignStore.setState({ componentRoles: updatedRoles });
      console.log(`Restored assignments to ${updatedRoles.filter(r => r.assignedComponentId).length} roles`);
      
      if (state.activeDesign.selectedDisksByRole) {
        state.selectedDisksByRole = state.activeDesign.selectedDisksByRole;
      }
      
      if (state.activeDesign.selectedGPUsByRole) {
        state.selectedGPUsByRole = state.activeDesign.selectedGPUsByRole;
      }
      
      updatedRoles.forEach(role => {
        if (role.assignedComponentId) {
          const newQuantity = state.calculateRequiredQuantity(role.id, role.assignedComponentId);
          console.log(`Recalculated ${role.role}: ${newQuantity} units required`);
        }
      });
      
      const updatedComponents = updatedRoles
        .filter(role => role.assignedComponentId && role.adjustedRequiredCount && role.adjustedRequiredCount > 0)
        .map(role => {
          const componentTemplate = state.componentTemplates.find(
            c => c.id === role.assignedComponentId
          );
          
          if (!componentTemplate) return null;
          
          const component = {
            ...componentTemplate,
            quantity: role.adjustedRequiredCount || role.requiredCount,
            role: role.role
          };
          
          if (role.role === 'storageNode') {
            const roleDiskConfigs = state.selectedDisksByRole[role.id] || [];
            
            let totalComponentCost = component.cost;
            let totalComponentPower = component.powerRequired;
            
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
              
              (component as any).attachedDisks = roleDiskConfigs.map(diskConfig => {
                const disk = state.componentTemplates.find(c => c.id === diskConfig.diskId);
                return {
                  ...disk,
                  quantity: diskConfig.quantity
                };
              }).filter(Boolean);
            }
            
            if (role.clusterInfo) {
              (component as any).clusterInfo = role.clusterInfo;
            }
          }
          
          if (role.role === 'gpuNode') {
            const roleGPUConfigs = state.selectedGPUsByRole[role.id] || [];
            
            let totalComponentCost = component.cost;
            let totalComponentPower = component.powerRequired;
            
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
              
              (component as any).attachedGPUs = roleGPUConfigs.map(gpuConfig => {
                const gpu = state.componentTemplates.find(c => c.id === gpuConfig.gpuId);
                return {
                  ...gpu,
                  quantity: gpuConfig.quantity
                };
              }).filter(Boolean);
            }
            
            if (role.clusterInfo) {
              (component as any).clusterInfo = role.clusterInfo;
            }
          }
          
          return component;
        })
        .filter(Boolean) as any[];
      
      if (updatedComponents && updatedComponents.length > 0) {
        console.log(`Updating active design with ${updatedComponents.length} components`);
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

export const manualRecalculateDesign = () => {
  isRecalculating = false;
  console.log("Manual recalculation requested");
  
  const state = useDesignStore.getState();
  console.log("Current calculation state:", {
    roleCount: state.componentRoles.length,
    assignedRoles: state.componentRoles.filter(r => r.assignedComponentId).length,
    hasBreakdowns: Object.keys(state.calculationBreakdowns).length > 0
  });
  
  recalculateDesign();
  
  setTimeout(() => {
    const newState = useDesignStore.getState();
    console.log("After recalculation:", {
      roleCount: newState.componentRoles.length,
      assignedRoles: newState.componentRoles.filter(r => r.assignedComponentId).length,
      hasBreakdowns: Object.keys(newState.calculationBreakdowns).length > 0
    });
  }, 100);
};

