import { v4 as uuidv4 } from 'uuid';
import { ComponentRole, NetworkTopology, ManagementNetworkType, IPMINetworkType, DesignRequirements, StorageCluster, ComputeClusterRequirement } from '@/types/infrastructure';
import { StoragePool } from '@/types/infrastructure/storage-types';

/**
 * Calculates component roles based on requirements
 */
export const calculateComponentRoles = (requirements: DesignRequirements): ComponentRole[] => {
  const getValue = <T>(obj: DesignRequirements, path: string, defaultValue: T): T => {
    try {
      const result = path.split('.').reduce<unknown>(
        (o, key) => (o as Record<string, unknown> | undefined)?.[key],
        obj,
      );
      return result !== null && result !== undefined ? (result as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  };
  
  const totalAvailabilityZones = getValue(requirements, 'physicalConstraints.totalAvailabilityZones', 8);
  const controllerClusterRequired = getValue(requirements, 'computeRequirements.controllerClusterRequired', true);
  const controllerNodeCount = getValue(requirements, 'computeRequirements.controllerNodeCount', 3);
  const infrastructureClusterRequired = getValue(requirements, 'computeRequirements.infrastructureClusterRequired', false);
  const infrastructureNodeCount = getValue(requirements, 'computeRequirements.infrastructureNodeCount', 3);
  
  const computeClusters = getValue<ComputeClusterRequirement[]>(requirements, 'computeRequirements.computeClusters', []);
  const storageClusters = getValue<StorageCluster[]>(requirements, 'storageRequirements.storageClusters', []); // Physical infrastructure
  const storagePools = getValue<StoragePool[]>(requirements, 'storageRequirements.storagePools', []); // Logical capacity tiers
  
  const networkTopology = getValue(requirements, 'networkRequirements.networkTopology', "Spine-Leaf") as NetworkTopology;
  const physicalFirewalls = getValue(requirements, 'networkRequirements.physicalFirewalls', false);
  const leafSwitchesPerAZ = getValue(requirements, 'networkRequirements.leafSwitchesPerAZ', 2);
  const dedicatedStorageNetwork = getValue(requirements, 'networkRequirements.dedicatedStorageNetwork', false);
  const managementNetwork = getValue(requirements, 'networkRequirements.managementNetwork', "Dual Home") as ManagementNetworkType;
  
  // Structured cabling requirements
  const structuredCablingEnabled = getValue(requirements, 'networkRequirements.structuredCablingEnabled', false);
  const copperPatchPanelsPerAZ = structuredCablingEnabled ? getValue(requirements, 'networkRequirements.copperPatchPanelsPerAZ', 0) : 0;
  const fiberPatchPanelsPerAZ = structuredCablingEnabled ? getValue(requirements, 'networkRequirements.fiberPatchPanelsPerAZ', 0) : 0;
  const copperPatchPanelsPerCoreRack = structuredCablingEnabled ? getValue(requirements, 'networkRequirements.copperPatchPanelsPerCoreRack', 0) : 0;
  const fiberPatchPanelsPerCoreRack = structuredCablingEnabled ? getValue(requirements, 'networkRequirements.fiberPatchPanelsPerCoreRack', 0) : 0;
  
  const dedicatedNetworkCoreRacks = getValue(requirements, 'networkRequirements.dedicatedNetworkCoreRacks', true);
  const networkCoreRackQuantity = getValue(requirements, 'physicalConstraints.networkCoreRackQuantity', 
    dedicatedNetworkCoreRacks ? 2 : 0);
  
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
  
  const newRoles: ComponentRole[] = [];
  
  // Only add controller role if controller cluster is required
  if (controllerClusterRequired) {
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
    newRoles.push(controllerRole);
  }
  
  // Build a map of compute clusters that are used for hyper-converged storage
  const hyperConvergedComputeClusters = new Map<string, StorageCluster>();
  storageClusters.forEach(storageCluster => {
    if (storageCluster.type === 'hyperConverged' && storageCluster.computeClusterId) {
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
    
    let additionalNodes = 0;
    if (availabilityZoneRedundancy === 'N+1') {
      additionalNodes = nodesPerAZ; // Add one AZ worth of nodes
    } else if (availabilityZoneRedundancy === 'N+2') {
      additionalNodes = 2 * nodesPerAZ; // Add two AZs worth of nodes
    } else if (availabilityZoneRedundancy === '1 Node') {
      additionalNodes = 1; // Add 1 node for single node failure tolerance
    } else if (availabilityZoneRedundancy === '2 Nodes') {
      additionalNodes = 2; // Add 2 nodes for dual node failure tolerance
    }
    
    const totalComputeNodeCount = baseComputeNodeCount + additionalNodes;
    
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
  
  // Storage Clusters - Create roles for physical storage infrastructure
  // Note: Pools are logical tiers and don't create hardware roles
  storageClusters.forEach((cluster, index) => {
    // Skip hyper-converged storage clusters as they're handled by compute clusters above
    if (cluster.type === 'hyperConverged' && cluster.computeClusterId) {
      return;
    }

    // Create dedicated storage node roles for this physical cluster
    newRoles.push({
      id: cluster.id || uuidv4(),
      role: 'storageNode',
      description: `Physical storage cluster: ${cluster.name}`,
      requiredCount: cluster.availabilityZoneQuantity || 3,
      clusterInfo: {
        clusterId: cluster.id || '',
        clusterName: cluster.name || '',
        clusterIndex: index,
        isStorageCluster: true,
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
      // Calculate storage switches: we need 2 switches per AZ for each physical storage cluster
      let totalStorageSwitches = 0;

      // Sum up the number of AZs used by all physical storage clusters
      for (const cluster of storageClusters) {
        // Skip hyper-converged clusters (they use leaf switches for storage traffic)
        if (cluster.type === 'hyperConverged') {
          continue;
        }
        const azCount = cluster.availabilityZoneQuantity || 3;
        // Each AZ needs 2 switches for redundancy
        totalStorageSwitches += azCount * 2;
      }

      // Only add storage switches if we actually have dedicated storage clusters
      if (totalStorageSwitches > 0) {
        newRoles.push({
          id: uuidv4(),
          role: 'storageSwitch',
          description: 'Provides network connectivity for dedicated storage nodes',
          requiredCount: totalStorageSwitches
        });
      }
    }

    // Only add border leaf switches if explicitly requested (default to true for backward compatibility)
    const includeBorderLeafSwitches = requirements.networkRequirements?.includeBorderLeafSwitches !== false;
    if (includeBorderLeafSwitches) {
      newRoles.push({
        id: uuidv4(),
        role: 'borderLeafSwitch',
        description: 'Connects the internal network to external networks',
        requiredCount: 2
      });
    }

    newRoles.push({
      id: uuidv4(),
      role: 'spineSwitch',
      description: 'Provides high-speed connectivity between leaf switches',
      requiredCount: 2
    });
  } else {
    // For Three-Tier and Core-Distribution-Access topologies
    // ToR switches should align with leaf switches per AZ for consistency
    // This accounts for AZs that may contain multiple racks
    const torSwitchesPerAZ = leafSwitchesPerAZ; // Use the same value as leaf switches
    const torSwitchCount = totalAvailabilityZones * torSwitchesPerAZ;
    
    newRoles.push({
      id: uuidv4(),
      role: 'torSwitch',
      description: 'Provides top-of-rack switching for servers',
      requiredCount: torSwitchCount
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
  
  // Add copper patch panel role (only if structured cabling is enabled)
  if (structuredCablingEnabled && (copperPatchPanelsPerAZ > 0 || copperPatchPanelsPerCoreRack > 0)) {
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

  // Add fiber patch panel role (only if structured cabling is enabled)
  if (structuredCablingEnabled && (fiberPatchPanelsPerAZ > 0 || fiberPatchPanelsPerCoreRack > 0)) {
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
