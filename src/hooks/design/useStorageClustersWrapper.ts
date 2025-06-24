
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/store/slices/requirements/constants';

export const useStorageClustersWrapper = () => {
  const { activeDesign, requirements } = useDesignStore();
  
  // Calculate storage clusters metrics
  const storageClustersMetrics = useMemo(() => {
    if (!activeDesign?.components || !requirements.storageRequirements.storageClusters) {
      console.log('[useStorageClustersWrapper] Missing data:', {
        hasComponents: !!activeDesign?.components,
        componentsLength: activeDesign?.components?.length || 0,
        hasStorageClusters: !!requirements.storageRequirements.storageClusters,
        storageClustersLength: requirements.storageRequirements.storageClusters?.length || 0
      });
      return [];
    }

    return requirements.storageRequirements.storageClusters.map(cluster => {
      let clusterNodes = [];
      
      console.log(`[useStorageClustersWrapper] Processing storage cluster:`, {
        clusterName: cluster.name,
        clusterId: cluster.id,
        isHyperConverged: cluster.hyperConverged,
        computeClusterId: cluster.computeClusterId,
        poolType: cluster.poolType
      });
      
      // Check if this is a hyper-converged storage cluster
      if (cluster.hyperConverged && cluster.computeClusterId) {
        // Find hyper-converged nodes from the compute cluster
        clusterNodes = activeDesign.components.filter(
          component => component.role === 'hyperConvergedNode' && 
          (component as any).clusterInfo?.clusterId === cluster.computeClusterId
        );
      } else {
        // Find regular storage nodes for this cluster
        clusterNodes = activeDesign.components.filter(
          component => component.role === 'storageNode' && 
          (component as any).clusterInfo?.clusterId === cluster.id
        );
      }
      
      console.log(`[useStorageClustersWrapper] Cluster ${cluster.name}:`, {
        clusterId: cluster.id,
        isHyperConverged: cluster.hyperConverged,
        computeClusterId: cluster.computeClusterId,
        nodesFound: clusterNodes.length,
        nodeTypes: clusterNodes.map(n => n.role),
        allStorageNodes: activeDesign.components.filter(c => c.role === 'storageNode').length,
        allHyperConvergedNodes: activeDesign.components.filter(c => c.role === 'hyperConvergedNode').length
      });
      
      // Calculate total raw capacity
      let totalRawCapacityTB = 0;
      let totalNodeCost = 0;
      
      clusterNodes.forEach(node => {
        const quantity = node.quantity || 1;
        totalNodeCost += node.cost * quantity;
        
        // Add attached disks capacity if available
        if ('attachedDisks' in node) {
          const disks = (node as any).attachedDisks || [];
          console.log(`[useStorageClustersWrapper] Node ${node.name} disks:`, {
            nodeName: node.name,
            nodeRole: node.role,
            hasAttachedDisks: 'attachedDisks' in node,
            disksCount: disks.length,
            disks: disks.map((d: any) => ({ 
              model: d.model, 
              capacityTB: d.capacityTB, 
              quantity: d.quantity 
            }))
          });
          disks.forEach((disk: any) => {
            if (disk && 'capacityTB' in disk) {
              totalRawCapacityTB += disk.capacityTB * (disk.quantity || 1) * quantity;
            }
          });
        } else {
          console.log(`[useStorageClustersWrapper] Node ${node.name} has no attachedDisks property`);
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
      
      const result = {
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
      
      console.log(`[useStorageClustersWrapper] Cluster ${cluster.name} metrics:`, result);
      
      return result;
    });
  }, [activeDesign, requirements]);

  return {
    storageClustersMetrics
  };
};
