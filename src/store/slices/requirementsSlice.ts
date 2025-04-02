import { StateCreator } from 'zustand';
import { 
  DesignRequirements, 
  DeviceRoleType, 
  NetworkTopology, 
  StoragePoolEfficiencyFactors, 
  TB_TO_TIB_FACTOR,
  ComponentType,
  StorageClusterRequirement,
  ClusterInfo,
  ComponentRole,
  IPMINetworkType,
  ComputeClusterRequirement
} from '@/types/infrastructure';
import { StoreState, RequirementsState } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface RequirementsSlice {
  requirements: DesignRequirements;
  componentRoles: ComponentRole[];
  selectedDisksByRole: Record<string, { diskId: string, quantity: number }[]>;
  selectedGPUsByRole: Record<string, { gpuId: string, quantity: number }[]>;
  calculationBreakdowns: Record<string, string[]>;
  
  updateRequirements: (newRequirements: Partial<DesignRequirements>) => void;
  calculateComponentRoles: () => void;
  calculateRequiredQuantity: (roleId: string, componentId: string) => number;
  assignComponentToRole: (roleId: string, componentId: string) => void;
  addDiskToStorageNode: (roleId: string, diskId: string, quantity: number) => void;
  removeDiskFromStorageNode: (roleId: string, diskId: string) => void;
  addGPUToComputeNode: (roleId: string, gpuId: string, quantity: number) => void;
  removeGPUFromComputeNode: (roleId: string, gpuId: string) => void;
  calculateStorageNodeCapacity: (roleId: string) => number;
  getCalculationBreakdown: (roleId: string) => string[];
}

const defaultRequirements: DesignRequirements = {
  computeRequirements: {
    computeClusters: [],
    controllerNodeCount: 3,
    infrastructureClusterRequired: false,
    infrastructureNodeCount: 3
  },
  storageRequirements: {
    storageClusters: []
  },
  networkRequirements: {
    networkTopology: "Spine-Leaf",
    managementNetwork: "Dual Home",
    ipmiNetwork: "Management converged",
    physicalFirewalls: false,
    leafSwitchesPerAZ: 2,
    dedicatedStorageNetwork: false,
    dedicatedNetworkCoreRacks: true
  },
  physicalConstraints: {
    computeStorageRackQuantity: 16,
    totalAvailabilityZones: 8,
    rackUnitsPerRack: 42,
    powerPerRackWatts: 5000
  }
};

export const createRequirementsSlice: StateCreator<
  StoreState,
  [],
  [],
  RequirementsSlice
