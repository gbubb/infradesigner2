
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/store/slices/requirements/constants';

export const useStorageClusters = () => {
  // Destructure with default empty objects to prevent undefined errors
  const { activeDesign = {}, requirements = {} } = useDesignStore(state => ({
    activeDesign: state.activeDesign || {},
    requirements: state.requirements || {}
  }));
  
  // Calculate storage clusters metrics
  const storageClustersMetrics = useMemo(() => {
    // Ensure components array exists
    const components = activeDesign?.components || [];
    
    // Ensure storageClusters array exists
    const storageRequirements = requirements?.storageRequirements || {};
    const storageClusters = storageRequirements?.storageClusters || [];
    
    if (!Array.isArray(components) || !Array.isArray(storageClusters) || components.length === 0 || storageClusters.length === 0) {
      return [];
    }

    return storageClusters.map(cluster => {
      if (!cluster || !cluster.id) {
        return null;
      }
      
      // Find storage nodes for this cluster
      const clusterNodes = components.filter(
        component => component && 
        component.role === 'storageNode' && 
        (component as any).clusterInfo && 
        (component as any).clusterInfo?.clusterId === cluster.id
      );
      
      // Calculate total raw capacity
      let totalRawCapacityTB = 0;
      let totalNodeCost = 0;
      
      clusterNodes.forEach(node => {
        if (!node) return;
        
        const quantity = node.quantity || 1;
        totalNodeCost += (node.cost || 0) * quantity;
        
        // Add attached disks capacity if available
        if ('attachedDisks' in node) {
          const disks = (node as any).attachedDisks || [];
          if (Array.isArray(disks)) {
            disks.forEach((disk: any) => {
              if (disk && 'capacityTB' in disk) {
                totalRawCapacityTB += disk.capacityTB * (disk.quantity || 1) * quantity;
              }
            });
          }
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
      
      // Calculate total node count
      const nodeCount = clusterNodes.reduce((sum, node) => sum + (node?.quantity || 1), 0);
      
      return {
        id: cluster.id,
        name: cluster.name || '',
        poolType: cluster.poolType || '',
        maxFillFactor: cluster.maxFillFactor || 80,
        totalRawCapacityTB,
        usableCapacityTB,
        usableCapacityTiB,
        effectiveCapacityTiB,
        totalNodeCost,
        costPerTiB,
        nodeCount
      };
    }).filter(Boolean); // Filter out null values
  }, [activeDesign, requirements]); // Use parent objects as dependencies and handle null checks inside

  return {
    storageClustersMetrics: Array.isArray(storageClustersMetrics) ? storageClustersMetrics : []
  };
};
