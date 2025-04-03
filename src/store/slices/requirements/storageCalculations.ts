
import { TB_TO_TIB_FACTOR, StoragePoolEfficiencyFactors } from './constants';
import { ComponentType } from '@/types/infrastructure';

/**
 * Calculates the capacity of a storage node based on attached disks
 */
export const calculateStorageNodeCapacity = (
  roleId: string, 
  selectedDisksByRole: Record<string, { diskId: string, quantity: number }[]>,
  componentTemplates: any[]
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
export const calculateStorageNodeQuantity = (
  role: any,
  storageCluster: any,
  roleId: string,
  storageNodeCapacityTiB: number
): { requiredQuantity: number, calculationSteps: string[] } => {
  let calculationSteps: string[] = [];
  let requiredQuantity = role.requiredCount || 1;
  
  if (!storageCluster) {
    calculationSteps.push(`No storage cluster found - using default count of ${requiredQuantity} nodes`);
    return { requiredQuantity, calculationSteps };
  }
  
  const totalCapacityTB = storageCluster.totalCapacityTB || 100;
  const poolType = storageCluster.poolType || '3 Replica';
  const maxFillFactor = storageCluster.maxFillFactor || 80;
  const availabilityZoneQuantity = storageCluster.availabilityZoneQuantity || 3;
  
  calculationSteps.push(`Storage Cluster: ${storageCluster.name || 'Unnamed Storage Cluster'}`);
  calculationSteps.push(`Required Usable Capacity: ${totalCapacityTB.toLocaleString()} TB (${(totalCapacityTB * TB_TO_TIB_FACTOR).toFixed(2)} TiB)`);
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
    
    const totalRequiredCapacityTiB = totalCapacityTB * TB_TO_TIB_FACTOR;
    
    const effectiveCapacityPerNodeTiB = storageNodeCapacityTiB * poolEfficiencyFactor * fillFactorAdjustment;
    calculationSteps.push(`Effective Capacity per Node: ${storageNodeCapacityTiB.toFixed(2)} TiB × ${poolEfficiencyFactor.toFixed(2)} × ${fillFactorAdjustment.toFixed(2)} = ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB`);
    
    const requiredNodeCount = Math.ceil(totalRequiredCapacityTiB / effectiveCapacityPerNodeTiB);
    calculationSteps.push(`Minimum Nodes Needed: ${totalRequiredCapacityTiB.toFixed(2)} TiB ÷ ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB = ${requiredNodeCount} nodes`);
    
    requiredQuantity = Math.max(requiredNodeCount, availabilityZoneQuantity);
    
    if (requiredQuantity > requiredNodeCount) {
      calculationSteps.push(`Final Node Count: ${requiredQuantity} (increased from ${requiredNodeCount} to ensure minimum of ${availabilityZoneQuantity} nodes for AZ distribution)`);
    } else {
      calculationSteps.push(`Final Node Count: ${requiredQuantity} nodes`);
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
