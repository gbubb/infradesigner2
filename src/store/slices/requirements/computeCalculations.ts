
/**
 * Calculates required quantity of compute nodes
 * Optional fifth parameter for GPU nodes to include GPU configurations
 */
export const calculateComputeNodeQuantity = (
  role: any,
  component: any,
  cluster: any,
  totalAvailabilityZones: number,
  nodeGPUs?: { gpuId: string, quantity: number }[]
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
  
  // Log the component details to help with debugging
  console.log('Component details for calculation:', {
    name: component.name,
    cpuSockets: component.cpuSockets,
    cpuCoresPerSocket: component.cpuCoresPerSocket,
    cpuCount: component.cpuCount,
    coreCount: component.coreCount,
    memoryGB: component.memoryGB,
    memoryCapacity: component.memoryCapacity
  });
  
  // Check both legacy and new CPU property naming patterns
  let coresPerNode = 0;
  let memoryGBPerNode = 0;
  
  // Determine cores per node based on available properties
  if (typeof component.cpuSockets === 'number' && typeof component.cpuCoresPerSocket === 'number') {
    coresPerNode = component.cpuSockets * component.cpuCoresPerSocket;
  } else if (typeof component.cpuCount === 'number' && typeof component.coreCount === 'number') {
    coresPerNode = component.cpuCount * component.coreCount;
  }
  
  // Determine memory per node based on available properties
  if (typeof component.memoryGB === 'number' && component.memoryGB > 0) {
    memoryGBPerNode = component.memoryGB;
  } else if (typeof component.memoryCapacity === 'number' && component.memoryCapacity > 0) {
    memoryGBPerNode = component.memoryCapacity;
  }
  
  // If we still have no values, set some fallbacks to avoid division by zero
  coresPerNode = coresPerNode || 1;
  memoryGBPerNode = memoryGBPerNode || 1;
  
  // Add cluster details to calculation steps
  calculationSteps.push(`${role.role === 'gpuNode' ? 'GPU' : 'Compute'} Cluster: ${cluster.name || 'Unnamed cluster'}`);
  calculationSteps.push(`Total vCPU requirement: ${totalVCPUs.toLocaleString()} vCPUs`);
  calculationSteps.push(`Total memory requirement: ${totalMemoryTB.toLocaleString()} TB (${(totalMemoryTB * 1024).toLocaleString()} GB)`);
  calculationSteps.push(`CPU overcommit ratio: ${overcommitRatio}:1`);
  
  // Add server specifications
  if (component.cpuSockets && component.cpuCoresPerSocket) {
    calculationSteps.push(`Server Model: ${component.manufacturer} ${component.model} with ${component.cpuSockets} sockets × ${component.cpuCoresPerSocket} cores = ${coresPerNode} cores`);
  } else if (component.cpuCount && component.coreCount) {
    calculationSteps.push(`Server Model: ${component.manufacturer} ${component.model} with ${component.cpuCount} CPUs × ${component.coreCount} cores = ${coresPerNode} cores`);
  } else {
    calculationSteps.push(`Server Model: ${component.manufacturer} ${component.model} with ${coresPerNode} total cores`);
  }
  
  calculationSteps.push(`Server Memory: ${memoryGBPerNode.toLocaleString()} GB`);
  
  // Calculate nodes based on resources
  const totalPhysicalCoresNeeded = Math.ceil(totalVCPUs / overcommitRatio);
  const totalMemoryGBNeeded = totalMemoryTB * 1024;
  
  calculationSteps.push(`CPU calculation: ${totalVCPUs.toLocaleString()} vCPUs ÷ ${overcommitRatio} = ${totalPhysicalCoresNeeded.toLocaleString()} physical cores needed`);
  
  const nodesNeededForCPU = Math.ceil(totalPhysicalCoresNeeded / coresPerNode);
  const nodesNeededForMemory = Math.ceil(totalMemoryGBNeeded / memoryGBPerNode);
  
  calculationSteps.push(`Nodes needed for CPU: ${totalPhysicalCoresNeeded.toLocaleString()} cores ÷ ${coresPerNode} cores per server = ${nodesNeededForCPU} nodes`);
  calculationSteps.push(`Nodes needed for memory: ${totalMemoryGBNeeded.toLocaleString()} GB ÷ ${memoryGBPerNode.toLocaleString()} GB per server = ${nodesNeededForMemory} nodes`);
  
  // Determine which resource is the limiting factor
  const totalNodesNeeded = Math.max(nodesNeededForCPU, nodesNeededForMemory);
  
  if (nodesNeededForCPU > nodesNeededForMemory) {
    calculationSteps.push(`CPU is the limiting factor: ${nodesNeededForCPU} nodes required`);
  } else if (nodesNeededForMemory > nodesNeededForCPU) {
    calculationSteps.push(`Memory is the limiting factor: ${nodesNeededForMemory} nodes required`);
  } else {
    calculationSteps.push(`CPU and memory require the same number of nodes: ${totalNodesNeeded} nodes`);
  }
  
  // Distribution across AZs
  let nodesPerAZ = Math.ceil(totalNodesNeeded / totalAvailabilityZones);
  nodesPerAZ = Math.max(1, nodesPerAZ);
  
  calculationSteps.push(`Number of availability zones: ${totalAvailabilityZones}`);
  calculationSteps.push(`Minimum nodes per AZ: ${totalNodesNeeded} ÷ ${totalAvailabilityZones} = ${nodesPerAZ} nodes per AZ (rounded up)`);
  
  let baseNodeCount = nodesPerAZ * totalAvailabilityZones;
  
  // If we rounded up for the AZ calculation, we might have more nodes than originally needed
  if (baseNodeCount > totalNodesNeeded) {
    calculationSteps.push(`To ensure even distribution, adjusting to ${nodesPerAZ} nodes per AZ × ${totalAvailabilityZones} AZs = ${baseNodeCount} total nodes`);
  } else {
    calculationSteps.push(`Base node count: ${nodesPerAZ} × ${totalAvailabilityZones} = ${baseNodeCount} nodes`);
  }
  
  // Add redundancy
  let additionalNodesCount = 0;
  if (availabilityZoneRedundancy === 'N+1') {
    const redundancyNodesNeeded = nodesPerAZ;
    additionalNodesCount = Math.ceil(redundancyNodesNeeded / totalAvailabilityZones) * totalAvailabilityZones;
    calculationSteps.push(`N+1 redundancy: Need ${redundancyNodesNeeded} more nodes to handle 1 AZ failure`);
    calculationSteps.push(`For even distribution: ${additionalNodesCount} additional nodes (${Math.ceil(redundancyNodesNeeded / totalAvailabilityZones)} extra nodes per AZ)`);
  } else if (availabilityZoneRedundancy === 'N+2') {
    const redundancyNodesNeeded = nodesPerAZ * 2;
    additionalNodesCount = Math.ceil(redundancyNodesNeeded / totalAvailabilityZones) * totalAvailabilityZones;
    calculationSteps.push(`N+2 redundancy: Need ${redundancyNodesNeeded} more nodes to handle 2 AZ failures`);
    calculationSteps.push(`For even distribution: ${additionalNodesCount} additional nodes (${Math.ceil(redundancyNodesNeeded / totalAvailabilityZones)} extra nodes per AZ)`);
  } else {
    calculationSteps.push(`No redundancy configured: Adding 0 additional nodes`);
  }
  
  const requiredQuantity = baseNodeCount + additionalNodesCount;
  calculationSteps.push(`Final node count: ${baseNodeCount} base nodes + ${additionalNodesCount} redundancy nodes = ${requiredQuantity} total nodes`);
  
  // Add a summary for GPU nodes if applicable
  if (role.role === 'gpuNode') {
    const gpuInfo = `This cluster is designated for GPU-accelerated workloads. Each node will be equipped with GPUs as specified in the GPU configuration section.`;
    calculationSteps.push(gpuInfo);
    
    // Add GPU-specific calculations if we have GPU configurations
    if (nodeGPUs && nodeGPUs.length > 0) {
      calculationSteps.push(`GPU configuration: ${nodeGPUs.length} GPU type(s) configured for this node`);
      // Additional GPU-specific calculations could be added here in the future
    } else {
      calculationSteps.push(`No GPUs have been configured for this node yet.`);
    }
  }
  
  // Log calculation result for debugging
  console.log(`Compute node calculation result:`, {
    role: role.role,
    coresPerNode,
    memoryGBPerNode,
    nodesNeededForCPU,
    nodesNeededForMemory,
    requiredQuantity
  });
  
  return { requiredQuantity, calculationSteps };
};
