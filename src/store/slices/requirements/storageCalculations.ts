
import { TB_TO_TIB_FACTOR, StoragePoolEfficiencyFactors } from './constants';
import { ComponentType } from '@/types/infrastructure';
import { 
  CalculateStorageNodeCapacityFn, 
  CalculateStorageNodeQuantityFn,
  CalculationResult,
  DiskConfig 
} from '@/types/store-operations';

/**
 * Calculates the capacity of a storage node based on attached disks
 */
export const calculateStorageNodeCapacity: CalculateStorageNodeCapacityFn = (
  roleId,
  selectedDisksByRole,
  componentTemplates
): number => {
  const roleDiskConfigs = selectedDisksByRole[roleId] || [];
  let totalCapacityTiB = 0;
  
  roleDiskConfigs.forEach(diskConfig => {
    const disk = componentTemplates.find(c => c.id === diskConfig.diskId);
    if (disk && disk.type === ComponentType.Disk && 'capacityTB' in disk) {
      const diskCapacityTiB = disk.capacityTB * TB_TO_TIB_FACTOR * diskConfig.quantity;
      totalCapacityTiB += diskCapacityTiB;
    }
  });
  
  return totalCapacityTiB;
};

/**
 * Calculates required quantity of storage nodes
 */
export const calculateStorageNodeQuantity: CalculateStorageNodeQuantityFn = (
  role,
  storageCluster,
  roleId,
  storageNodeCapacityTiB
): CalculationResult => {
  const calculationSteps: string[] = [];
  let requiredQuantity = role.requiredCount || 1;
  
  if (!storageCluster) {
    calculationSteps.push(`No storage cluster found - using default count of ${requiredQuantity} nodes`);
    return { requiredQuantity, calculationSteps };
  }
  
  // Now we treat totalCapacityTB as TiB directly since the user input is in TiB
  const totalRequiredCapacityTiB = storageCluster.totalCapacityTB || 100;
  const poolType = storageCluster.poolType || '3 Replica';
  const maxFillFactor = storageCluster.maxFillFactor || 80;
  const availabilityZoneQuantity = storageCluster.availabilityZoneQuantity || 3;
  
  calculationSteps.push(`Storage Cluster: ${storageCluster.name || 'Unnamed Storage Cluster'}`);
  calculationSteps.push(`Required Usable Capacity: ${totalRequiredCapacityTiB.toLocaleString()} TiB`);
  calculationSteps.push(`Storage Pool Type: ${poolType}`);
  calculationSteps.push(`Maximum Fill Factor: ${maxFillFactor}%`);
  calculationSteps.push(`Availability Zone Quantity: ${availabilityZoneQuantity}`);
  
  if (storageNodeCapacityTiB > 0) {
    calculationSteps.push(`Server Model: ${role.assignedComponentName || 'Selected server'} with attached disks`);
    calculationSteps.push(`Raw Capacity per Node: ${storageNodeCapacityTiB.toFixed(2)} TiB`);
    
    const poolEfficiencyFactor = StoragePoolEfficiencyFactors[poolType] || (1/3);
    const fillFactorAdjustment = maxFillFactor / 100;
    
    calculationSteps.push(`Pool Efficiency Factor: ${poolEfficiencyFactor.toFixed(2)} (based on ${poolType} configuration)`);
    calculationSteps.push(`Fill Factor Adjustment: ${fillFactorAdjustment.toFixed(2)} (${maxFillFactor}% of total capacity)`);
    
    const effectiveCapacityPerNodeTiB = storageNodeCapacityTiB * poolEfficiencyFactor * fillFactorAdjustment;
    calculationSteps.push(`Effective Capacity per Node: ${storageNodeCapacityTiB.toFixed(2)} TiB × ${poolEfficiencyFactor.toFixed(2)} × ${fillFactorAdjustment.toFixed(2)} = ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB`);
    
    const requiredNodeCount = Math.ceil(totalRequiredCapacityTiB / effectiveCapacityPerNodeTiB);
    calculationSteps.push(`Minimum Nodes Needed: ${totalRequiredCapacityTiB.toFixed(2)} TiB ÷ ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB = ${requiredNodeCount} nodes`);

    // Ensure we meet minimum AZ requirement and maintain even distribution
    const minNodesForAZs = availabilityZoneQuantity;
    const baseRequirement = Math.max(requiredNodeCount, minNodesForAZs);

    // Calculate nodes per AZ to ensure even distribution
    const nodesPerAZ = Math.ceil(baseRequirement / availabilityZoneQuantity);
    requiredQuantity = nodesPerAZ * availabilityZoneQuantity;

    if (requiredQuantity > baseRequirement) {
      calculationSteps.push(`Adjusting for AZ distribution: ${nodesPerAZ} nodes per AZ × ${availabilityZoneQuantity} AZs = ${requiredQuantity} nodes`);
    } else if (requiredQuantity > requiredNodeCount) {
      calculationSteps.push(`Final Node Count: ${requiredQuantity} (increased from ${requiredNodeCount} to ensure minimum of ${availabilityZoneQuantity} nodes for AZ distribution)`);
    } else {
      calculationSteps.push(`Final Node Count: ${requiredQuantity} nodes (${nodesPerAZ} per AZ across ${availabilityZoneQuantity} AZs)`);
    }
    
    // Add a note about actual capacity
    const actualUsableCapacity = effectiveCapacityPerNodeTiB * requiredQuantity;
    calculationSteps.push(`Total Usable Capacity: ${requiredQuantity} nodes × ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB = ${actualUsableCapacity.toFixed(2)} TiB`);
    
    if (actualUsableCapacity > totalRequiredCapacityTiB) {
      const excessCapacity = actualUsableCapacity - totalRequiredCapacityTiB;
      calculationSteps.push(`This provides ${excessCapacity.toFixed(2)} TiB of excess capacity above the ${totalRequiredCapacityTiB.toFixed(2)} TiB requirement.`);
    }
  } else {
    calculationSteps.push(`No disk configuration found - using default count of ${requiredQuantity} nodes`);
    calculationSteps.push(`To perform a more accurate calculation, please add disks to this storage node.`);
  }
  
  return { requiredQuantity, calculationSteps };
};
