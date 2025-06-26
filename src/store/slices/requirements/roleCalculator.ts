import { v4 as uuidv4 } from 'uuid';
import { ComponentRole, NetworkTopology, ManagementNetworkType, IPMINetworkType, DesignRequirements, StorageClusterRequirement } from '@/types/infrastructure';

/**
 * Calculates component roles based on requirements
 */
export const calculateComponentRoles = (requirements: DesignRequirements): ComponentRole[] => {
  const getValue = <T>(obj: DesignRequirements, path: string, defaultValue: T): T => {
    try {
      return path.split('.').reduce((o: Record<string, unknown>, key) => o?.[key], obj as Record<string, unknown>) || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };
  
  const totalAvailabilityZones = getValue(requirements, 'physicalConstraints.totalAvailabilityZones', 8) || 8;
  const controllerNodeCount = getValue(requirements, 'computeRequirements.controllerNodeCount', 3) || 3;
  const infrastructureClusterRequired = getValue(requirements, 'computeRequirements.infrastructureClusterRequired', false) || false;
  const infrastructureNodeCount = getValue(requirements, 'computeRequirements.infrastructureNodeCount', 3) || 3;
  
  const computeClusters = getValue(requirements, 'computeRequirements.computeClusters', []) || [];
  const storageClusters = getValue(requirements, 'storageRequirements.storageClusters', []) || [];
  
  const networkTopology = getValue(requirements, 'networkRequirements.networkTopology', "Spine-Leaf") as NetworkTopology || "Spine-Leaf";
  const physicalFirewalls = getValue(requirements, 'networkRequirements.physicalFirewalls', false) || false;
  const leafSwitchesPerAZ = getValue(requirements, 'networkRequirements.leafSwitchesPerAZ', 2) || 2;
  const dedicatedStorageNetwork = getValue(requirements, 'networkRequirements.dedicatedStorageNetwork', false) || false;
  const managementNetwork = getValue(requirements, 'networkRequirements.managementNetwork', "Dual Home") as ManagementNetworkType || "Dual Home";
  
  // Structured cabling requirements
  const copperPatchPanelsPerAZ = getValue(requirements, 'networkRequirements.copperPatchPanelsPerAZ', 2) || 0;
  const fiberPatchPanelsPerAZ = getValue(requirements, 'networkRequirements.fiberPatchPanelsPerAZ', 2) || 0;
  const copperPatchPanelsPerCoreRack = getValue(requirements, 'networkRequirements.copperPatchPanelsPerCoreRack', 1) || 0;
  const fiberPatchPanelsPerCoreRack = getValue(requirements, 'networkRequirements.fiberPatchPanelsPerCoreRack', 1) || 0;
  
  const dedicatedNetworkCoreRacks = getValue(requirements, 'networkRequirements.dedicatedNetworkCoreRacks', true) || false;
  const networkCoreRackQuantity = getValue(requirements, 'physicalConstraints.networkCoreRackQuantity', 2) || 
    (dedicatedNetworkCoreRacks ? 2 : 0);
  
  // Check for converged management and IPMI network configuration
  const isConvergedManagement = managementNetwork === 'Converged Management Plane';
  const ipmiNetwork = getValue(requirements, 'networkRequirements.ipmiNetwork', "Dedicated IPMI switch") as IPMINetworkType;
  const needsDedicatedIpmiSwitches = ipmiNetwork === "Dedicated IPMI switch";
  
  // Calculate management switches based on configuration - ONLY for management network
  let managementSwitchCount = 0;
  
  // Only add management switches when NOT using converged management plane
  if (!isConvergedManagement) {
    // IMPORTANT: Pure management switch calculation with no IPMI influence
    const managementSwitchesPerAZ = managementNetwork.includes("Dual") ? 2 : 1;
    managementSwitchCount = totalAvailabilityZones * managementSwitchesPerAZ;
  }
  
  // IPMI switches are calculated completely independently
  let ipmiSwitchCount = 0;
  if (needsDedicatedIpmiSwitches) {
    ipmiSwitchCount = totalAvailabilityZones; // 1 IPMI switch per AZ
  }
  
  const leafSwitchCount = totalAvailabilityZones * leafSwitchesPerAZ;
  
  const controllerRole = {
    id: uuidv4(),
    role: 'controllerNode',
    description: 'Handles cluster management and monitoring',
    requiredCount: controllerNodeCount,
    clusterInfo: {
      clusterId: 'controller-cluster',
      clusterName: 'Controller Cluster',
      clusterIndex: 0
    }
  };
  
  // console.log('Creating controller role with clusterInfo:', controllerRole.clusterInfo);
  
  const newRoles: ComponentRole[] = [controllerRole];
  
  // Build a map of compute clusters that are used for hyper-converged storage
  const hyperConvergedComputeClusters = new Map<string, StorageClusterRequirement>();
  storageClusters.forEach(storageCluster => {
    if (storageCluster.hyperConverged && storageCluster.computeClusterId) {
      hyperConvergedComputeClusters.set(storageCluster.computeClusterId, storageCluster);
    }
  });
  
  // Add compute cluster nodes
  computeClusters.forEach((cluster, index) => {
    const totalVCPUs = cluster.totalVCPUs || 5000;
    const totalMemoryTB = cluster.totalMemoryTB || 30;
    const availabilityZoneRedundancy = cluster.availabilityZoneRedundancy || 'N+1';
    const overcommitRatio = cluster.overcommitRatio || 2;
    const gpuEnabled = cluster.gpuEnabled || false;
    
    const totalPhysicalCoresNeeded = Math.ceil(totalVCPUs / overcommitRatio);
    const nodesPerAZ = Math.ceil(totalPhysicalCoresNeeded / totalAvailabilityZones);
    const baseComputeNodeCount = nodesPerAZ * totalAvailabilityZones;
    
    let additionalAZs = 0;
    if (availabilityZoneRedundancy === 'N+1') {
      additionalAZs = 1;
    } else if (availabilityZoneRedundancy === 'N+2') {
      additionalAZs = 2;
    }
    
    const totalComputeNodeCount = baseComputeNodeCount + (additionalAZs * nodesPerAZ);
    
    const clusterInfo = {
      clusterId: cluster.id,
      clusterName: cluster.name,
      clusterIndex: index
    };
    
    // Check if this compute cluster is used for hyper-converged storage
    const isHyperConverged = hyperConvergedComputeClusters.has(cluster.id);
    const storageCluster = isHyperConverged ? hyperConvergedComputeClusters.get(cluster.id) : null;
    
    // For hyper-converged clusters, calculate nodes based on both compute AND storage requirements
    let finalNodeCount = totalComputeNodeCount;
    if (isHyperConverged && storageCluster) {
      // Storage node count is typically based on availability zone quantity
      const storageNodeCount = storageCluster.availabilityZoneQuantity || 3;
      // Use the maximum of compute-based or storage-based node count
      finalNodeCount = Math.max(totalComputeNodeCount, storageNodeCount);
    }
    
    const roleType = isHyperConverged ? 'hyperConvergedNode' : (gpuEnabled ? 'gpuNode' : 'computeNode');
    const roleDescription = isHyperConverged 
      ? `Provides both compute and storage resources for ${cluster.name}` 
      : (gpuEnabled 
        ? `Provides GPU compute resources for ${cluster.name}` 
        : `Provides compute resources for ${cluster.name}`);
    
    newRoles.push({
      id: uuidv4(),
      role: roleType,
      description: roleDescription,
      requiredCount: finalNodeCount,
      clusterInfo: clusterInfo
    } as ComponentRole);
  });
  
  // Add storage cluster nodes (skip hyper-converged ones)
  storageClusters.forEach((cluster, index) => {
    // Skip hyper-converged storage clusters as they're handled by compute clusters
    if (cluster.hyperConverged && cluster.computeClusterId) {
      return;
    }
    
    newRoles.push({
      id: cluster.id || uuidv4(),
      role: 'storageNode',
      description: `Provides storage resources for ${cluster.name}`,
      requiredCount: cluster.availabilityZoneQuantity || 3,
      clusterInfo: {
        clusterId: cluster.id || '',
        clusterName: cluster.name || '',
        clusterIndex: index
      }
    } as ComponentRole);
  });
  
  // Add infrastructure nodes if required
  if (infrastructureClusterRequired) {
    const infrastructureRole = {
      id: uuidv4(),
      role: 'infrastructureNode',
      description: 'Provides infrastructure services for the cluster',
      requiredCount: infrastructureNodeCount,
      clusterInfo: {
        clusterId: 'infrastructure-cluster',
        clusterName: 'Infrastructure Cluster',
        clusterIndex: 0
      }
    };
    
    // console.log('Creating infrastructure role with clusterInfo:', infrastructureRole.clusterInfo);
    newRoles.push(infrastructureRole);
  }
  
  // Add management switches only if we need them (not using converged management)
  if (managementSwitchCount > 0) {
    // Add calculation steps for management switches
    const managementSwitchesPerAZ = managementNetwork.includes("Dual") ? 2 : 1;
    const calculationSteps = [
      `Role type: managementSwitch`,
      `Management Network: ${managementNetwork}`,
      `Total Availability Zones: ${totalAvailabilityZones}`,
      `Management Switches Per AZ: ${managementSwitchesPerAZ}`,
      `Total Management Switches: ${managementSwitchesPerAZ} switches/AZ × ${totalAvailabilityZones} AZs = ${managementSwitchCount} switches`
    ];
    
    newRoles.push({
      id: uuidv4(),
      role: 'managementSwitch',
      description: 'Provides network connectivity for management interfaces',
      requiredCount: managementSwitchCount,
      calculationSteps: calculationSteps
    });
  }
  
  // Add dedicated IPMI switches if needed - completely separate from management switches
  if (ipmiSwitchCount > 0) {
    // Add calculation steps for IPMI switches
    const calculationSteps = [
      `Role type: ipmiSwitch`,
      `IPMI Network: ${ipmiNetwork}`,
      `IPMI Switches: 1 switch/AZ × ${totalAvailabilityZones} AZs = ${ipmiSwitchCount} switches`
    ];
    
    newRoles.push({
      id: uuidv4(),
      role: 'ipmiSwitch',
      description: 'Provides dedicated network connectivity for IPMI interfaces',
      requiredCount: ipmiSwitchCount,
      calculationSteps: calculationSteps
    });
  }
  
  if (networkTopology === 'Spine-Leaf') {
    newRoles.push({
      id: uuidv4(),
      role: 'leafSwitch',
      description: 'Provides network connectivity for compute nodes',
      requiredCount: leafSwitchCount
    });
    
    if (dedicatedStorageNetwork) {
      // Calculate storage switches: we need 2 switches per AZ for each storage cluster
      let totalStorageSwitches = 0;
      
      // Sum up the number of AZs used by all storage clusters
      for (const cluster of storageClusters) {
        const azCount = cluster.availabilityZoneQuantity || 3;
        // Each AZ needs 2 switches for redundancy
        totalStorageSwitches += azCount * 2;
      }
      
      // Only add storage switches if we actually have storage clusters
      if (storageClusters.length > 0) {
        newRoles.push({
          id: uuidv4(),
          role: 'storageSwitch',
          description: 'Provides network connectivity for storage nodes',
          requiredCount: totalStorageSwitches
        });
      }
    }
    
    newRoles.push({
      id: uuidv4(),
      role: 'borderLeafSwitch',
      description: 'Connects the internal network to external networks',
      requiredCount: 2
    });
    
    newRoles.push({
      id: uuidv4(),
      role: 'spineSwitch',
      description: 'Provides high-speed connectivity between leaf switches',
      requiredCount: 2
    });
  } else {
    const totalComputeNodes = computeClusters.reduce((sum, cluster) => {
      const totalVCPUs = cluster.totalVCPUs || 5000;
      const overcommitRatio = cluster.overcommitRatio || 2;
      const totalPhysicalCoresNeeded = Math.ceil(totalVCPUs / overcommitRatio);
      const nodesPerAZ = Math.ceil(totalPhysicalCoresNeeded / totalAvailabilityZones);
      const baseNodeCount = nodesPerAZ * totalAvailabilityZones;
      
      let additionalAZs = 0;
      if (cluster.availabilityZoneRedundancy === 'N+1') {
        additionalAZs = 1;
      } else if (cluster.availabilityZoneRedundancy === 'N+2') {
        additionalAZs = 2;
      }
      
      return sum + baseNodeCount + (additionalAZs * nodesPerAZ);
    }, 0);
    
    newRoles.push({
      id: uuidv4(),
      role: 'torSwitch',
      description: 'Provides top-of-rack switching for servers',
      requiredCount: Math.ceil(totalComputeNodes / 2)
    });
  }
  
  if (physicalFirewalls) {
    newRoles.push({
      id: uuidv4(),
      role: 'firewall',
      description: 'Provides network security and traffic filtering',
      requiredCount: 2
    });
  }
  
  // Add copper patch panel role
  if (copperPatchPanelsPerAZ > 0 || copperPatchPanelsPerCoreRack > 0) {
    // Calculate total copper panels: (panels per AZ * AZ count) + (panels per core rack * core rack count)
    const totalCopperPanels = (copperPatchPanelsPerAZ * totalAvailabilityZones) + 
      (networkCoreRackQuantity * copperPatchPanelsPerCoreRack);
    
    // Add calculation breakdown steps
    const calculationSteps = [
      `Copper Patch Panels in AZs: ${copperPatchPanelsPerAZ} panels/AZ × ${totalAvailabilityZones} AZs = ${copperPatchPanelsPerAZ * totalAvailabilityZones} panels`,
      `Copper Patch Panels in Network Core Racks: ${copperPatchPanelsPerCoreRack} panels/rack × ${networkCoreRackQuantity} racks = ${copperPatchPanelsPerCoreRack * networkCoreRackQuantity} panels`,
      `Total Copper Patch Panels: ${copperPatchPanelsPerAZ * totalAvailabilityZones} + ${copperPatchPanelsPerCoreRack * networkCoreRackQuantity} = ${totalCopperPanels} panels`
    ];
    
    newRoles.push({
      id: uuidv4(),
      role: 'copperPatchPanel',
      description: 'Provides copper cable patch panel connectivity',
      requiredCount: totalCopperPanels,
      calculationSteps: calculationSteps
    });
  }

  // Add fiber patch panel role
  if (fiberPatchPanelsPerAZ > 0 || fiberPatchPanelsPerCoreRack > 0) {
    // Calculate total fiber panels: (panels per AZ * AZ count) + (panels per core rack * core rack count)
    const totalFiberPanels = (fiberPatchPanelsPerAZ * totalAvailabilityZones) + 
      (networkCoreRackQuantity * fiberPatchPanelsPerCoreRack);
    
    // Add calculation breakdown steps
    const calculationSteps = [
      `Fiber Patch Panels in AZs: ${fiberPatchPanelsPerAZ} panels/AZ × ${totalAvailabilityZones} AZs = ${fiberPatchPanelsPerAZ * totalAvailabilityZones} panels`,
      `Fiber Patch Panels in Network Core Racks: ${fiberPatchPanelsPerCoreRack} panels/rack × ${networkCoreRackQuantity} racks = ${fiberPatchPanelsPerCoreRack * networkCoreRackQuantity} panels`,
      `Total Fiber Patch Panels: ${fiberPatchPanelsPerAZ * totalAvailabilityZones} + ${fiberPatchPanelsPerCoreRack * networkCoreRackQuantity} = ${totalFiberPanels} panels`
    ];
    
    newRoles.push({
      id: uuidv4(),
      role: 'fiberPatchPanel',
      description: 'Provides fiber optic cable patch panel connectivity',
      requiredCount: totalFiberPanels,
      calculationSteps: calculationSteps
    });
  }

  return newRoles;
};