> = (set, get) => {
  const sliceMethods = {
    calculateComponentRoles: () => {
      const { requirements } = get();
      
      const getValue = <T>(obj: any, path: string, defaultValue: T): T => {
        try {
          return path.split('.').reduce((o, key) => o[key], obj) || defaultValue;
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
      
      const networkTopology = getValue(requirements, 'networkRequirements.networkTopology', 'Spine-Leaf') || 'Spine-Leaf';
      const physicalFirewalls = getValue(requirements, 'networkRequirements.physicalFirewalls', false) || false;
      const leafSwitchesPerAZ = getValue(requirements, 'networkRequirements.leafSwitchesPerAZ', 2) || 2;
      const dedicatedStorageNetwork = getValue(requirements, 'networkRequirements.dedicatedStorageNetwork', false) || false;
      const managementNetwork = getValue(requirements, 'networkRequirements.managementNetwork', 'Dual Home') || 'Dual Home';
      
      const mgmtSwitchesPerAZ = managementNetwork === 'Dual Home' ? 2 : 1;
      const ipmiNetwork = getValue(requirements, 'networkRequirements.ipmiNetwork', 'Management converged') as IPMINetworkType;
      
      let managementSwitchCount = totalAvailabilityZones * mgmtSwitchesPerAZ;
      
      if (ipmiNetwork === "Dedicated IPMI switch") {
        managementSwitchCount += totalAvailabilityZones;
      }
      
      const leafSwitchCount = totalAvailabilityZones * leafSwitchesPerAZ;
      
      const newRoles: ComponentRole[] = [
        {
          id: uuidv4(),
          role: 'controllerNode',
          description: 'Handles cluster management and monitoring',
          requiredCount: controllerNodeCount
        }
      ];
      
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
        
        const clusterInfo: ClusterInfo = {
          clusterId: cluster.id,
          clusterName: cluster.name,
          clusterIndex: index
        };
        
        const roleType = gpuEnabled ? 'gpuNode' : 'computeNode';
        const roleDescription = gpuEnabled 
          ? `Provides GPU compute resources for ${cluster.name}` 
          : `Provides compute resources for ${cluster.name}`;
        
        newRoles.push({
          id: uuidv4(),
          role: roleType,
          description: roleDescription,
          requiredCount: totalComputeNodeCount,
          clusterInfo: clusterInfo
        } as ComponentRole);
      });
      
      storageClusters.forEach((cluster, index) => {
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
      
      if (infrastructureClusterRequired) {
        newRoles.push({
          id: uuidv4(),
          role: 'infrastructureNode',
          description: 'Provides infrastructure services for the cluster',
          requiredCount: infrastructureNodeCount
        });
      }
      
      newRoles.push({
        id: uuidv4(),
        role: 'managementSwitch',
        description: 'Provides network connectivity for management interfaces',
        requiredCount: managementSwitchCount
      });
      
      if (networkTopology === 'Spine-Leaf') {
        newRoles.push({
          id: uuidv4(),
          role: 'leafSwitch',
          description: 'Provides network connectivity for compute nodes',
          requiredCount: leafSwitchCount
        });
        
        if (dedicatedStorageNetwork && storageClusters.length > 0) {
          const totalStorageAZs = storageClusters.reduce((sum, cluster) => 
            sum + (cluster.availabilityZoneQuantity || 3), 0);
          
          newRoles.push({
            id: uuidv4(),
            role: 'storageSwitch',
            description: 'Provides network connectivity for storage nodes',
            requiredCount: totalStorageAZs * 2
          });
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
      
      set({ componentRoles: newRoles });
    },
    
    calculateRequiredQuantity: (roleId: string, componentId: string): number => {
      const state = get();
      const { requirements, componentRoles, selectedDisksByRole, selectedGPUsByRole } = state;
      const componentTemplates = state.componentTemplates || [];
      
      const role = componentRoles.find(r => r.id === roleId);
      if (!role) return 0;
      
      const component = componentTemplates.find(c => c.id === componentId);
      if (!component) return 0;
      
      let requiredQuantity = role.requiredCount || 1;
      let calculationSteps: string[] = [];
      
      if (role.role === 'computeNode' || role.role === 'gpuNode') {
        if (!role.clusterInfo) {
          calculationSteps.push(`No cluster info available - using default count of ${requiredQuantity} nodes`);
          return requiredQuantity;
        }
        
        const computeClusters = requirements.computeRequirements?.computeClusters || [];
        const cluster = computeClusters.find(c => c.id === role.clusterInfo?.clusterId);
        
        if (!cluster) {
          calculationSteps.push(`Cluster not found - using default count of ${requiredQuantity} nodes`);
          return requiredQuantity;
        }
        
        const totalVCPUs = cluster.totalVCPUs || 5000;
        const totalMemoryTB = cluster.totalMemoryTB || 30;
        const overcommitRatio = cluster.overcommitRatio || 2;
        const totalAvailabilityZones = requirements.physicalConstraints?.totalAvailabilityZones || 8;
        const availabilityZoneRedundancy = cluster.availabilityZoneRedundancy || 'N+1';
        
        if ('cpuCount' in component && 'coreCount' in component && 'memoryGB' in component) {
          const coresPerNode = component.cpuCount * component.coreCount;
          const memoryGBPerNode = component.memoryGB;
          
          const totalPhysicalCoresNeeded = Math.ceil(totalVCPUs / overcommitRatio);
          const totalMemoryGBNeeded = totalMemoryTB * 1024;
          
          calculationSteps.push(`Cluster: ${cluster.name}`);
          calculationSteps.push(`Total vCPU requirement: ${totalVCPUs}`);
          calculationSteps.push(`CPU overcommit ratio: ${overcommitRatio}`);
          calculationSteps.push(`Physical cores needed: ${totalVCPUs} / ${overcommitRatio} = ${totalPhysicalCoresNeeded}`);
          calculationSteps.push(`Cores per node: ${component.cpuCount} CPUs × ${component.coreCount} cores = ${coresPerNode} cores`);
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
          
          requiredQuantity = baseNodeCount + additionalNodesCount;
          calculationSteps.push(`Final node count: ${baseNodeCount} + ${additionalNodesCount} = ${requiredQuantity}`);
        }
      } else if (role.role === 'storageNode') {
        if (role.clusterInfo && role.clusterInfo.clusterId) {
          const storageCluster = requirements.storageRequirements?.storageClusters.find(
            cluster => cluster.id === role.clusterInfo?.clusterId
          );
          
          if (storageCluster) {
            const totalCapacityTB = storageCluster.totalCapacityTB || 100;
            const poolType = storageCluster.poolType || '3 Replica';
            const maxFillFactor = storageCluster.maxFillFactor || 80;
            const availabilityZoneQuantity = storageCluster.availabilityZoneQuantity || 3;
            
            calculationSteps.push(`Storage Cluster: ${storageCluster.name}`);
            calculationSteps.push(`Required Usable Capacity: ${totalCapacityTB} TB (${(totalCapacityTB * TB_TO_TIB_FACTOR).toFixed(2)} TiB)`);
            calculationSteps.push(`Storage Pool Type: ${poolType}`);
            calculationSteps.push(`Maximum Fill Factor: ${maxFillFactor}%`);
            calculationSteps.push(`Availability Zone Quantity: ${availabilityZoneQuantity}`);
            
            const roleDiskConfigs = selectedDisksByRole[roleId] || [];
            
            if (roleDiskConfigs.length > 0) {
              const storageNodeCapacityTiB = sliceMethods.calculateStorageNodeCapacity(roleId);
              
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
            } else {
              calculationSteps.push(`No disks configured - using default count of ${requiredQuantity} nodes`);
            }
          }
        }
      }
      
      set(state => ({
        calculationBreakdowns: {
          ...state.calculationBreakdowns,
          [roleId]: calculationSteps
        }
      }));
      
      return requiredQuantity;
    },
    
    calculateStorageNodeCapacity: (roleId: string): number => {
      const state = get();
      const { selectedDisksByRole, componentTemplates } = state;
      
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
    },
    
    getCalculationBreakdown: (roleId: string): string[] => {
      return get().calculationBreakdowns[roleId] || [];
    }
  };
  
  return {
    requirements: defaultRequirements,
    componentRoles: [],
    selectedDisksByRole: {},
    selectedGPUsByRole: {},
    calculationBreakdowns: {},
    
    updateRequirements: (newRequirements) => {
      set((state) => ({
        requirements: {
          ...state.requirements,
          ...newRequirements,
          computeRequirements: {
            ...state.requirements.computeRequirements,
            ...newRequirements.computeRequirements
          },
          storageRequirements: {
            ...state.requirements.storageRequirements,
            ...newRequirements.storageRequirements
          },
          networkRequirements: {
            ...state.requirements.networkRequirements,
            ...newRequirements.networkRequirements
          },
          physicalConstraints: {
            ...state.requirements.physicalConstraints,
            ...newRequirements.physicalConstraints
          }
        }
      }));
      
      sliceMethods.calculateComponentRoles();
    },
    
    calculateComponentRoles: sliceMethods.calculateComponentRoles,
    
    calculateRequiredQuantity: sliceMethods.calculateRequiredQuantity,
    
    calculateStorageNodeCapacity: sliceMethods.calculateStorageNodeCapacity,
    
    getCalculationBreakdown: sliceMethods.getCalculationBreakdown,
    
    assignComponentToRole: (roleId: string, componentId: string) => {
      set((state) => {
        const updatedRoles = state.componentRoles.map(role => {
          if (role.id === roleId) {
            return {
              ...role,
              assignedComponentId: componentId,
              adjustedRequiredCount: undefined
            };
          }
          return role;
        });
        
        return { componentRoles: updatedRoles };
      });
      
      const state = get();
      const role = state.componentRoles.find(r => r.id === roleId);
      
      if (role) {
        const newQuantity = sliceMethods.calculateRequiredQuantity(roleId, componentId);
        
        set((state) => ({
          componentRoles: state.componentRoles.map(r => {
            if (r.id === roleId) {
              return {
                ...r,
                adjustedRequiredCount: newQuantity
              };
            }
            return r;
          })
        }));
      }
    },
    
    addDiskToStorageNode: (roleId: string, diskId: string, quantity: number) => {
      set((state) => {
        const currentDisks = state.selectedDisksByRole[roleId] || [];
        const existingDiskIndex = currentDisks.findIndex(d => d.diskId === diskId);
        
        let updatedDisks;
        if (existingDiskIndex >= 0) {
          updatedDisks = [...currentDisks];
          updatedDisks[existingDiskIndex] = { 
            ...updatedDisks[existingDiskIndex], 
            quantity 
          };
        } else {
          updatedDisks = [...currentDisks, { diskId, quantity }];
        }
        
        const updatedSelectedDisks = {
          ...state.selectedDisksByRole,
          [roleId]: updatedDisks
        };
        
        return { selectedDisksByRole: updatedSelectedDisks };
      });
      
      const state = get();
      const role = state.componentRoles.find(r => r.id === roleId);
      
      if (role && role.assignedComponentId) {
        const newQuantity = sliceMethods.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        set((state) => ({
          componentRoles: state.componentRoles.map(r => {
            if (r.id === roleId) {
              return {
                ...r,
                adjustedRequiredCount: newQuantity
              };
            }
            return r;
          })
        }));
      }
    },
    
    removeDiskFromStorageNode: (roleId: string, diskId: string) => {
      set((state) => {
        const currentDisks = state.selectedDisksByRole[roleId] || [];
        const updatedDisks = currentDisks.filter(d => d.diskId !== diskId);
        
        const updatedSelectedDisks = {
          ...state.selectedDisksByRole,
          [roleId]: updatedDisks
        };
        
        return { selectedDisksByRole: updatedSelectedDisks };
      });
      
      const state = get();
      const role = state.componentRoles.find(r => r.id === roleId);
      
      if (role && role.assignedComponentId) {
        const newQuantity = sliceMethods.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        set((state) => ({
          componentRoles: state.componentRoles.map(r => {
            if (r.id === roleId) {
              return {
                ...r,
                adjustedRequiredCount: newQuantity
              };
            }
            return r;
          })
        }));
      }
    },
    
    addGPUToComputeNode: (roleId: string, gpuId: string, quantity: number) => {
      set((state) => {
        const currentGPUs = state.selectedGPUsByRole[roleId] || [];
        const existingGPUIndex = currentGPUs.findIndex(g => g.gpuId === gpuId);
        
        let updatedGPUs;
        if (existingGPUIndex >= 0) {
          updatedGPUs = [...currentGPUs];
          updatedGPUs[existingGPUIndex] = { 
            ...updatedGPUs[existingGPUIndex], 
            quantity 
          };
        } else {
          updatedGPUs = [...currentGPUs, { gpuId, quantity }];
        }
        
        const updatedSelectedGPUs = {
          ...state.selectedGPUsByRole,
          [roleId]: updatedGPUs
        };
        
        return { selectedGPUsByRole: updatedSelectedGPUs };
      });
      
      const state = get();
      const role = state.componentRoles.find(r => r.id === roleId);
      
      if (role && role.assignedComponentId) {
        const newQuantity = sliceMethods.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        set((state) => ({
          componentRoles: state.componentRoles.map(r => {
            if (r.id === roleId) {
              return {
                ...r,
                adjustedRequiredCount: newQuantity
              };
            }
            return r;
          })
        }));
      }
    },
    
    removeGPUFromComputeNode: (roleId: string, gpuId: string) => {
      set((state) => {
        const currentGPUs = state.selectedGPUsByRole[roleId] || [];
        const updatedGPUs = currentGPUs.filter(g => g.gpuId !== gpuId);
        
        const updatedSelectedGPUs = {
          ...state.selectedGPUsByRole,
          [roleId]: updatedGPUs
        };
        
        return { selectedGPUsByRole: updatedSelectedGPUs };
      });
      
      const state = get();
      const role = state.componentRoles.find(r => r.id === roleId);
      
      if (role && role.assignedComponentId) {
        const newQuantity = sliceMethods.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        set((state) => ({
          componentRoles: state.componentRoles.map(r => {
            if (r.id === roleId) {
              return {
                ...r,
                adjustedRequiredCount: newQuantity
              };
            }
            return r;
          })
        }));
      }
    }
  };
};
