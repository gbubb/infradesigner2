import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/store/slices/requirements/constants';
import { 
  InfrastructureComponent, 
  InfrastructureDesign, 
  DesignRequirements, 
  StorageClusterRequirement 
} from '@/types/infrastructure';

/**
 * Custom hook to calculate storage cluster metrics from the current design.
 * 
 * IMPORTANT: This implementation avoids passing potentially undefined values in the
 * dependency array by using stable empty objects as fallbacks and explicit dependency checks.
 */
export const useStorageClusters = () => {
  // Access store values with guaranteed non-undefined defaults
  const storeState = useDesignStore();
  
  // Extract and validate the data we need
  const storageClustersMetrics = useMemo(() => {
    // Safely access store state with fallbacks at every level
    const activeDesign = storeState?.activeDesign || {};
    const requirements = storeState?.requirements || {};
    const components = Array.isArray(activeDesign?.components) ? activeDesign.components : [];
    const storageRequirements = requirements?.storageRequirements || { storageClusters: [] };
    const storageClusters = Array.isArray(storageRequirements?.storageClusters) 
      ? storageRequirements.storageClusters 
      : [];
    
    // Early return if we don't have enough data
    if (components.length === 0 || storageClusters.length === 0) {
      return [];
    }
    
    // Process each cluster with defensive coding
    return storageClusters
      .filter(cluster => cluster && typeof cluster === 'object' && cluster.id)
      .map(cluster => {
        // Find storage nodes for this cluster
        const clusterNodes = components.filter(
          component => component && 
          component.role === 'storageNode' && 
          component.clusterInfo && 
          component.clusterInfo.clusterId === cluster.id
        );
        
        if (clusterNodes.length === 0) {
          return null;
        }
        
        // Calculate total raw capacity and cost
        let totalRawCapacityTB = 0;
        let totalNodeCost = 0;
        
        clusterNodes.forEach(node => {
          if (!node) return;
          
          const quantity = typeof node.quantity === 'number' ? node.quantity : 1;
          totalNodeCost += (typeof node.cost === 'number' ? node.cost : 0) * quantity;
          
          // Add attached disks capacity
          const disks = Array.isArray(node.attachedDisks) ? node.attachedDisks : [];
          disks.forEach(disk => {
            if (disk && typeof disk === 'object' && typeof disk.capacityTB === 'number') {
              const diskQuantity = typeof disk.quantity === 'number' ? disk.quantity : 1;
              totalRawCapacityTB += disk.capacityTB * diskQuantity * quantity;
            }
          });
        });
        
        // Calculate usable capacity based on pool type
        const poolType = typeof cluster.poolType === 'string' ? cluster.poolType : '3 Replica';
        const poolEfficiencyFactor = typeof StoragePoolEfficiencyFactors[poolType] === 'number' 
          ? StoragePoolEfficiencyFactors[poolType] 
          : (1/3);
        
        const maxFillFactor = typeof cluster.maxFillFactor === 'number' 
          ? cluster.maxFillFactor / 100 
          : 0.8;
        
        const usableCapacityTB = totalRawCapacityTB * poolEfficiencyFactor;
        const usableCapacityTiB = usableCapacityTB * TB_TO_TIB_FACTOR;
        const effectiveCapacityTiB = usableCapacityTiB * maxFillFactor;
        
        // Calculate cost per TiB
        const costPerTiB = usableCapacityTiB > 0 ? totalNodeCost / usableCapacityTiB : 0;
        
        // Calculate total node count
        const nodeCount = clusterNodes.reduce((sum, node) => {
          const nodeQuantity = typeof node?.quantity === 'number' ? node.quantity : 1;
          return sum + nodeQuantity;
        }, 0);
        
        return {
          id: cluster.id,
          name: typeof cluster.name === 'string' ? cluster.name : '',
          poolType: poolType,
          maxFillFactor: typeof cluster.maxFillFactor === 'number' ? cluster.maxFillFactor : 80,
          totalRawCapacityTB,
          usableCapacityTB,
          usableCapacityTiB,
          effectiveCapacityTiB,
          totalNodeCost,
          costPerTiB,
          nodeCount
        };
      })
      .filter(Boolean);
  // CRITICAL: Use concrete primitive value in dependency array, not objects that could be undefined
  // This is the key to fixing the "Cannot read properties of undefined (reading 'length')" error
  }, [storeState.activeDesign?.id, storeState.requirements?.id]);
  
  return {
    storageClustersMetrics: Array.isArray(storageClustersMetrics) ? storageClustersMetrics : []
  };
};