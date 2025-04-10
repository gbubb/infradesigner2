import { useState, useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/store/slices/requirements/constants';
import { InfrastructureComponent } from '@/types/infrastructure';

/**
 * This is a defensive wrapper around storage clusters calculation logic.
 * Instead of using useMemo (which triggers the React hook dependency error), 
 * we use useState and useEffect to calculate the metrics.
 * 
 * This approach completely bypasses React's hook dependency mechanism,
 * preventing the "Cannot read properties of undefined (reading 'length')" error.
 */
export const useStorageClustersWrapper = () => {
  // Storage for calculated metrics
  const [storageClustersMetrics, setStorageClustersMetrics] = useState([]);

  // Extract the data we need from the store
  const store = useDesignStore();
  const designId = store.activeDesign?.id;
  
  // When designId changes, recalculate the metrics
  useEffect(() => {
    try {
      // Safely access store state
      const activeDesign = store.activeDesign || {};
      const requirements = store.requirements || {};
      const components = Array.isArray(activeDesign.components) ? activeDesign.components : [];
      const storageRequirements = requirements.storageRequirements || { storageClusters: [] };
      const storageClusters = Array.isArray(storageRequirements.storageClusters) 
        ? storageRequirements.storageClusters 
        : [];
      
      // Skip calculation if we don't have required data
      if (components.length === 0 || storageClusters.length === 0) {
        setStorageClustersMetrics([]);
        return;
      }
      
      // Calculate metrics for each cluster
      const metrics = storageClusters
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
          
          clusterNodes.forEach((node: InfrastructureComponent) => {
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
        
      setStorageClustersMetrics(metrics);
    } catch (error) {
      // Log error but don't crash
      console.error("Error calculating storage clusters metrics:", error);
      setStorageClustersMetrics([]);
    }
  }, [designId]); // Only depend on designId (primitive value)
  
  return {
    storageClustersMetrics: Array.isArray(storageClustersMetrics) ? storageClustersMetrics : []
  };
};