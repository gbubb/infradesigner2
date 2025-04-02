
import { 
  StoragePoolEfficiencyFactors, 
  TB_TO_TIB_FACTOR,
  ComponentType
} from '@/types/infrastructure';

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
 * Calculates required quantity of compute nodes
 */
export const calculateComputeNodeQuantity = (
  role: any,
  component: any,
  cluster: any,
  totalAvailabilityZones: number
): { requiredQuantity: number, calculationSteps: string[] } => {
  let calculationSteps: string[] = [];
  
  if (!role || !component || !cluster) {
    calculationSteps.push(`Missing required data - using default count`);
    return { requiredQuantity: role?.requiredCount || 1, calculationSteps };
  }
  
  const totalVCPUs = cluster.totalVCPUs || 5000;
  const totalMemoryTB = cluster.totalMemoryTB || 30;
  const overcommitRatio = cluster.overcommitRatio || 2;
  const availabilityZoneRedundancy = cluster.availabilityZoneRedundancy || 'N+1';
  
  if (('cpuCount' in component && 'coreCount' in component && 'memoryGB' in component) || 
      ('cpuSockets' in component && 'cpuCoresPerSocket' in component && 'memoryGB' in component)) {
    
    let coresPerNode = 0;
    if ('cpuCount' in component && 'coreCount' in component) {
      coresPerNode = (component.cpuCount || 0) * (component.coreCount || 0);
    } else if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
      coresPerNode = (component.cpuSockets || 0) * (component.cpuCoresPerSocket || 0);
    }
    
    const memoryGBPerNode = component.memoryGB || 0;
    
    const totalPhysicalCoresNeeded = Math.ceil(totalVCPUs / overcommitRatio);
    const totalMemoryGBNeeded = totalMemoryTB * 1024;
    
    calculationSteps.push(`Cluster: ${cluster.name}`);
    calculationSteps.push(`Total vCPU requirement: ${totalVCPUs}`);
    calculationSteps.push(`CPU overcommit ratio: ${overcommitRatio}`);
    calculationSteps.push(`Physical cores needed: ${totalVCPUs} / ${overcommitRatio} = ${totalPhysicalCoresNeeded}`);
    
    if ('cpuCount' in component && 'coreCount' in component) {
      calculationSteps.push(`Cores per node: ${component.cpuCount} CPUs × ${component.coreCount} cores = ${coresPerNode} cores`);
    } else if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
      calculationSteps.push(`Cores per node: ${component.cpuSockets} sockets × ${component.cpuCoresPerSocket} cores = ${coresPerNode} cores`);
    }
    
    calculationSteps.push(`Memory per node: ${memoryGBPerNode} GB`);
    
    const nodesNeededForCPU = Math.ceil(totalPhysicalCoresNeeded / coresPerNode);
    const nodesNeededForMemory = Math.ceil(totalMemoryGBNeeded / memoryGBPerNode);
    
    calculationSteps.push(`Nodes needed for CPU: ${totalPhysicalCoresNeeded} / ${coresPerNode} = ${nodesNeededForCPU}`);
    calculationSteps.push(`Nodes needed for memory: ${totalMemoryGBNeeded} GB / ${memoryGBPerNode} GB = ${nodesNeededForMemory}`);
    
    const totalNodesNeeded = Math.max(nodesNeededForCPU, nodesNeededForMemory);
    calculationSteps.push(`Total nodes needed (max of CPU/Memory): ${totalNodesNeeded}`);
    
    let nodesPerAZ = Math.ceil(totalNodesNeeded / totalAvailabilityZones);
    nodesPerAZ = Math.max(1, nodesPerAZ);
    
    calculationSteps.push(`Number of availability zones: ${totalAvailabilityZones}`);
    calculationSteps.push(`Minimum nodes per AZ: ${totalNodesNeeded} / ${totalAvailabilityZones} = ${nodesPerAZ} (rounded up)`);
    
    let baseNodeCount = nodesPerAZ * totalAvailabilityZones;
    calculationSteps.push(`Base node count: ${nodesPerAZ} × ${totalAvailabilityZones} = ${baseNodeCount}`);
    
    let additionalNodesCount = 0;
    if (availabilityZoneRedundancy === 'N+1') {
      const redundancyNodesNeeded = nodesPerAZ;
      additionalNodesCount = Math.ceil(redundancyNodesNeeded / totalAvailabilityZones) * totalAvailabilityZones;
      calculationSteps.push(`N+1 redundancy: Need ${redundancyNodesNeeded} nodes for 1 AZ, rounded to ${additionalNodesCount} nodes for even distribution across ${totalAvailabilityZones} AZs`);
    } else if (availabilityZoneRedundancy === 'N+2') {
      const redundancyNodesNeeded = nodesPerAZ * 2;
      additionalNodesCount = Math.ceil(redundancyNodesNeeded / totalAvailabilityZones) * totalAvailabilityZones;
      calculationSteps.push(`N+2 redundancy: Need ${redundancyNodesNeeded} nodes for 2 AZs, rounded to ${additionalNodesCount} nodes for even distribution across ${totalAvailabilityZones} AZs`);
    } else {
      calculationSteps.push(`No redundancy: Adding 0 additional nodes`);
    }
    
    const requiredQuantity = baseNodeCount + additionalNodesCount;
    calculationSteps.push(`Final node count: ${baseNodeCount} + ${additionalNodesCount} = ${requiredQuantity}`);
    
    return { requiredQuantity, calculationSteps };
  } else {
    calculationSteps.push(`Selected component doesn't have required CPU or memory properties, using default count of ${role.requiredCount}`);
    return { requiredQuantity: role.requiredCount || 1, calculationSteps };
  }
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
  
  calculationSteps.push(`Storage Cluster: ${storageCluster.name}`);
  calculationSteps.push(`Required Usable Capacity: ${totalCapacityTB} TB (${(totalCapacityTB * TB_TO_TIB_FACTOR).toFixed(2)} TiB)`);
  calculationSteps.push(`Storage Pool Type: ${poolType}`);
  calculationSteps.push(`Maximum Fill Factor: ${maxFillFactor}%`);
  calculationSteps.push(`Availability Zone Quantity: ${availabilityZoneQuantity}`);
  
  if (storageNodeCapacityTiB > 0) {
    calculationSteps.push(`Raw Capacity per Node: ${storageNodeCapacityTiB.toFixed(2)} TiB`);
    
    const poolEfficiencyFactor = StoragePoolEfficiencyFactors[poolType] || (1/3);
    const fillFactorAdjustment = maxFillFactor / 100;
    
    calculationSteps.push(`Pool Efficiency Factor: ${poolEfficiencyFactor.toFixed(2)}`);
    calculationSteps.push(`Fill Factor Adjustment: ${fillFactorAdjustment.toFixed(2)}`);
    
    const totalRequiredCapacityTiB = totalCapacityTB * TB_TO_TIB_FACTOR;
    
    const effectiveCapacityPerNodeTiB = storageNodeCapacityTiB * poolEfficiencyFactor * fillFactorAdjustment;
    calculationSteps.push(`Effective Capacity per Node: ${storageNodeCapacityTiB.toFixed(2)} TiB × ${poolEfficiencyFactor.toFixed(2)} × ${fillFactorAdjustment.toFixed(2)} = ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB`);
    
    const requiredNodeCount = Math.ceil(totalRequiredCapacityTiB / effectiveCapacityPerNodeTiB);
    calculationSteps.push(`Minimum Nodes Needed: ${totalRequiredCapacityTiB.toFixed(2)} TiB / ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB = ${requiredNodeCount} nodes`);
    
    requiredQuantity = Math.max(requiredNodeCount, availabilityZoneQuantity);
    
    if (requiredQuantity > requiredNodeCount) {
      calculationSteps.push(`Final Node Count: ${requiredQuantity} (increased from ${requiredNodeCount} to ensure minimum of ${availabilityZoneQuantity} AZs)`);
    } else {
      calculationSteps.push(`Final Node Count: ${requiredQuantity}`);
    }
  } else {
    calculationSteps.push(`No capacity calculation available - using default count of ${requiredQuantity} nodes`);
  }
  
  return { requiredQuantity, calculationSteps };
};
