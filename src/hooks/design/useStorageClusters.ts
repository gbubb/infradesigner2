
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/store/slices/requirements/constants';
import { 
  InfrastructureComponent, 
  InfrastructureDesign, 
  DesignRequirements, 
  StorageClusterRequirement 
} from '@/types/infrastructure';

export const useStorageClusters = () => {
  // Create stable references to state from the store
  const activeDesign = useDesignStore(state => state.activeDesign || null);
  const requirements = useDesignStore(state => state.requirements || {}) as DesignRequirements;
  
  // Calculate storage clusters metrics
  const storageClustersMetrics = useMemo(() => {
    // Early return with empty array if either dependency is null/undefined
    if (!activeDesign || !requirements) {
      return [];
    }
    
    // Ensure components array exists with proper typing
    const components = activeDesign.components as InfrastructureComponent[] || [];
    
    // Ensure storageRequirements exists with proper typing and has a default empty object
    const storageRequirements = requirements.storageRequirements || { storageClusters: [] };
    
    // Make sure we handle storageClusters as an array with proper typing
    const storageClusters = Array.isArray(storageRequirements.storageClusters) ? 
      storageRequirements.storageClusters : [];
    
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
  }, [activeDesign, requirements]); // Use stable references as dependencies

  return {
    storageClustersMetrics: Array.isArray(storageClustersMetrics) ? storageClustersMetrics : []
  };
};
