
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/store/slices/requirements/constants';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import { ClusterInfo } from '@/types/infrastructure/roles-types';
import { DiskAttachment } from '@/types/infrastructure/storage-types';
import { Server } from '@/types/infrastructure/server-types';

export const useStorageClustersWrapper = () => {
  const { activeDesign, requirements, componentTemplates } = useDesignStore();
  
  // Calculate storage clusters metrics
  const storageClustersMetrics = useMemo(() => {
    if (!activeDesign?.components || !requirements.storageRequirements.storagePools) {
      console.log('[useStorageClustersWrapper] Missing data:', {
        hasComponents: !!activeDesign?.components,
        componentsLength: activeDesign?.components?.length || 0,
        hasStoragePools: !!requirements.storageRequirements.storagePools,
        storagePoolsLength: requirements.storageRequirements.storagePools?.length || 0
      });
      return [];
    }

    return requirements.storageRequirements.storagePools.map(pool => {
      // Find the physical storage cluster this pool targets
      const targetCluster = requirements.storageRequirements.storageClusters.find(
        sc => sc.id === pool.storageClusterId
      );

      let clusterNodes = [];

      // Check if this pool targets a hyper-converged physical cluster
      if (targetCluster?.type === 'hyperConverged' && targetCluster.computeClusterId) {
        // Find hyper-converged nodes from the compute cluster
        clusterNodes = activeDesign.components.filter(
          component => component.role === 'hyperConvergedNode' &&
          component.clusterInfo?.clusterId === targetCluster.computeClusterId
        );
      } else if (targetCluster) {
        // Find regular storage nodes for this physical cluster
        clusterNodes = activeDesign.components.filter(
          component => component.role === 'storageNode' &&
          component.clusterInfo?.clusterId === targetCluster.id
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
              // For hyper-converged clusters, only count disks tagged for this physical storage cluster
              if (targetCluster?.type === 'hyperConverged') {
                if ('storageClusterId' in disk && disk.storageClusterId === targetCluster.id) {
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
                    quantity: diskQuantity,
                    cost: diskUnitCost
                  });
                }
              } else {
                // For conventional storage nodes, count all disks
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
                  quantity: diskQuantity,
                  cost: diskUnitCost
                });
              }
            }
          });
          
          nodeDiskCost = diskCostForNode;
          nodeDiskCount = totalDisksInNode;
          
          // For hyper-converged nodes, calculate storage-specific cost
          // This provides a more accurate Cost per TiB by only including the
          // portion of server cost attributable to storage operations
          if (targetCluster?.type === 'hyperConverged' && targetCluster.computeClusterId) {
            // Try to get CPU info from the node itself first (if it's a Server type)
            let cores = 0;
            
            if (node.type === ComponentType.Server && 'cpuSockets' in node && 'cpuCoresPerSocket' in node) {
              // Node is already a Server type with CPU info
              const serverNode = node as Server;
              cores = (serverNode.cpuSockets || 0) * (serverNode.cpuCoresPerSocket || 0);
              
              console.log('[StorageCluster] Using CPU info from node directly:', {
                nodeName: node.name,
                cpuSockets: serverNode.cpuSockets,
                cpuCoresPerSocket: serverNode.cpuCoresPerSocket,
                totalCores: cores
              });
            } else if (node.componentId) {
              // Find the server template to get CPU core count
              const serverTemplate = componentTemplates.find(t => t.id === node.componentId);
              
              // Debug logging
              console.log('[StorageCluster] Looking for server template:', {
                nodeComponentId: node.componentId,
                nodeType: node.type,
                templateFound: !!serverTemplate,
                templateType: serverTemplate?.type,
                expectedType: ComponentType.Server,
                typeMatch: serverTemplate?.type === ComponentType.Server
              });
              
              if (serverTemplate && serverTemplate.type === ComponentType.Server) {
                const server = serverTemplate as Server;
                cores = (server.cpuSockets || 0) * (server.cpuCoresPerSocket || 0);
                
                console.log('[StorageCluster] CPU calculation from template:', {
                  nodeName: node.name,
                  componentId: node.componentId,
                  serverName: server.name,
                  cpuSockets: server.cpuSockets,
                  cpuCoresPerSocket: server.cpuCoresPerSocket,
                  totalCores: cores
                });
              }
            }
            
            if (cores > 0) {
              totalCpuCores += cores * quantity;
              
              // Assign 4 CPU cores per disk for storage operations
              const storageCoresForNode = totalDisksInNode * cpuCoresPerDisk;
              storageCpuCores += storageCoresForNode * quantity;
              const storageRatio = Math.min(storageCoresForNode / cores, 1); // Cap at 100%
              
              // Storage cost = proportional server cost + disk cost
              // Example: 8 disks = 32 cores, on 96-core server = 33.3% of server cost
              const serverStorageCost = serverUnitCost * storageRatio * quantity;
              storageAttributedServerCost += serverStorageCost;
              totalStorageCost += serverStorageCost + diskCostForNode;
            } else {
              // Fallback if no CPU info available
              console.log('[StorageCluster] No CPU info available for node:', node.name);
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
        
        const nodeBreakdown = {
          name: serverName,
          quantity: quantity,
          serverCost: serverUnitCost,  // Use unit cost, not total
          diskCost: nodeDiskCost / quantity,  // Per-node disk cost
          diskCount: nodeDiskCount,
          diskDetails: nodeDisks
        };
        
        costBreakdown.nodes.push(nodeBreakdown);
        
        // Debug logging
        console.log('[StorageCluster] Node breakdown added:', {
          poolName: pool.name,
          nodeBreakdown,
          totalNodesInBreakdown: costBreakdown.nodes.length
        });
      });
      
      // Calculate usable capacity based on pool type
      const poolEfficiencyFactor = StoragePoolEfficiencyFactors[pool.poolType || '3 Replica'] || (1/3);
      const maxFillFactor = (pool.maxFillFactor || 80) / 100;
      
      const usableCapacityTB = totalRawCapacityTB * poolEfficiencyFactor;
      const usableCapacityTiB = usableCapacityTB * TB_TO_TIB_FACTOR;
      const effectiveCapacityTiB = usableCapacityTiB * maxFillFactor;

      // Calculate cost per TiB using appropriate cost basis
      // For hyper-converged: use storage-attributed costs only
      // For non-converged: use total server + disk costs
      // IMPORTANT: Use effective capacity (after max fill factor) for accurate cost per TiB
      const costBasis = targetCluster?.type === 'hyperConverged' ? totalStorageCost : (totalNodeCost + totalDiskCost);

      // Amortize capital cost over device lifespan to get monthly cost
      const lifespanYears = requirements.storageRequirements?.deviceLifespanYears || 3;
      const lifespanMonths = lifespanYears * 12;
      const monthlyAmortizedCost = costBasis / lifespanMonths;

      // Calculate monthly cost per TiB
      const costPerTiB = effectiveCapacityTiB > 0 ? monthlyAmortizedCost / effectiveCapacityTiB : 0;

      const result = {
        id: pool.id,
        name: pool.name,
        poolType: pool.poolType,
        maxFillFactor: pool.maxFillFactor,
        totalRawCapacityTB,
        usableCapacityTB,
        usableCapacityTiB,
        effectiveCapacityTiB,
        totalNodeCost: targetCluster?.type === 'hyperConverged' ? totalNodeCost : (totalNodeCost + totalDiskCost),
        costPerTiB,
        nodeCount: clusterNodes.reduce((sum, node) => sum + (node.quantity || 1), 0),
        isHyperConverged: targetCluster?.type === 'hyperConverged' || false,
        totalStorageCost: targetCluster?.type === 'hyperConverged' ? totalStorageCost : undefined,
        // Additional detailed breakdown
        totalDiskCost,
        totalServerCost,
        totalDisks,
        storageAttributedServerCost: targetCluster?.type === 'hyperConverged' ? storageAttributedServerCost : undefined,
        totalCpuCores: targetCluster?.type === 'hyperConverged' ? totalCpuCores : undefined,
        storageCpuCores: targetCluster?.type === 'hyperConverged' ? storageCpuCores : undefined,
        cpuCoresPerDisk: targetCluster?.type === 'hyperConverged' ? cpuCoresPerDisk : undefined,
        lifespanYears,
        costBreakdown
      };
      
      console.log('[StorageCluster] Final cluster metrics:', {
        clusterName: pool.name,
        isHyperConverged: targetCluster?.type === 'hyperConverged',
        nodesFound: clusterNodes.length,
        costBreakdownNodes: costBreakdown.nodes.length,
        totalCpuCores,
        storageCpuCores,
        result
      });
      
      return result;
    });
  }, [activeDesign, requirements, componentTemplates]);

  return {
    storageClustersMetrics
  };
};
