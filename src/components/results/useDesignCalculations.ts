
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType, StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/types/infrastructure';

export const useDesignCalculations = () => {
  const { activeDesign, requirements } = useDesignStore();
  
  // Calculate total cost
  const totalCost = useMemo(() => {
    if (!activeDesign?.components) return 0;
    return activeDesign.components.reduce((total, component) => {
      return total + (component.cost * (component.quantity || 1));
    }, 0);
  }, [activeDesign]);
  
  // Calculate total power
  const totalPower = useMemo(() => {
    if (!activeDesign?.components) return 0;
    return activeDesign.components.reduce((total, component) => {
      return total + (component.powerRequired * (component.quantity || 1));
    }, 0);
  }, [activeDesign]);
  
  // Calculate total rack units
  const totalRackUnits = useMemo(() => {
    if (!activeDesign?.components) return 0;
    return activeDesign.components.reduce((total, component) => {
      if ('rackUnitsConsumed' in component) {
        return total + ((component as any).rackUnitsConsumed * (component.quantity || 1));
      }
      return total;
    }, 0);
  }, [activeDesign]);
  
  // Component types grouping
  const componentsByType = useMemo(() => {
    if (!activeDesign?.components) return {};
    
    return activeDesign.components.reduce((groups, component) => {
      const type = component.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(component);
      return groups;
    }, {} as Record<string, any[]>);
  }, [activeDesign]);
  
  // Calculate storage clusters metrics
  const storageClustersMetrics = useMemo(() => {
    if (!activeDesign?.components || !requirements.storageRequirements.storageClusters) {
      return [];
    }

    return requirements.storageRequirements.storageClusters.map(cluster => {
      // Find storage nodes for this cluster
      const clusterNodes = activeDesign.components.filter(
        component => component.role === 'storageNode' && 
        (component as any).clusterInfo?.clusterId === cluster.id
      );
      
      // Calculate total raw capacity
      let totalRawCapacityTB = 0;
      let totalNodeCost = 0;
      
      clusterNodes.forEach(node => {
        const quantity = node.quantity || 1;
        totalNodeCost += node.cost * quantity;
        
        // Add attached disks capacity if available
        if ('attachedDisks' in node) {
          const disks = (node as any).attachedDisks || [];
          disks.forEach((disk: any) => {
            if (disk && 'capacityTB' in disk) {
              totalRawCapacityTB += disk.capacityTB * (disk.quantity || 1) * quantity;
            }
          });
        }
      });
      
      // Calculate usable capacity based on pool type
      const poolEfficiencyFactor = StoragePoolEfficiencyFactors[cluster.poolType || '3 Replica'] || (1/3);
      const maxFillFactor = (cluster.maxFillFactor || 80) / 100;
      
      const usableCapacityTB = totalRawCapacityTB * poolEfficiencyFactor;
      const usableCapacityTiB = usableCapacityTB * TB_TO_TIB_FACTOR;
      const effectiveCapacityTiB = usableCapacityTiB * maxFillFactor;
      
      // Calculate cost per TiB
      const costPerTiB = usableCapacityTiB > 0 ? totalNodeCost / usableCapacityTiB : 0;
      
      return {
        id: cluster.id,
        name: cluster.name,
        poolType: cluster.poolType,
        maxFillFactor: cluster.maxFillFactor,
        totalRawCapacityTB,
        usableCapacityTB,
        usableCapacityTiB,
        effectiveCapacityTiB,
        totalNodeCost,
        costPerTiB,
        nodeCount: clusterNodes.reduce((sum, node) => sum + (node.quantity || 1), 0)
      };
    });
  }, [activeDesign, requirements]);
  
  // Calculate actual hardware totals (including redundancy)
  const actualHardwareTotals = useMemo(() => {
    if (!activeDesign?.components) {
      return {
        totalVCPUs: 0,
        totalMemoryTB: 0,
        totalComputeMemoryTB: 0,
        totalStorageTB: 0
      };
    }
    
    let totalVCPUs = 0;
    let totalMemoryGB = 0;
    let computeMemoryGB = 0;
    let totalStorageTB = 0;
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      if (component.type === ComponentType.Server) {
        if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
          const coresPerServer = (component as any).cpuSockets * (component as any).cpuCoresPerSocket;
          // Get overcommit ratio from individual compute clusters if available
          let overcommitRatio = 1;
          
          if (component.role === 'computeNode' && (component as any).clusterInfo) {
            const clusterId = (component as any).clusterInfo.clusterId;
            const matchingCluster = requirements.computeRequirements.computeClusters.find(c => c.id === clusterId);
            overcommitRatio = matchingCluster?.overcommitRatio || 1;
          }
          
          totalVCPUs += coresPerServer * quantity * overcommitRatio;
        } else if ('cpuCount' in component && 'coreCount' in component) {
          const coresPerServer = (component as any).cpuCount * (component as any).coreCount;
          // Get overcommit ratio from individual compute clusters if available
          let overcommitRatio = 1;
          
          if (component.role === 'computeNode' && (component as any).clusterInfo) {
            const clusterId = (component as any).clusterInfo.clusterId;
            const matchingCluster = requirements.computeRequirements.computeClusters.find(c => c.id === clusterId);
            overcommitRatio = matchingCluster?.overcommitRatio || 1;
          }
          
          totalVCPUs += coresPerServer * quantity * overcommitRatio;
        }
        
        let componentMemoryGB = 0;
        if ('memoryGB' in component) {
          componentMemoryGB = (component as any).memoryGB;
        } else if ('memoryCapacity' in component) {
          componentMemoryGB = (component as any).memoryCapacity;
        }
        
        totalMemoryGB += componentMemoryGB * quantity;
        
        if (component.role === 'computeNode') {
          computeMemoryGB += componentMemoryGB * quantity;
        }
        
        if (component.role === 'storageNode' && 'storageCapacityTB' in component) {
          totalStorageTB += (component as any).storageCapacityTB * quantity;
        }
      }
    });
    
    const totalMemoryTB = totalMemoryGB / 1024;
    const computeMemoryTB = computeMemoryGB / 1024;
    
    return {
      totalVCPUs,
      totalMemoryTB,
      totalComputeMemoryTB: computeMemoryTB,
      totalStorageTB
    };
  }, [activeDesign, requirements]);

  // Calculate resource metrics for the whole design
  const resourceMetrics = useMemo(() => {
    if (!activeDesign?.components) {
      return {
        totalRackUnits: 0,
        totalPower: 0,
        totalServers: 0,
        totalLeafSwitches: 0,
        totalMgmtSwitches: 0,
        leafPortsUsed: 0,
        leafPortsAvailable: 0,
        mgmtPortsUsed: 0,
        mgmtPortsAvailable: 0,
        totalAvailableRU: 0,
        totalAvailablePower: 0,
        totalRackQuantity: 0
      };
    }
    
    const computeStorageRacks = requirements.physicalConstraints.computeStorageRackQuantity || 0;
    const networkCoreRacks = requirements.networkRequirements.dedicatedNetworkCoreRacks ? 2 : 0;
    const totalRackQuantity = computeStorageRacks + networkCoreRacks;
    
    const ruPerRack = requirements.physicalConstraints.rackUnitsPerRack || 42;
    const powerPerRack = requirements.physicalConstraints.powerPerRackWatts || 0;
    
    const totalAvailableRU = totalRackQuantity * ruPerRack;
    const totalAvailablePower = totalRackQuantity * powerPerRack;
    
    let totalServers = 0;
    let totalLeafSwitches = 0;
    let totalMgmtSwitches = 0;
    let leafPortsUsed = 0;
    let leafPortsAvailable = 0;
    let mgmtPortsUsed = 0;
    let mgmtPortsAvailable = 0;
    
    const ipmiNetwork = requirements.networkRequirements.ipmiNetwork || 'Management converged';
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      if (component.type === ComponentType.Server) {
        totalServers += quantity;
        
        if ('portsConsumedQuantity' in component) {
          leafPortsUsed += (component as any).portsConsumedQuantity * quantity;
        } else {
          leafPortsUsed += 2 * quantity;
        }
        
        if (requirements.networkRequirements.managementNetwork === 'Dual Home') {
          mgmtPortsUsed += 2 * quantity;
        } else {
          mgmtPortsUsed += quantity;
        }
        
        mgmtPortsUsed += quantity;
      } else if (component.type === ComponentType.Switch) {
        if (component.role === 'managementSwitch') {
          totalMgmtSwitches += quantity;
          if ('portsProvidedQuantity' in component) {
            mgmtPortsAvailable += (component as any).portsProvidedQuantity * quantity;
          } else if ('portCount' in component) {
            mgmtPortsAvailable += (component as any).portCount * quantity;
          }
        } else if (component.role === 'computeSwitch' || component.role === 'storageSwitch' || component.role === 'borderLeafSwitch' || component.role === 'leafSwitch') {
          totalLeafSwitches += quantity;
          if ('portsProvidedQuantity' in component) {
            leafPortsAvailable += (component as any).portsProvidedQuantity * quantity;
          } else if ('portCount' in component) {
            leafPortsAvailable += (component as any).portCount * quantity;
          }
        }
      }
    });
    
    return {
      totalRackUnits,
      totalPower,
      totalServers,
      totalLeafSwitches,
      totalMgmtSwitches,
      leafPortsUsed,
      leafPortsAvailable,
      mgmtPortsUsed,
      mgmtPortsAvailable,
      totalAvailableRU,
      totalAvailablePower,
      totalRackQuantity
    };
  }, [activeDesign, requirements, totalRackUnits, totalPower]);
  
  // Calculate resource utilization percentages
  const resourceUtilization = useMemo(() => {
    const {
      totalPower, 
      totalRackUnits, 
      leafPortsUsed, 
      leafPortsAvailable,
      mgmtPortsUsed,
      mgmtPortsAvailable,
      totalAvailableRU,
      totalAvailablePower
    } = resourceMetrics;
    
    return {
      powerUtilization: {
        percentage: totalAvailablePower > 0 ? (totalPower / totalAvailablePower) * 100 : 0,
        used: totalPower,
        total: totalAvailablePower
      },
      spaceUtilization: {
        percentage: totalAvailableRU > 0 ? (totalRackUnits / totalAvailableRU) * 100 : 0,
        used: totalRackUnits,
        total: totalAvailableRU
      },
      leafNetworkUtilization: {
        percentage: leafPortsAvailable > 0 ? (leafPortsUsed / leafPortsAvailable) * 100 : (leafPortsUsed > 0 ? 100 : 0),
        used: leafPortsUsed,
        total: leafPortsAvailable
      },
      mgmtNetworkUtilization: {
        percentage: mgmtPortsAvailable > 0 ? (mgmtPortsUsed / mgmtPortsAvailable) * 100 : (mgmtPortsUsed > 0 ? 100 : 0),
        used: mgmtPortsUsed,
        total: mgmtPortsAvailable
      }
    };
  }, [resourceMetrics]);
  
  // Cost metrics
  const costPerVCPU = useMemo(() => {
    if (!actualHardwareTotals.totalVCPUs || !totalCost) return 0;
    return totalCost / actualHardwareTotals.totalVCPUs;
  }, [actualHardwareTotals.totalVCPUs, totalCost]);
  
  const costPerTB = useMemo(() => {
    if (!actualHardwareTotals.totalStorageTB || !totalCost) return 0;
    return totalCost / actualHardwareTotals.totalStorageTB;
  }, [actualHardwareTotals.totalStorageTB, totalCost]);
  
  // Check for implausible scenarios
  const designErrors = useMemo(() => {
    const errors = [];
    
    if (resourceUtilization.spaceUtilization.percentage > 100) {
      errors.push({
        id: 'ru-exceeded',
        title: 'Rack Space Exceeded',
        description: `The design requires ${resourceUtilization.spaceUtilization.used} RU total, but only ${resourceUtilization.spaceUtilization.total} RU are available.`
      });
    }
    
    if (resourceUtilization.powerUtilization.percentage > 100) {
      errors.push({
        id: 'power-exceeded',
        title: 'Power Capacity Exceeded',
        description: `The design requires ${resourceUtilization.powerUtilization.used.toLocaleString()} Watts total, but only ${resourceUtilization.powerUtilization.total.toLocaleString()} Watts are available.`
      });
    }
    
    if (resourceUtilization.leafNetworkUtilization.percentage > 100 || (resourceUtilization.leafNetworkUtilization.used > 0 && resourceUtilization.leafNetworkUtilization.total === 0)) {
      errors.push({
        id: 'leaf-network-exceeded',
        title: 'Leaf Network Port Capacity Exceeded',
        description: `The design requires ${resourceUtilization.leafNetworkUtilization.used} leaf network ports, but only ${resourceUtilization.leafNetworkUtilization.total} ports are available.`
      });
    }
    
    if (resourceUtilization.mgmtNetworkUtilization.percentage > 100 || (resourceUtilization.mgmtNetworkUtilization.used > 0 && resourceUtilization.mgmtNetworkUtilization.total === 0)) {
      errors.push({
        id: 'mgmt-network-exceeded',
        title: 'Management Network Port Capacity Exceeded',
        description: `The design requires ${resourceUtilization.mgmtNetworkUtilization.used} management network ports, but only ${resourceUtilization.mgmtNetworkUtilization.total} ports are available.`
      });
    }
    
    return errors;
  }, [resourceUtilization]);

  return {
    totalCost,
    totalPower,
    totalRackUnits,
    componentsByType,
    storageClustersMetrics,
    actualHardwareTotals,
    resourceMetrics,
    resourceUtilization,
    costPerVCPU,
    costPerTB,
    designErrors
  };
};
