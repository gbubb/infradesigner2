import { 
  calculateComputeNodeQuantity,
  calculateStorageNodeQuantity,
  calculateStorageNodeCapacity
} from './calculationUtils';

/**
 * Manages the calculation of required quantities for different component types
 */
export const calculateRequiredQuantity = (
  roleId: string,
  componentId: string,
  state: any
): { requiredQuantity: number, calculationSteps: string[] } => {
  const { 
    requirements, 
    componentRoles, 
    componentTemplates = [], 
    selectedDisksByRole,
    selectedGPUsByRole
  } = state;
  
  const role = componentRoles.find(r => r.id === roleId);
  if (!role) return { requiredQuantity: 0, calculationSteps: ['Role not found'] };
  
  const component = componentTemplates.find(c => c.id === componentId);
  if (!component) return { requiredQuantity: 0, calculationSteps: ['Component not found'] };
  
  let requiredQuantity = role.requiredCount || 1;
  let calculationSteps: string[] = [];
  
  // Handle compute node quantity calculation
  if (role.role === 'computeNode' || role.role === 'gpuNode') {
    if (!role.clusterInfo) {
      calculationSteps.push(`No cluster info available - using default count of ${requiredQuantity} nodes`);
    } else {
      const computeClusters = requirements.computeRequirements?.computeClusters || [];
      const cluster = computeClusters.find(c => c.id === role.clusterInfo?.clusterId);
      
      if (cluster) {
        const totalAvailabilityZones = requirements.physicalConstraints?.totalAvailabilityZones || 8;
        
        // For GPU nodes, also pass GPU configurations
        const nodeGPUs = role.role === 'gpuNode' ? selectedGPUsByRole[roleId] || [] : [];
        
        // Simplified memory and CPU information logging
        const coresPerServer = component.cpuSockets * component.cpuCoresPerSocket || component.cpuCount * component.coreCount || component.cores || component.totalCores || 0;
        const memoryGB = component.memoryCapacity || component.memoryGB || (component.memoryTB ? component.memoryTB * 1024 : 0);
        
        console.log('Calculate compute node quantity. Component details:', {
          id: component.id,
          name: component.name,
          manufacturer: component.manufacturer,
          model: component.model,
          cores: coresPerServer,
          memory: memoryGB,
          memorySource: component.memoryCapacity ? 'memoryCapacity' : 
                         component.memoryGB ? 'memoryGB' : 
                         component.memoryTB ? 'memoryTB' : 'unknown'
        });
        
        // The fix: Check if this is a GPU node and pass nodeGPUs only if it is
        if (role.role === 'gpuNode') {
          // Pass nodeGPUs as the fifth argument for GPU nodes
          const result = calculateComputeNodeQuantity(role, component, cluster, totalAvailabilityZones, nodeGPUs);
          requiredQuantity = result.requiredQuantity;
          calculationSteps = result.calculationSteps;
        } else {
          // For regular compute nodes, use only 4 arguments
          const result = calculateComputeNodeQuantity(role, component, cluster, totalAvailabilityZones);
          requiredQuantity = result.requiredQuantity;
          calculationSteps = result.calculationSteps;
        }
      } else {
        calculationSteps.push(`Cluster not found - using default count of ${requiredQuantity} nodes`);
      }
    }
  } 
  // Handle storage node quantity calculation
  else if (role.role === 'storageNode') {
    if (role.clusterInfo && role.clusterInfo.clusterId) {
      const storageCluster = requirements.storageRequirements?.storageClusters.find(
        cluster => cluster.id === role.clusterInfo?.clusterId
      );
      
      if (storageCluster) {
        const storageNodeCapacityTiB = calculateStorageNodeCapacity(
          roleId, 
          selectedDisksByRole, 
          componentTemplates
        );
        
        console.log('Calculate storage node quantity:', {
          role,
          storageCluster,
          roleId,
          storageNodeCapacityTiB,
          disksConfig: selectedDisksByRole[roleId] || []
        });
        
        if (storageNodeCapacityTiB > 0) {
          const result = calculateStorageNodeQuantity(role, storageCluster, roleId, storageNodeCapacityTiB);
          requiredQuantity = result.requiredQuantity;
          calculationSteps = result.calculationSteps;
        } else {
          calculationSteps.push(`No capacity calculation available - using default count of ${requiredQuantity} nodes`);
        }
      }
    }
  }
  // For other component types, add simple calculation steps
  else {
    calculationSteps.push(`Role type: ${role.role}`);
    calculationSteps.push(`Base required count: ${role.requiredCount}`);
    
    if (role.clusterInfo) {
      calculationSteps.push(`Cluster: ${role.clusterInfo.clusterName || 'Unnamed cluster'}`);
    }
    
    if (role.role === 'leafSwitch' || role.role === 'spineSwitch') {
      const azCount = requirements.physicalConstraints?.totalAvailabilityZones || 1;
      calculationSteps.push(`Total availability zones: ${azCount}`);
      calculationSteps.push(`Switches needed per AZ: ${Math.ceil(role.requiredCount / azCount)}`);
      calculationSteps.push(`Total switches: ${role.requiredCount}`);
    }
  }
  
  // Log the calculation result with simplified server properties
  console.log(`Calculation result for ${role.role} (${roleId}):`, {
    requiredQuantity,
    calculationStepsCount: calculationSteps.length,
    component: {
      id: component.id,
      name: component.name,
      cores: component.cpuSockets && component.cpuCoresPerSocket ? 
        component.cpuSockets * component.cpuCoresPerSocket : 
        (component.cpuCount && component.coreCount ? 
          component.cpuCount * component.coreCount : 
          (component.cores || component.totalCores || 'unknown')),
      memory: component.memoryCapacity || component.memoryGB || 
        (component.memoryTB ? `${component.memoryTB} TB` : 'unknown')
    }
  });
  
  return { requiredQuantity, calculationSteps };
};
