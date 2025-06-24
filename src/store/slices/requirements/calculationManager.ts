import { 
  calculateComputeNodeQuantity,
  calculateStorageNodeQuantity,
  calculateStorageNodeCapacity
} from './calculationUtils';
import { CalculationResult, CalculateRequiredQuantityFn } from '@/types/store-operations';
import { StoreState } from '../../types';

/**
 * Manages the calculation of required quantities for different component types
 */
export const calculateRequiredQuantity: CalculateRequiredQuantityFn = (
  roleId: string,
  componentId: string,
  state: StoreState
): CalculationResult => {
  const { 
    requirements, 
    componentRoles, 
    componentTemplates = [], 
    selectedDisksByRole,
    selectedGPUsByRole
  } = state;
  
  // First, find the role and component
  const role = componentRoles.find(r => r.id === roleId);
  if (!role) return { requiredQuantity: 0, calculationSteps: ['Role not found'] };
  
  const component = componentTemplates.find(c => c.id === componentId);
  if (!component) return { requiredQuantity: 0, calculationSteps: ['Component not found'] };
  
  // Store role name for better log messages
  const roleName = role.role;
  
  // Default quantity and empty steps array
  let requiredQuantity = role.requiredCount || 1;
  let calculationSteps: string[] = [];
  
  // Log the start of calculation for debugging
  console.log(`Starting calculation for ${roleName} (${roleId}) with component ${component.name} (${componentId})`);
  
  // Handle compute node quantity calculation
  if (role.role === 'computeNode' || role.role === 'gpuNode' || role.role === 'hyperConvergedNode') {
    if (!role.clusterInfo) {
      calculationSteps.push(`No cluster info available - using default count of ${requiredQuantity} nodes`);
    } else {
      const computeClusters = requirements.computeRequirements?.computeClusters || [];
      const cluster = computeClusters.find(c => c.id === role.clusterInfo?.clusterId);
      
      if (cluster) {
        const totalAvailabilityZones = requirements.physicalConstraints?.totalAvailabilityZones || 1;
        
        // Extract component information for better calculation
        const serverComponent = component; // Renamed for clarity
        
        // Determine cores per server more reliably
        let coresPerServer = 0;
        if ('cpuSockets' in serverComponent && 'cpuCoresPerSocket' in serverComponent) {
          coresPerServer = serverComponent.cpuSockets * serverComponent.cpuCoresPerSocket;
        } else if ('coreCount' in serverComponent) {
          coresPerServer = serverComponent.coreCount;
        } else if ('cores' in serverComponent) {
          coresPerServer = serverComponent.cores;
        } else if ('totalCores' in serverComponent) {
          coresPerServer = serverComponent.totalCores;
        }
        
        // Determine memory per server
        let memoryGBPerServer = 0;
        if ('memoryCapacity' in serverComponent && serverComponent.memoryCapacity > 0) {
          memoryGBPerServer = serverComponent.memoryCapacity;
        } else if ('memoryGB' in serverComponent && serverComponent.memoryGB > 0) {
          memoryGBPerServer = serverComponent.memoryGB;
        } else if ('memoryTB' in serverComponent && serverComponent.memoryTB > 0) {
          memoryGBPerServer = serverComponent.memoryTB * 1024;
        }
        
        // For GPU nodes, also pass GPU configurations
        const nodeGPUs = role.role === 'gpuNode' ? selectedGPUsByRole[roleId] || [] : [];
        
        console.log('Calculate compute node quantity with component details:', {
          roleName,
          roleId,
          componentId: component.id,
          componentName: component.name,
          cores: coresPerServer,
          memory: memoryGBPerServer,
          gpuCount: nodeGPUs.length
        });
        
        // The fix: Use the right calculation function based on node type
        if (role.role === 'gpuNode') {
          // Pass nodeGPUs for GPU nodes
          const result = calculateComputeNodeQuantity(role, component, cluster, totalAvailabilityZones, nodeGPUs);
          requiredQuantity = result.requiredQuantity;
          calculationSteps = result.calculationSteps;
        } else if (role.role === 'hyperConvergedNode') {
          // For hyper-converged nodes, calculate based on BOTH compute and storage requirements
          const computeResult = calculateComputeNodeQuantity(role, component, cluster, totalAvailabilityZones);
          
          // Find the associated storage cluster
          const storageClusters = requirements.storageRequirements?.storageClusters || [];
          const storageCluster = storageClusters.find(sc => 
            sc.hyperConverged && sc.computeClusterId === cluster.id
          );
          
          if (storageCluster) {
            // Calculate storage capacity per node based on disk configuration
            let storageNodeCapacityTiB = 0;
            
            // First check for manually selected disks in the Design tab
            const manualCapacity = calculateStorageNodeCapacity(
              roleId, 
              selectedDisksByRole, 
              componentTemplates
            );
            
            if (manualCapacity > 0) {
              // Use manually configured disks
              storageNodeCapacityTiB = manualCapacity;
            } else if (cluster.hyperConvergedDiskQuantity && cluster.hyperConvergedDiskSizeTB) {
              // Fall back to disk configuration from compute cluster
              // Convert TB to TiB
              storageNodeCapacityTiB = cluster.hyperConvergedDiskQuantity * cluster.hyperConvergedDiskSizeTB * 0.909495;
            }
            
            if (storageNodeCapacityTiB > 0) {
              const storageResult = calculateStorageNodeQuantity(role, storageCluster, roleId, storageNodeCapacityTiB);
              
              // Use the maximum of compute-based or storage-based node count
              if (storageResult.requiredQuantity > computeResult.requiredQuantity) {
                requiredQuantity = storageResult.requiredQuantity;
                calculationSteps = [
                  `Hyper-Converged Node Calculation:`,
                  `Compute-based requirement: ${computeResult.requiredQuantity} nodes`,
                  `Storage-based requirement: ${storageResult.requiredQuantity} nodes`,
                  `Using maximum: ${requiredQuantity} nodes`,
                  ``,
                  `Compute calculation details:`,
                  ...computeResult.calculationSteps,
                  ``,
                  `Storage calculation details:`,
                  ...storageResult.calculationSteps
                ];
              } else {
                requiredQuantity = computeResult.requiredQuantity;
                calculationSteps = [
                  `Hyper-Converged Node Calculation:`,
                  `Compute-based requirement: ${computeResult.requiredQuantity} nodes`,
                  `Storage-based requirement: ${storageResult.requiredQuantity} nodes`,
                  `Using maximum: ${requiredQuantity} nodes`,
                  ``,
                  `Compute calculation details:`,
                  ...computeResult.calculationSteps
                ];
              }
            } else {
              // No storage capacity configured, use compute calculation only
              requiredQuantity = computeResult.requiredQuantity;
              calculationSteps = [
                `Hyper-Converged Node Calculation:`,
                `No storage disks configured - using compute requirements only`,
                ...computeResult.calculationSteps
              ];
            }
          } else {
            // No storage cluster found, use compute calculation only
            requiredQuantity = computeResult.requiredQuantity;
            calculationSteps = computeResult.calculationSteps;
          }
        } else {
          // For regular compute nodes
          const result = calculateComputeNodeQuantity(role, component, cluster, totalAvailabilityZones);
          requiredQuantity = result.requiredQuantity;
          calculationSteps = result.calculationSteps;
        }
        
        console.log(`Calculation result for ${roleName}: ${requiredQuantity} with ${calculationSteps.length} steps`);
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
        
        // console.log('Calculate storage node quantity:', {
        //   role: roleName,
        //   roleId,
        //   storageCluster: storageCluster.name,
        //   storageNodeCapacityTiB,
        //   disksConfig: selectedDisksByRole[roleId] || []
        // });
        
        if (storageNodeCapacityTiB > 0) {
          const result = calculateStorageNodeQuantity(role, storageCluster, roleId, storageNodeCapacityTiB);
          requiredQuantity = result.requiredQuantity;
          calculationSteps = result.calculationSteps;
        } else {
          calculationSteps.push(`No capacity calculation available - using default count of ${requiredQuantity} nodes`);
        }
      } else {
        calculationSteps.push(`Storage cluster not found - using default count of ${requiredQuantity} nodes`);
      }
    } else {
      calculationSteps.push(`No cluster info available for storage node - using default count of ${requiredQuantity} nodes`);
    }
  }
  // Add detailed calculations for network components
  else if (role.role.includes('Switch')) {
    const physicalConstraints = requirements.physicalConstraints || {};
    const networkReqs = requirements.networkRequirements || {};
    
    calculationSteps.push(`Role type: ${role.role}`);
    
    if (role.role === 'leafSwitch') {
      const leafSwitchesPerAZ = networkReqs.leafSwitchesPerAZ || 2;
      const totalAZs = physicalConstraints.totalAvailabilityZones || 1;
      
      calculationSteps.push(`Network Topology: ${networkReqs.networkTopology || 'Spine-Leaf'}`);
      calculationSteps.push(`Total Availability Zones: ${totalAZs}`);
      calculationSteps.push(`Leaf Switches Per AZ: ${leafSwitchesPerAZ}`);
      calculationSteps.push(`Calculation: ${leafSwitchesPerAZ} switches per AZ × ${totalAZs} AZs = ${leafSwitchesPerAZ * totalAZs} total leaf switches`);
      
      requiredQuantity = leafSwitchesPerAZ * totalAZs;
    } 
    else if (role.role === 'managementSwitch') {
      // FIX: Completely rewrite management switch calculation to avoid any IPMI influence
      const managementNetwork = networkReqs.managementNetwork || 'Dual Home';
      const totalAZs = physicalConstraints.totalAvailabilityZones || 1;
      
      // Determine switches per AZ based solely on management network type
      const mgmtSwitchesPerAZ = managementNetwork === 'Dual Home' ? 2 : 1;
      
      // Calculate management switches independently from IPMI
      const totalMgmtSwitches = mgmtSwitchesPerAZ * totalAZs;
      
      calculationSteps.push(`Management Network: ${managementNetwork}`);
      calculationSteps.push(`Total Availability Zones: ${totalAZs}`);
      calculationSteps.push(`Management Switches Per AZ: ${mgmtSwitchesPerAZ}`);
      calculationSteps.push(`Total Management Switches: ${mgmtSwitchesPerAZ} switches/AZ × ${totalAZs} AZs = ${totalMgmtSwitches} switches`);
      
      requiredQuantity = totalMgmtSwitches;
      
      // No IPMI-related calculation here at all
    }
    else if (role.role === 'ipmiSwitch') {
      // Separate IPMI switch calculation
      const totalAZs = physicalConstraints.totalAvailabilityZones || 1;
      const ipmiNetwork = networkReqs.ipmiNetwork || 'Dedicated IPMI switch';
      
      // Only calculate IPMI switches if using dedicated IPMI switches
      if (ipmiNetwork === 'Dedicated IPMI switch') {
        // Always 1 switch per AZ
        const ipmiSwitchCount = totalAZs;
        
        calculationSteps.push(`IPMI Network: ${ipmiNetwork}`);
        calculationSteps.push(`Total Availability Zones: ${totalAZs}`);
        calculationSteps.push(`IPMI Switches Per AZ: 1`);
        calculationSteps.push(`Total IPMI Switches: 1 switch/AZ × ${totalAZs} AZs = ${ipmiSwitchCount} switches`);
        
        requiredQuantity = ipmiSwitchCount;
      } else {
        calculationSteps.push(`IPMI Network: ${ipmiNetwork}`);
        calculationSteps.push(`IPMI traffic is converged with management network`);
        calculationSteps.push(`No dedicated IPMI switches required`);
        requiredQuantity = 0;
      }
    }
    else if (role.role === 'spineSwitch') {
      calculationSteps.push(`Network Topology: ${networkReqs.networkTopology || 'Spine-Leaf'}`);
      calculationSteps.push(`Spine switches provide connectivity between leaf switches.`);
      calculationSteps.push(`For redundancy, a minimum of 2 spine switches are required.`);
      requiredQuantity = 2; // Typically fixed at 2 for redundancy
    }
    else if (role.role === 'borderLeafSwitch') {
      calculationSteps.push(`Network Topology: ${networkReqs.networkTopology || 'Spine-Leaf'}`);
      calculationSteps.push(`Border leaf switches connect the data center to external networks.`);
      calculationSteps.push(`For redundancy, a minimum of 2 border leaf switches are required.`);
      requiredQuantity = 2; // Typically fixed at 2 for redundancy
    }
    else if (role.role === 'storageSwitch') {
      // Calculate storage switches based on storage clusters if needed
      if (networkReqs.dedicatedStorageNetwork) {
        const storageClusters = requirements.storageRequirements?.storageClusters || [];
        let totalStorageAZs = 0;
        
        calculationSteps.push(`Dedicated Storage Network: Enabled`);
        
        if (storageClusters.length > 0) {
          calculationSteps.push(`Storage Clusters:`);
          storageClusters.forEach(cluster => {
            const azCount = cluster.availabilityZoneQuantity || 3;
            totalStorageAZs += azCount;
            calculationSteps.push(`- ${cluster.name}: ${azCount} AZs`);
          });
          
          // Each AZ needs 2 switches for redundancy
          const totalStorageSwitches = totalStorageAZs * 2;
          calculationSteps.push(`Each AZ requires 2 storage switches for redundancy`);
          calculationSteps.push(`Total Storage Switches: ${totalStorageAZs} AZs × 2 switches = ${totalStorageSwitches} switches`);
          
          requiredQuantity = totalStorageSwitches;
        } else {
          calculationSteps.push(`No storage clusters defined - using default count of ${requiredQuantity} nodes`);
        }
      } else {
        calculationSteps.push(`Dedicated Storage Network: Disabled`);
        calculationSteps.push(`Storage traffic uses the standard leaf-spine network`);
        calculationSteps.push(`No dedicated storage switches required`);
        requiredQuantity = 0;
      }
    }
  }
  // For controller nodes
  else if (role.role === 'controllerNode') {
    const controllerNodeCount = requirements.computeRequirements?.controllerNodeCount || 3;
    
    calculationSteps.push(`Controller nodes manage the infrastructure environment`);
    calculationSteps.push(`Controller Node Count: ${controllerNodeCount}`);
    calculationSteps.push(`For high availability and consensus, a minimum of 3 controller nodes is recommended`);
    
    requiredQuantity = controllerNodeCount;
  }
  // For infrastructure nodes
  else if (role.role === 'infrastructureNode') {
    const infrastructureClusterRequired = requirements.computeRequirements?.infrastructureClusterRequired || false;
    const infrastructureNodeCount = requirements.computeRequirements?.infrastructureNodeCount || 3;
    
    calculationSteps.push(`Infrastructure nodes provide supporting services for the environment`);
    
    if (infrastructureClusterRequired) {
      calculationSteps.push(`Infrastructure Cluster Required: Yes`);
      calculationSteps.push(`Infrastructure Node Count: ${infrastructureNodeCount}`);
      requiredQuantity = infrastructureNodeCount;
    } else {
      calculationSteps.push(`Infrastructure Cluster Required: No`);
      calculationSteps.push(`Infrastructure services hosted on controller nodes`);
      calculationSteps.push(`No dedicated infrastructure nodes required`);
      requiredQuantity = 0;
    }
  }
  // For firewall
  else if (role.role === 'firewall') {
    const physicalFirewalls = requirements.networkRequirements?.physicalFirewalls || false;
    
    calculationSteps.push(`Physical Firewalls Required: ${physicalFirewalls ? 'Yes' : 'No'}`);
    
    if (physicalFirewalls) {
      calculationSteps.push(`For redundancy, a minimum of 2 physical firewalls are required`);
      requiredQuantity = 2;
    } else {
      calculationSteps.push(`No physical firewalls required (using virtual firewalls)`);
      requiredQuantity = 0;
    }
  }
  // For any other role types
  else {
    calculationSteps.push(`Base required count: ${role.requiredCount}`);
    
    if (role.clusterInfo) {
      calculationSteps.push(`Cluster: ${role.clusterInfo.clusterName || 'Unnamed cluster'}`);
    }
  }
  
  // Log the final calculation result
  console.log(`Final calculation result for ${roleName} (${roleId}):`, {
    requiredQuantity,
    calculationStepsCount: calculationSteps.length
  });
  
  return { requiredQuantity, calculationSteps };
};
