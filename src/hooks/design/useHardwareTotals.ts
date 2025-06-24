import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';
import { StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/types/infrastructure';

export const useHardwareTotals = () => {
  const { activeDesign, requirements } = useDesignStore();
  
  // Calculate actual hardware totals (including redundancy)
  const actualHardwareTotals = useMemo(() => {
    if (!activeDesign?.components || !requirements?.computeRequirements?.computeClusters) {
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
    
    // Compute nodes filter -- includes hyper-converged nodes
    const computeClusterNodes = activeDesign.components.filter(component => 
      (component.role === 'computeNode' || component.role === 'gpuNode' || component.role === 'hyperConvergedNode') && 
      component.type === ComponentType.Server &&
      (component as any).clusterInfo
    );
    
    // Calculate compute cluster totals separately
    computeClusterNodes.forEach(component => {
      const quantity = component.quantity || 1;
      let coresPerServer = 0;
      let overcommitRatio = 1;
      
      if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
        coresPerServer = (component.cpuSockets || 0) * (component.cpuCoresPerSocket || 0);
      } else if ('coreCount' in component) {
        coresPerServer = component.coreCount || 0;
      } else if ('cores' in component) {
        coresPerServer = component.cores || 0;
      } else if ('totalCores' in component) {
        coresPerServer = component.totalCores || 0;
      }
      
      // Get overcommit ratio from cluster if available
      if ((component as any).clusterInfo) {
        const clusterId = (component as any).clusterInfo.clusterId;
        const matchingCluster = requirements.computeRequirements.computeClusters.find(c => c.id === clusterId);
        if (matchingCluster) {
          overcommitRatio = matchingCluster.overcommitRatio || 1;
        }
      }
      
      const serverVCPUs = coresPerServer * overcommitRatio;
      const totalServerVCPUs = serverVCPUs * quantity;
      totalVCPUs += totalServerVCPUs;
      
      // Memory calculation
      let componentMemoryGB = 0;
      if ('memoryCapacity' in component && component.memoryCapacity > 0) {
        componentMemoryGB = component.memoryCapacity;
      } else if ('memoryGB' in component && component.memoryGB > 0) {
        componentMemoryGB = component.memoryGB;
      }
      else if ('memoryTB' in component && (component as any).memoryTB > 0) {
        componentMemoryGB = (component as any).memoryTB * 1024;
      }
      if (componentMemoryGB === 0) {
        // Keep this warn for missing configuration
        console.warn(`Compute Server ${component.name} has no valid memory configuration!`);
      }
      
      const totalServerMemoryGB = componentMemoryGB * quantity;
      computeMemoryGB += totalServerMemoryGB;
    });
    
    // Storage clusters capacity
    const storageClusters = requirements.storageRequirements.storageClusters || [];
    
    // For hyper-converged storage, we need to map storage clusters to their compute clusters
    const hyperConvergedStorageMap = new Map<string, string>();
    storageClusters.forEach(sc => {
      if (sc.hyperConverged && sc.computeClusterId) {
        hyperConvergedStorageMap.set(sc.id, sc.computeClusterId);
      }
    });
    
    const storageNodesByCluster = activeDesign.components
      .filter(component => {
        // Include regular storage nodes
        if (component.role === 'storageNode' && component.type === ComponentType.Server) {
          return true;
        }
        // Include hyper-converged nodes that serve storage
        if (component.role === 'hyperConvergedNode' && component.type === ComponentType.Server) {
          return true;
        }
        return false;
      })
      .reduce((acc: Record<string, any[]>, node) => {
        if ((node as any).clusterInfo?.clusterId) {
          const nodeClusterId = (node as any).clusterInfo.clusterId;
          
          // For hyper-converged nodes, map them to their storage cluster
          if (node.role === 'hyperConvergedNode') {
            // Find which storage cluster this compute cluster serves
            for (const [storageClusterId, computeClusterId] of hyperConvergedStorageMap.entries()) {
              if (computeClusterId === nodeClusterId) {
                if (!acc[storageClusterId]) acc[storageClusterId] = [];
                acc[storageClusterId].push(node);
                break;
              }
            }
          } else {
            // Regular storage nodes
            if (!acc[nodeClusterId]) acc[nodeClusterId] = [];
            acc[nodeClusterId].push(node);
          }
        }
        return acc;
      }, {});
    
    Object.entries(storageNodesByCluster).forEach(([clusterId, nodes]) => {
      const cluster = storageClusters.find(c => c.id === clusterId);
      if (!cluster) return;
      
      const poolType = cluster.poolType || '3 Replica';
      const poolEfficiencyFactor = StoragePoolEfficiencyFactors[poolType] || (1/3);
      const maxFillFactor = (cluster.maxFillFactor || 80) / 100;
      
      let clusterRawCapacityTB = 0;
      
      nodes.forEach(node => {
        const quantity = node.quantity || 1;
        if ('attachedDisks' in node && Array.isArray(node.attachedDisks)) {
          node.attachedDisks.forEach((disk: any) => {
            if (disk && 'capacityTB' in disk) {
              clusterRawCapacityTB += disk.capacityTB * (disk.quantity || 1) * quantity;
            }
          });
        }
      });
      const usableCapacityTB = clusterRawCapacityTB * poolEfficiencyFactor;
      const usableCapacityTiB = usableCapacityTB * TB_TO_TIB_FACTOR;
      totalStorageTB += usableCapacityTiB;
    });
    
    let otherMemoryGB = 0;
    activeDesign.components
      .filter(component => 
        !(component.role === 'computeNode' || component.role === 'gpuNode' || component.role === 'hyperConvergedNode') &&
        component.type === ComponentType.Server
      )
      .forEach(component => {
        const quantity = component.quantity || 1;
        let componentMemoryGB = 0;
        if ('memoryCapacity' in component && component.memoryCapacity > 0) {
          componentMemoryGB = component.memoryCapacity;
        } else if ('memoryGB' in component && component.memoryGB > 0) {
          componentMemoryGB = component.memoryGB;
        } else if ('memoryTB' in component && (component as any).memoryTB > 0) {
          componentMemoryGB = (component as any).memoryTB * 1024;
        }
        otherMemoryGB += componentMemoryGB * quantity;
      });
    
    totalMemoryGB = computeMemoryGB + otherMemoryGB;
    
    const totalMemoryTB = totalMemoryGB / 1024;
    const computeMemoryTB = computeMemoryGB / 1024;
    
    return {
      totalVCPUs,
      totalMemoryTB,
      totalComputeMemoryTB: computeMemoryTB,
      totalStorageTB
    };
  }, [activeDesign, requirements]);

  return {
    actualHardwareTotals
  };
};
