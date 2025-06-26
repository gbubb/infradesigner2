
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/store/slices/requirements/constants';
import { InfrastructureComponent } from '@/types/infrastructure';
import { ClusterInfo } from '@/types/infrastructure/roles-types';
import { DiskAttachment } from '@/types/infrastructure/storage-types';

export const useStorageClustersWrapper = () => {
  const { activeDesign, requirements, componentTemplates } = useDesignStore();
  
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
      
      // Check if this is a hyper-converged storage cluster
      if (cluster.hyperConverged && cluster.computeClusterId) {
        // Find hyper-converged nodes from the compute cluster
        clusterNodes = activeDesign.components.filter(
          component => component.role === 'hyperConvergedNode' && 
          component.clusterInfo?.clusterId === cluster.computeClusterId
        );
      } else {
        // Find regular storage nodes for this cluster
        clusterNodes = activeDesign.components.filter(
          component => component.role === 'storageNode' && 
          component.clusterInfo?.clusterId === cluster.id
        );
      }
      
      // Calculate total raw capacity and costs
      let totalRawCapacityTB = 0;
      let totalNodeCost = 0;
      let totalStorageCost = 0;
      
      clusterNodes.forEach(node => {
        const quantity = node.quantity || 1;
        const nodeCost = node.cost * quantity;
        totalNodeCost += nodeCost;
        
        // Add attached disks capacity and calculate storage-specific costs
        if ('attachedDisks' in node && node.attachedDisks) {
          const disks = node.attachedDisks || [];
          let totalDisksInNode = 0;
          let diskCostForNode = 0;
          
          disks.forEach((disk) => {
            if (disk && 'capacityTB' in disk) {
              const diskQuantity = disk.quantity || 1;
              totalRawCapacityTB += disk.capacityTB * diskQuantity * quantity;
              totalDisksInNode += diskQuantity;
              diskCostForNode += disk.cost * diskQuantity * quantity;
            }
          });
          
          // For hyper-converged nodes, calculate storage-specific cost
          // This provides a more accurate Cost per TiB by only including the 
          // portion of server cost attributable to storage operations
          if (cluster.hyperConverged && cluster.computeClusterId && node.componentId) {
            // Find the server template to get CPU core count
            const serverTemplate = componentTemplates.find(t => t.id === node.componentId);
            if (serverTemplate && serverTemplate.type === 'server') {
              const server = serverTemplate as { cpuSockets?: number; cpuCoresPerSocket?: number };
              const totalCores = (server.cpuSockets || 0) * (server.cpuCoresPerSocket || 0);
              
              if (totalCores > 0) {
                // Assign 4 CPU cores per disk for storage operations
                const storageCores = totalDisksInNode * 4;
                const storageRatio = Math.min(storageCores / totalCores, 1); // Cap at 100%
                
                // Storage cost = disk cost + proportional server cost
                // Example: 2 disks = 8 cores, on 64-core server = 12.5% of server cost
                const serverStorageCost = (nodeCost - diskCostForNode) * storageRatio;
                totalStorageCost += diskCostForNode + serverStorageCost;
              } else {
                // Fallback if no CPU info available
                totalStorageCost += diskCostForNode;
              }
            } else {
              // Fallback if template not found
              totalStorageCost += diskCostForNode;
            }
          } else {
            // For conventional storage nodes, use full node cost
            totalStorageCost += nodeCost;
          }
        }
      });
      
      // Calculate usable capacity based on pool type
      const poolEfficiencyFactor = StoragePoolEfficiencyFactors[cluster.poolType || '3 Replica'] || (1/3);
      const maxFillFactor = (cluster.maxFillFactor || 80) / 100;
      
      const usableCapacityTB = totalRawCapacityTB * poolEfficiencyFactor;
      const usableCapacityTiB = usableCapacityTB * TB_TO_TIB_FACTOR;
      const effectiveCapacityTiB = usableCapacityTiB * maxFillFactor;
      
      // Calculate cost per TiB using appropriate cost basis
      const costBasis = cluster.hyperConverged ? totalStorageCost : totalNodeCost;
      const costPerTiB = usableCapacityTiB > 0 ? costBasis / usableCapacityTiB : 0;
      
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
  }, [activeDesign, requirements, componentTemplates]);

  return {
    storageClustersMetrics
  };
};
