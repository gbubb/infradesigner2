
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/store/slices/requirements/constants';

export const useStorageClusters = () => {
  const { activeDesign, requirements } = useDesignStore();
  
  // Calculate storage clusters metrics
  const storageClustersMetrics = useMemo(() => {
    // Ensure components array exists
    const components = activeDesign?.components || [];
    
    // Ensure storageClusters array exists
    const storageClusters = requirements?.storageRequirements?.storageClusters || [];
    
    if (components.length === 0 || storageClusters.length === 0) {
      return [];
    }

    return storageClusters.map(cluster => {
      // Find storage nodes for this cluster
      const clusterNodes = components.filter(
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
  }, [activeDesign, requirements]);  // Fix: Explicitly listing dependencies

  return {
    storageClustersMetrics
  };
};
