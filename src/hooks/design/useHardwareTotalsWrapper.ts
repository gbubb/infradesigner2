import { useState, useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';
import { StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/store/slices/requirements/constants';

/**
 * A wrapper for hardware totals calculation that uses useEffect instead of useMemo
 * to avoid the React hook dependency issues.
 */
export const useHardwareTotalsWrapper = () => {
  // State for the calculated totals
  const [actualHardwareTotals, setActualHardwareTotals] = useState({
    totalVCPUs: 0,
    totalMemoryTB: 0,
    totalComputeMemoryTB: 0,
    totalStorageTB: 0
  });

  // Get store data
  const store = useDesignStore();
  const designId = store?.activeDesign?.id;

  // Calculate hardware totals using useEffect instead of useMemo
  useEffect(() => {
    try {
      const activeDesign = store?.activeDesign;
      const requirements = store?.requirements;

      // Ensure we have valid input
      if (!activeDesign?.components || !Array.isArray(activeDesign.components) || activeDesign.components.length === 0) {
        console.log('[useHardwareTotalsWrapper] No components found in activeDesign', {
          hasActiveDesign: !!activeDesign,
          hasComponents: !!activeDesign?.components,
          isArray: Array.isArray(activeDesign?.components),
          length: activeDesign?.components?.length || 0
        });
        return;
      }

      let totalVCPUs = 0;
      let totalMemoryGB = 0;
      let computeMemoryGB = 0;
      let totalStorageTB = 0;
      
      const computeClusterNodes = activeDesign.components.filter(component => 
        (component.role === 'computeNode' || component.role === 'gpuNode' || component.role === 'hyperConvergedNode') && 
        component.type === ComponentType.Server
      );
      
      console.log('[useHardwareTotalsWrapper] Compute nodes found:', {
        totalComponents: activeDesign.components.length,
        computeNodes: computeClusterNodes.length,
        computeNodeDetails: computeClusterNodes.map(n => ({ 
          name: n.name, 
          role: n.role, 
          type: n.type,
          quantity: n.quantity 
        }))
      });
      
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
        
        const globalOvercommitRatio = 
          requirements?.computeRequirements?.computeClusters?.length > 0 
            ? requirements.computeRequirements.computeClusters[0]?.overcommitRatio || 1 
            : 1;
        
        if (globalOvercommitRatio !== 1) {
          overcommitRatio = globalOvercommitRatio;
        }
        
        if (component.clusterInfo && requirements?.computeRequirements?.computeClusters) {
          const clusterId = component.clusterInfo.clusterId;
          const matchingCluster = requirements.computeRequirements.computeClusters.find(c => c.id === clusterId);
          if (matchingCluster && matchingCluster.overcommitRatio) {
            overcommitRatio = matchingCluster.overcommitRatio;
          }
        }

        const serverVCPUs = coresPerServer * overcommitRatio;
        const totalServerVCPUs = serverVCPUs * quantity;
        totalVCPUs += totalServerVCPUs;

        let componentMemoryGB = 0;
        if ('memoryCapacity' in component && component.memoryCapacity > 0) {
          componentMemoryGB = component.memoryCapacity;
        }
        else if ('memoryGB' in component && component.memoryGB > 0) {
          componentMemoryGB = component.memoryGB;
        }
        else if ('memoryTB' in component && component.memoryTB > 0) {
          componentMemoryGB = component.memoryTB * 1024;
        }
        const totalServerMemoryGB = componentMemoryGB * quantity;
        computeMemoryGB += totalServerMemoryGB;
      });
      
      const storageClusters = requirements?.storageRequirements?.storageClusters || [];
      
      // For hyper-converged storage, we need to map storage clusters to their compute clusters
      const hyperConvergedStorageMap = new Map<string, string>();
      storageClusters.forEach(sc => {
        if (sc.hyperConverged && sc.computeClusterId) {
          hyperConvergedStorageMap.set(sc.id, sc.computeClusterId);
        }
      });
      
      const storageNodes = activeDesign.components
        .filter(component => 
          (component.role === 'storageNode' || component.role === 'hyperConvergedNode') && 
          component.type === ComponentType.Server
        );
      
      console.log('[useHardwareTotalsWrapper] Storage nodes found:', {
        storageNodes: storageNodes.length,
        storageClusters: storageClusters.length,
        storageNodeDetails: storageNodes.map(n => ({ 
          name: n.name, 
          role: n.role, 
          type: n.type,
          clusterInfo: n.clusterInfo 
        }))
      });
      
      const storageNodesByCluster = storageNodes
        .reduce((acc, node) => {
          if (node.clusterInfo?.clusterId) {
            const nodeClusterId = node.clusterInfo.clusterId;
            
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
        }, {} as Record<string, any[]>);
      
      Object.entries(storageNodesByCluster).forEach(([clusterId, nodes]) => {
        const cluster = storageClusters.find(c => c.id === clusterId);
        if (!cluster) return;
        const poolType = cluster.poolType || '3 Replica';
        const poolEfficiencyFactor = StoragePoolEfficiencyFactors[poolType] || (1/3);
        let clusterRawCapacityTB = 0;
        nodes.forEach(node => {
          const quantity = node.quantity || 1;
          if ('attachedDisks' in node && Array.isArray(node.attachedDisks)) {
            node.attachedDisks.forEach(disk => {
              if (disk && typeof disk.capacityTB === 'number') {
                const diskQuantity = disk.quantity || 1;
                clusterRawCapacityTB += disk.capacityTB * diskQuantity * quantity;
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
          } else if ('memoryTB' in component && component.memoryTB > 0) {
            componentMemoryGB = component.memoryTB * 1024;
          }
          otherMemoryGB += componentMemoryGB * quantity;
        });
      
      totalMemoryGB = computeMemoryGB + otherMemoryGB;
      
      const totalMemoryTB = totalMemoryGB / 1024;
      const computeMemoryTB = computeMemoryGB / 1024;
      
      console.log('[useHardwareTotalsWrapper] Final calculations:', {
        totalVCPUs,
        totalMemoryTB,
        totalComputeMemoryTB: computeMemoryTB,
        totalStorageTB,
        computeMemoryGB,
        otherMemoryGB
      });
      
      setActualHardwareTotals({
        totalVCPUs,
        totalMemoryTB,
        totalComputeMemoryTB: computeMemoryTB,
        totalStorageTB
      });
    } catch (error) {
      console.error('Error calculating hardware totals:', error);
    }
  }, [designId, store]); // Only depend on the designId, not the entire objects

  return {
    actualHardwareTotals
  };
};
