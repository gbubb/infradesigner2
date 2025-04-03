
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
    
    // Add cluster details
    calculationSteps.push(`${role.role === 'gpuNode' ? 'GPU' : 'Compute'} Cluster: ${cluster.name || 'Unnamed cluster'}`);
    calculationSteps.push(`Total vCPU requirement: ${totalVCPUs.toLocaleString()} vCPUs`);
    calculationSteps.push(`Total memory requirement: ${totalMemoryTB.toLocaleString()} TB (${totalMemoryGBNeeded.toLocaleString()} GB)`);
    calculationSteps.push(`CPU overcommit ratio: ${overcommitRatio}:1`);
    
    // Add server specifications
    if ('cpuCount' in component && 'coreCount' in component) {
      calculationSteps.push(`Server Model: ${component.manufacturer} ${component.model} with ${component.cpuCount} CPUs × ${component.coreCount} cores = ${coresPerNode} cores`);
    } else if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
      calculationSteps.push(`Server Model: ${component.manufacturer} ${component.model} with ${component.cpuSockets} sockets × ${component.cpuCoresPerSocket} cores = ${coresPerNode} cores`);
    }
    
    calculationSteps.push(`Server Memory: ${memoryGBPerNode.toLocaleString()} GB`);
    
    // Calculate nodes based on resources
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
    
    return { requiredQuantity, calculationSteps };
  } else {
    calculationSteps.push(`Selected component ${component.name} doesn't have required CPU or memory properties.`);
    calculationSteps.push(`Using default count of ${role.requiredCount || 1} nodes.`);
    return { requiredQuantity: role.requiredCount || 1, calculationSteps };
  }
};
