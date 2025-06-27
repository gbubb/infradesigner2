
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
      let totalDiskCost = 0;
      let totalServerCost = 0;
      let totalDisks = 0;
      let storageAttributedServerCost = 0;
      const cpuCoresPerDisk = 4;
      let totalCpuCores = 0;
      let storageCpuCores = 0;
      
      // Detailed breakdown for cost calculation
      const costBreakdown = {
        nodes: [] as Array<{
          name: string;
          quantity: number;
          serverCost: number;
          diskCost: number;
          diskCount: number;
          diskDetails: Array<{ name: string; capacityTB: number; quantity: number; cost: number }>;
        }>
      };
      
      clusterNodes.forEach(node => {
        const quantity = node.quantity || 1;
        const serverUnitCost = node.cost || 0;
        const nodeCost = serverUnitCost * quantity;
        totalNodeCost += nodeCost;
        totalServerCost += nodeCost;
        
        const nodeDisks: Array<{ name: string; capacityTB: number; quantity: number; cost: number }> = [];
        let nodeDiskCost = 0;
        let nodeDiskCount = 0;
        
        // Add attached disks capacity and calculate storage-specific costs
        if ('attachedDisks' in node && node.attachedDisks) {
          const disks = node.attachedDisks || [];
          let totalDisksInNode = 0;
          let diskCostForNode = 0;
          
          disks.forEach((disk) => {
            if (disk && 'capacityTB' in disk) {
              const diskQuantity = disk.quantity || 1;
              const diskUnitCost = disk.cost || 0;
              const diskTotalCost = diskUnitCost * diskQuantity * quantity;
              
              totalRawCapacityTB += disk.capacityTB * diskQuantity * quantity;
              totalDisksInNode += diskQuantity;
              diskCostForNode += diskTotalCost;
              totalDiskCost += diskTotalCost;
              totalDisks += diskQuantity * quantity;
              
              nodeDisks.push({
                name: disk.name || `${disk.capacityTB}TB Disk`,
                capacityTB: disk.capacityTB,
                quantity: diskQuantity * quantity,
                cost: diskTotalCost
              });
            }
          });
          
          nodeDiskCost = diskCostForNode;
          nodeDiskCount = totalDisksInNode;
          
          // For hyper-converged nodes, calculate storage-specific cost
          // This provides a more accurate Cost per TiB by only including the 
          // portion of server cost attributable to storage operations
          if (cluster.hyperConverged && cluster.computeClusterId && node.componentId) {
            // Find the server template to get CPU core count
            const serverTemplate = componentTemplates.find(t => t.id === node.componentId);
            if (serverTemplate && serverTemplate.type === 'server') {
              const server = serverTemplate as { cpuSockets?: number; cpuCoresPerSocket?: number; name?: string };
              const cores = (server.cpuSockets || 0) * (server.cpuCoresPerSocket || 0);
              totalCpuCores += cores * quantity;
              
              if (cores > 0) {
                // Assign 4 CPU cores per disk for storage operations
                const storageCoresForNode = totalDisksInNode * cpuCoresPerDisk;
                storageCpuCores += storageCoresForNode * quantity;
                const storageRatio = Math.min(storageCoresForNode / cores, 1); // Cap at 100%
                
                // Storage cost = disk cost + proportional server cost
                // Example: 2 disks = 8 cores, on 64-core server = 12.5% of server cost
                const serverCostWithoutDisks = nodeCost - diskCostForNode;
                const serverStorageCost = serverCostWithoutDisks * storageRatio;
                storageAttributedServerCost += serverStorageCost;
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
        
        // Find server name from template
        const serverTemplate = componentTemplates.find(t => t.id === node.componentId);
        const serverName = serverTemplate?.name || node.name || 'Server';
        
        costBreakdown.nodes.push({
          name: serverName,
          quantity: quantity,
          serverCost: nodeCost,
          diskCost: nodeDiskCost,
          diskCount: nodeDiskCount,
          diskDetails: nodeDisks
        });
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
        nodeCount: clusterNodes.reduce((sum, node) => sum + (node.quantity || 1), 0),
        isHyperConverged: cluster.hyperConverged || false,
        totalStorageCost: cluster.hyperConverged ? totalStorageCost : undefined,
        // Additional detailed breakdown
        totalDiskCost,
        totalServerCost,
        totalDisks,
        storageAttributedServerCost: cluster.hyperConverged ? storageAttributedServerCost : undefined,
        totalCpuCores: cluster.hyperConverged ? totalCpuCores : undefined,
        storageCpuCores: cluster.hyperConverged ? storageCpuCores : undefined,
        cpuCoresPerDisk: cluster.hyperConverged ? cpuCoresPerDisk : undefined,
        costBreakdown
      };
    });
  }, [activeDesign, requirements, componentTemplates]);

  return {
    storageClustersMetrics
  };
};
