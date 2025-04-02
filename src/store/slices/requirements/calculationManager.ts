
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
  const { requirements, componentRoles, componentTemplates = [], selectedDisksByRole } = state;
  
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
        const result = calculateComputeNodeQuantity(role, component, cluster, totalAvailabilityZones);
        requiredQuantity = result.requiredQuantity;
        calculationSteps = result.calculationSteps;
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
  
  return { requiredQuantity, calculationSteps };
};
