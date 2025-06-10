import { useDesignStore } from '../designStore';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';

let isRecalculating = false;

export const recalculateDesign = () => {
  if (isRecalculating) return;
  
  try {
    isRecalculating = true;
    console.log("Starting design recalculation");
    
    const state = useDesignStore.getState();
    
    state.calculateComponentRoles();
    
    if (state.activeDesign) {
      // --- Assignment fix: Use BOTH roleId AND clusterInfo for matching! ---
      const existingAssignments: Record<string, string> = {};
      if (state.componentRoles && state.componentRoles.length > 0) {
        state.componentRoles.forEach(role => {
          if (role.assignedComponentId) {
            const clusterKey = role.role === 'storageNode' && (role.clusterInfo?.clusterId)
              ? `${role.role}-${role.clusterInfo.clusterId}`
              : role.role;
            existingAssignments[clusterKey] = role.assignedComponentId;
            console.log(`Preserving assignment for ${clusterKey}: ${role.assignedComponentId}`);
          }
        });
      }
      if (state.activeDesign.componentRoles && state.activeDesign.componentRoles.length > 0) {
        state.activeDesign.componentRoles.forEach(role => {
          if (role.assignedComponentId) {
            const clusterKey = role.role === 'storageNode' && (role.clusterInfo?.clusterId)
              ? `${role.role}-${role.clusterInfo.clusterId}`
              : role.role;
            existingAssignments[clusterKey] = role.assignedComponentId;
            console.log(`Found assignment in design for ${clusterKey}: ${role.assignedComponentId}`);
          }
        });
      }
      console.log("Preserved component assignments:", existingAssignments);

      // --- When restoring, match using combined key so clusters stay independent
      const updatedRoles = state.componentRoles.map(role => {
        if (role.role === 'storageNode' && role.clusterInfo?.clusterId) {
          const clusterKey = `storageNode-${role.clusterInfo.clusterId}`;
          if (existingAssignments[clusterKey]) {
            console.log(`Restoring assignment for ${clusterKey}: ${existingAssignments[clusterKey]}`);
            return {
              ...role,
              assignedComponentId: existingAssignments[clusterKey]
            };
          }
        } else {
          if (existingAssignments[role.role]) {
            console.log(`Restoring assignment for ${role.role}: ${existingAssignments[role.role]}`);
            return {
              ...role,
              assignedComponentId: existingAssignments[role.role]
            };
          }
        }
        return role;
      });
      
      useDesignStore.setState({ componentRoles: updatedRoles });
      console.log(
        `Restored assignments to ${updatedRoles.filter(r => r.assignedComponentId).length} roles`
      );
      
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
      
      const updatedComponentsArray = updatedRoles
        .filter(role =>
          role.assignedComponentId &&
          role.adjustedRequiredCount &&
          role.adjustedRequiredCount > 0
        )
        .flatMap(role => {
          const componentTemplate = state.componentTemplates.find(
            c => c.id === role.assignedComponentId
          );
          if (!componentTemplate) return [];

          // Keep a count for each template to generate unique names
          const templateInstanceCounts: { [key: string]: number } = {};

          // -- STORAGE NODE ROLES --
          if (role.role === 'storageNode') {
            // Gather disks assigned to this cluster's storage role
            const roleDiskConfigs = state.selectedDisksByRole[role.id] || [];
            const requiredQuantity = role.adjustedRequiredCount || role.requiredCount || 0;
            const instances: InfrastructureComponent[] = [];
            for (let i = 0; i < requiredQuantity; i++) {
              const templateIdForCount = componentTemplate.id;
              templateInstanceCounts[templateIdForCount] = (templateInstanceCounts[templateIdForCount] || 0) + 1;
              const instanceName = `${componentTemplate.namingPrefix || componentTemplate.name}-${templateInstanceCounts[templateIdForCount]}`;
              
              const attachedDisks: any[] = [];
              let instanceComponent: InfrastructureComponent = {
                ...componentTemplate,
                id: uuidv4(),
                name: instanceName,
                templateId: componentTemplate.id,
                quantity: 1,
                role: role.role,
                ruSize: componentTemplate.ruSize,
              };
              if (roleDiskConfigs.length > 0) {
                roleDiskConfigs.forEach(diskConfig => {
                  const diskTemplate = state.componentTemplates.find(c => c.id === diskConfig.diskId);
                  if (diskTemplate) {
                    attachedDisks.push({
                      ...diskTemplate,
                      quantity: diskConfig.quantity,
                    });
                  }
                });
              }
              if (attachedDisks.length > 0) (instanceComponent as any).attachedDisks = attachedDisks;
              if (role.clusterInfo) {
              (instanceComponent as any).clusterInfo = role.clusterInfo;
              (instanceComponent as any).clusterId = role.clusterInfo.clusterId;
              
              // Debug logging for controller/infrastructure nodes
              if (role.role === 'controllerNode' || role.role === 'infrastructureNode') {
                console.log(`[designCalculator] Creating ${role.role} component:`, {
                  roleName: role.role,
                  roleClusterInfo: role.clusterInfo,
                  componentName: instanceName,
                  componentClusterInfo: role.clusterInfo,
                  componentClusterId: role.clusterInfo.clusterId
                });
              }
            }
              instances.push(instanceComponent);
            }
            return instances;
          }

          // -- GPU NODE ROLES --
          if (role.role === 'gpuNode') {
            const roleGPUConfigs = state.selectedGPUsByRole[role.id] || [];
            const attachedGPUs: any[] = [];
            const requiredQuantity = role.adjustedRequiredCount || role.requiredCount || 0;
            const instances: InfrastructureComponent[] = [];
            for (let i = 0; i < requiredQuantity; i++) {
              const templateIdForCount = componentTemplate.id;
              templateInstanceCounts[templateIdForCount] = (templateInstanceCounts[templateIdForCount] || 0) + 1;
              const instanceName = `${componentTemplate.namingPrefix || componentTemplate.name}-${templateInstanceCounts[templateIdForCount]}`;
              
              let instanceComponent: InfrastructureComponent = {
                ...componentTemplate,
                id: uuidv4(),
                name: instanceName,
                templateId: componentTemplate.id,
                quantity: 1,
                role: role.role,
                ruSize: componentTemplate.ruSize,
              };
              if (roleGPUConfigs.length > 0) {
                roleGPUConfigs.forEach(gpuConfig => {
                  const gpuTemplate = state.componentTemplates.find(c => c.id === gpuConfig.gpuId);
                  if (gpuTemplate) {
                    attachedGPUs.push({
                      ...gpuTemplate,
                      quantity: gpuConfig.quantity,
                    });
                  }
                });
              }
              if (attachedGPUs.length > 0) (instanceComponent as any).attachedGPUs = attachedGPUs;
              if (role.clusterInfo) {
              (instanceComponent as any).clusterInfo = role.clusterInfo;
              (instanceComponent as any).clusterId = role.clusterInfo.clusterId;
              
              // Debug logging for controller/infrastructure nodes
              if (role.role === 'controllerNode' || role.role === 'infrastructureNode') {
                console.log(`[designCalculator] Creating ${role.role} component:`, {
                  roleName: role.role,
                  roleClusterInfo: role.clusterInfo,
                  componentName: instanceName,
                  componentClusterInfo: role.clusterInfo,
                  componentClusterId: role.clusterInfo.clusterId
                });
              }
            }
              instances.push(instanceComponent);
            }
            return instances;
          }

          // -- ALL OTHER NODE ROLES --
          // no change; preserve logic
          const requiredQuantity = role.adjustedRequiredCount || role.requiredCount || 0;
          const instances: InfrastructureComponent[] = [];
          for (let i = 0; i < requiredQuantity; i++) {
            const templateIdForCount = componentTemplate.id;
            templateInstanceCounts[templateIdForCount] = (templateInstanceCounts[templateIdForCount] || 0) + 1;
            const instanceName = `${componentTemplate.namingPrefix || componentTemplate.name}-${templateInstanceCounts[templateIdForCount]}`;

            const instanceComponent: InfrastructureComponent = {
              ...componentTemplate,
              id: uuidv4(),
              name: instanceName,
              templateId: componentTemplate.id,
              quantity: 1,
              role: role.role,
              ruSize: componentTemplate.ruSize,
            };
            if (role.clusterInfo) {
              (instanceComponent as any).clusterInfo = role.clusterInfo;
              (instanceComponent as any).clusterId = role.clusterInfo.clusterId;
              
              // Debug logging for controller/infrastructure nodes
              if (role.role === 'controllerNode' || role.role === 'infrastructureNode') {
                console.log(`[designCalculator] Creating ${role.role} component:`, {
                  roleName: role.role,
                  roleClusterInfo: role.clusterInfo,
                  componentName: instanceName,
                  componentClusterInfo: role.clusterInfo,
                  componentClusterId: role.clusterInfo.clusterId
                });
              }
            }
            instances.push(instanceComponent);
          }
          return instances;
        });

      // 4. Update the design's component list
      const finalComponentList = updatedComponentsArray;

      if (finalComponentList && finalComponentList.length > 0) {
        console.log(`Updating active design with ${finalComponentList.length} individual component instances`);
        state.updateActiveDesign(finalComponentList);
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
