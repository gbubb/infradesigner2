
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { InfrastructureDesign, InfrastructureComponent } from '@/types/infrastructure';
import { StoreState } from '../../types';
import { persistDesign } from '@/utils/persistenceUtils';

export interface DesignSavingSlice {
  // Save the current design
  saveDesign: () => void;
}

export const createDesignSavingSlice: StateCreator<
  StoreState,
  [],
  [],
  DesignSavingSlice
> = (set, get, api) => ({
  saveDesign: () => {
    set((state) => {
      try {
        console.log("Saving current design");
        // Get the current state of component roles and selected components
        const assignedComponents: InfrastructureComponent[] = state.componentRoles
          .filter(role => role.assignedComponentId && role.adjustedRequiredCount && role.adjustedRequiredCount > 0)
          .map(role => {
            // Look in all component sources (templates and custom components)
            const componentTemplate = state.componentTemplates.find(
              c => c.id === role.assignedComponentId
            );
            
            if (!componentTemplate) {
              console.error(`Component not found for role: ${role.role}`);
              return null;
            }

            // Clone and return with proper typing - add role to the component
            const component: InfrastructureComponent = {
              ...componentTemplate,
              quantity: role.adjustedRequiredCount || role.requiredCount,
              role: role.role // Add the role to the component
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
                
                // Add attached disks to the component for reference
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
          .filter(Boolean) as InfrastructureComponent[]; // Filter out any null values

        console.log(`Generated ${assignedComponents.length} components for design save`);

        // Create or update activeDesign
        let designToSave: InfrastructureDesign;
        
        if (state.activeDesign) {
          designToSave = { 
            ...state.activeDesign, 
            components: assignedComponents.length > 0 ? assignedComponents : state.activeDesign.components,
            requirements: state.requirements,
            updatedAt: new Date()
          };
        } else {
          designToSave = {
            id: uuidv4(),
            name: `Design ${state.savedDesigns.length + 1}`,
            createdAt: new Date(),
            requirements: state.requirements,
            components: assignedComponents
          };
        }

        // Find if the design already exists in savedDesigns
        const existingDesignIndex = state.savedDesigns.findIndex(d => d.id === designToSave.id);
        
        let updatedDesigns;
        if (existingDesignIndex >= 0) {
          // Update existing design
          updatedDesigns = [...state.savedDesigns];
          updatedDesigns[existingDesignIndex] = designToSave;
        } else {
          // Add new design
          updatedDesigns = [...state.savedDesigns, designToSave];
        }
        
        // Persist the design to the database
        persistDesign(designToSave).then(success => {
          if (!success) {
            console.error("Design saved to state but failed to persist to database");
          }
        });
        
        console.log("Design saved successfully");
        toast.success("Design saved successfully!");
        return { 
          savedDesigns: updatedDesigns,
          activeDesign: designToSave
        };
      } catch (error) {
        console.error("Failed to save design:", error);
        toast.error("Failed to save design");
        return state;
      }
    });
  }
});
