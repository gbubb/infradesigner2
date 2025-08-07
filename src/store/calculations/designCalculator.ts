import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { errorLogger } from '@/utils/errorLogger';
import { useDesignStore } from '../designStore';

import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import { ComponentWithPlacement } from '@/types/service-types';

let isRecalculating = false;

/**
 * Recalculates the entire design based on current requirements
 * 
 * This function performs the following operations:
 * 1. Calculates component roles based on requirements
 * 2. Preserves existing component assignments across recalculations
 * 3. Maintains disk, GPU, and cassette selections
 * 4. Triggers component generation and placement
 * 5. Updates the active design with new components
 * 
 * @remarks
 * Uses a lock mechanism to prevent concurrent recalculations
 * Preserves user selections during requirement changes
 * 
 * @throws Will log errors but not throw to prevent UI crashes
 */
export const recalculateDesign = () => {
  if (isRecalculating) return;
  
  try {
    isRecalculating = true;
    // console.log("Starting design recalculation");
    
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
            // console.log(`Preserving assignment for ${clusterKey}: ${role.assignedComponentId}`);
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
            // console.log(`Found assignment in design for ${clusterKey}: ${role.assignedComponentId}`);
          }
        });
      }
      // console.log("Preserved component assignments:", existingAssignments);

      // --- When restoring, match using combined key so clusters stay independent
      const updatedRoles = state.componentRoles.map(role => {
        if (role.role === 'storageNode' && role.clusterInfo?.clusterId) {
          const clusterKey = `storageNode-${role.clusterInfo.clusterId}`;
          if (existingAssignments[clusterKey]) {
            // console.log(`Restoring assignment for ${clusterKey}: ${existingAssignments[clusterKey]}`);
            return {
              ...role,
              assignedComponentId: existingAssignments[clusterKey]
            };
          }
        } else {
          if (existingAssignments[role.role]) {
            // console.log(`Restoring assignment for ${role.role}: ${existingAssignments[role.role]}`);
            return {
              ...role,
              assignedComponentId: existingAssignments[role.role]
            };
          }
        }
        return role;
      });
      
      useDesignStore.setState({ componentRoles: updatedRoles });
      // console.log(
      //   `Restored assignments to ${updatedRoles.filter(r => r.assignedComponentId).length} roles`
      // );
      
      // Create mapping from old role IDs to new role IDs based on role type and cluster
      const roleIdMapping: Record<string, string> = {};
      const oldRoles = state.activeDesign.componentRoles || [];
      const newRoles = state.componentRoles || [];
      
      // Map old roles to new roles based on role type and cluster info
      oldRoles.forEach(oldRole => {
        const matchingNewRole = newRoles.find(newRole => 
          newRole.role === oldRole.role && 
          newRole.clusterInfo?.clusterId === oldRole.clusterInfo?.clusterId
        );
        
        if (matchingNewRole) {
          roleIdMapping[oldRole.id] = matchingNewRole.id;
        }
      });
      
      console.log('[designCalculator] Role ID mapping:', roleIdMapping);
      
      if (state.activeDesign.selectedDisksByRole) {
        console.log('[designCalculator] Restoring disk configuration from activeDesign:', state.activeDesign.selectedDisksByRole);
        
        // Remap disk selections to new role IDs
        const remappedDisksByRole: Record<string, { diskId: string, quantity: number }[]> = {};
        
        Object.entries(state.activeDesign.selectedDisksByRole).forEach(([oldRoleId, disks]) => {
          const newRoleId = roleIdMapping[oldRoleId];
          if (newRoleId) {
            remappedDisksByRole[newRoleId] = disks;
          } else {
            // Keep unmapped entries in case they're still valid
            remappedDisksByRole[oldRoleId] = disks;
          }
        });
        
        console.log('[designCalculator] Remapped disk configuration:', remappedDisksByRole);
        useDesignStore.setState({ selectedDisksByRole: remappedDisksByRole });
      } else {
        console.log('[designCalculator] No disk configuration in activeDesign');
      }
      
      if (state.activeDesign.selectedGPUsByRole) {
        // Remap GPU selections to new role IDs
        const remappedGPUsByRole: Record<string, { gpuId: string, quantity: number }[]> = {};
        
        Object.entries(state.activeDesign.selectedGPUsByRole).forEach(([oldRoleId, gpus]) => {
          const newRoleId = roleIdMapping[oldRoleId];
          if (newRoleId) {
            remappedGPUsByRole[newRoleId] = gpus;
          } else {
            // Keep unmapped entries in case they're still valid
            remappedGPUsByRole[oldRoleId] = gpus;
          }
        });
        
        useDesignStore.setState({ selectedGPUsByRole: remappedGPUsByRole });
      }
      
      updatedRoles.forEach(role => {
        if (role.assignedComponentId) {
          // console.log(
          //   `Recalculating quantity for role ${role.role} (${role.description}) with component ${componentTemplate.name}`
          // );
          const newQuantity = state.calculateRequiredQuantity(role.id, role.assignedComponentId);
          // console.log(`Recalculated ${role.role}: ${newQuantity} units required`);
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
              
              const attachedDisks: InfrastructureComponent[] = [];
              const instanceComponent: InfrastructureComponent = {
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
              if (attachedDisks.length > 0) (instanceComponent as ComponentWithPlacement).attachedDisks = attachedDisks;
              if (role.clusterInfo) {
              (instanceComponent as ComponentWithPlacement).clusterInfo = role.clusterInfo;
              (instanceComponent as ComponentWithPlacement).clusterId = role.clusterInfo.clusterId;
              
              // Debug logging for controller/infrastructure nodes
              if (role.role === 'controllerNode' || role.role === 'infrastructureNode') {
                // console.log(`[designCalculator] Creating ${role.role} component:`, {
//                   roleName: role.role,
//                   roleClusterInfo: role.clusterInfo,
//                   componentName: instanceName,
//                   componentClusterInfo: role.clusterInfo,
//                   componentClusterId: role.clusterInfo.clusterId
//                 });
              }
            }
              instances.push(instanceComponent);
            }
            return instances;
          }

          // -- HYPER-CONVERGED NODE ROLES --
          if (role.role === 'hyperConvergedNode') {
            // Hyper-converged nodes need both compute resources AND storage disks
            const roleDiskConfigs = state.selectedDisksByRole[role.id] || [];
            const requiredQuantity = role.adjustedRequiredCount || role.requiredCount || 0;
            const instances: InfrastructureComponent[] = [];
            
            // Find the compute cluster to get disk configuration
            const computeClusters = state.requirements.computeRequirements?.computeClusters || [];
            const computeCluster = computeClusters.find(c => c.id === role.clusterInfo?.clusterId);
            
            for (let i = 0; i < requiredQuantity; i++) {
              const templateIdForCount = componentTemplate.id;
              templateInstanceCounts[templateIdForCount] = (templateInstanceCounts[templateIdForCount] || 0) + 1;
              const instanceName = `${componentTemplate.namingPrefix || componentTemplate.name}-${templateInstanceCounts[templateIdForCount]}`;
              
              const attachedDisks: InfrastructureComponent[] = [];
              const instanceComponent: InfrastructureComponent = {
                ...componentTemplate,
                id: uuidv4(),
                name: instanceName,
                templateId: componentTemplate.id,
                quantity: 1,
                role: role.role,
                ruSize: componentTemplate.ruSize,
              };
              
              // For hyper-converged, use manually configured disks from the Design tab
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
              
              if (attachedDisks.length > 0) (instanceComponent as ComponentWithPlacement).attachedDisks = attachedDisks;
              if (role.clusterInfo) {
                (instanceComponent as ComponentWithPlacement).clusterInfo = role.clusterInfo;
                (instanceComponent as ComponentWithPlacement).clusterId = role.clusterInfo.clusterId;
              }
              instances.push(instanceComponent);
            }
            return instances;
          }

          // -- GPU NODE ROLES --
          if (role.role === 'gpuNode') {
            const roleGPUConfigs = state.selectedGPUsByRole[role.id] || [];
            const attachedGPUs: InfrastructureComponent[] = [];
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
              if (attachedGPUs.length > 0) (instanceComponent as ComponentWithPlacement).attachedGPUs = attachedGPUs;
              if (role.clusterInfo) {
              (instanceComponent as ComponentWithPlacement).clusterInfo = role.clusterInfo;
              (instanceComponent as ComponentWithPlacement).clusterId = role.clusterInfo.clusterId;
              
              // Debug logging for controller/infrastructure nodes
              if (role.role === 'controllerNode' || role.role === 'infrastructureNode') {
                // console.log(`[designCalculator] Creating ${role.role} component:`, {
//                   roleName: role.role,
//                   roleClusterInfo: role.clusterInfo,
//                   componentName: instanceName,
//                   componentClusterInfo: role.clusterInfo,
//                   componentClusterId: role.clusterInfo.clusterId
//                 });
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
              (instanceComponent as ComponentWithPlacement).clusterInfo = role.clusterInfo;
              (instanceComponent as ComponentWithPlacement).clusterId = role.clusterInfo.clusterId;
              
              // Debug logging for controller/infrastructure nodes
              if (role.role === 'controllerNode' || role.role === 'infrastructureNode') {
                // console.log(`[designCalculator] Creating ${role.role} component:`, {
//                   roleName: role.role,
//                   roleClusterInfo: role.clusterInfo,
//                   componentName: instanceName,
//                   componentClusterInfo: role.clusterInfo,
//                   componentClusterId: role.clusterInfo.clusterId
//                 });
              }
            }
            instances.push(instanceComponent);
          }
          return instances;
        });

      // 4. Update the design's component list
      const finalComponentList: ComponentWithPlacement[] = updatedComponentsArray;

      if (finalComponentList && finalComponentList.length > 0) {
        // console.log(`Updating active design with ${finalComponentList.length} individual component instances`);
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
    errorLogger.error(
      "Error during design recalculation",
      error instanceof Error ? error : new Error(String(error)),
      { component: 'designCalculator', action: 'recalculateDesign' }
    );
  } finally {
    isRecalculating = false;
    // console.log("Design recalculation completed");
  }
};

export const manualRecalculateDesign = () => {
  isRecalculating = false;
  // console.log("Manual recalculation requested");
  
  const state = useDesignStore.getState();
  // console.log("Current calculation state:", {
  //   roleCount: state.componentRoles.length,
  //   assignedRoles: state.componentRoles.filter(r => r.assignedComponentId).length,
  //   hasBreakdowns: Object.keys(state.calculationBreakdowns).length > 0
  // });
  
  recalculateDesign();
  
  // setTimeout(() => {
  //   const newState = useDesignStore.getState();
  //   console.log("After recalculation:", {
  //     roleCount: newState.componentRoles.length,
  //     assignedRoles: newState.componentRoles.filter(r => r.assignedComponentId).length,
  //     hasBreakdowns: Object.keys(newState.calculationBreakdowns).length > 0
  //   });
  // }, 100);
};
