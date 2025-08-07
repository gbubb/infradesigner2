import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';
import { DesignRequirements } from '@/types/infrastructure/requirements-types';

/**
 * Custom hook for calculating device counts per cluster for network cost apportionment
 */
export function useClusterDeviceCounts(requirements: DesignRequirements) {
  // Calculate device counts per cluster for network cost apportionment
  const clusterDeviceCounts = useMemo(() => {
    const { activeDesign } = useDesignStore.getState();
    if (!activeDesign?.components) return {};

    const deviceCounts: Record<string, number> = {};
    
    // Get compute cluster requirements to map device counts
    const computeClusters = requirements.computeRequirements?.computeClusters || [];
    const storageClusters = requirements.storageRequirements?.storageClusters || [];

    // Count servers per cluster based on requirements
    computeClusters.forEach(cluster => {
      // Calculate nodes needed for this cluster based on vCPU and memory requirements
      const servers = activeDesign.components.filter(
        component => component.type === ComponentType.Server && 
        component.role === 'computeNode'
      );
      
      // For simplicity, distribute compute nodes evenly across compute clusters
      // In a real implementation, this would be based on actual cluster assignments
      const totalComputeNodes = servers.reduce((sum, server) => sum + (server.quantity || 1), 0);
      deviceCounts[cluster.id] = Math.ceil(totalComputeNodes / computeClusters.length);
    });

    storageClusters.forEach(cluster => {
      // Count storage nodes for each storage cluster
      const storageNodes = activeDesign.components.filter(
        component => component.type === ComponentType.Server && 
        component.role === 'storageNode'
      );
      
      // For simplicity, distribute storage nodes evenly across storage clusters
      const totalStorageNodes = storageNodes.reduce((sum, server) => sum + (server.quantity || 1), 0);
      deviceCounts[cluster.id] = Math.ceil(totalStorageNodes / storageClusters.length);
    });

    return deviceCounts;
  }, [requirements]);

  // Calculate total device count for proportional network cost allocation
  const totalDeviceCount = useMemo(() => {
    return Object.values(clusterDeviceCounts).reduce((sum, count) => sum + count, 0);
  }, [clusterDeviceCounts]);

  // Calculate network cost apportionment per cluster
  const getNetworkCostApportionment = (networkCost: number): Record<string, number> => {
    const apportionment: Record<string, number> = {};
    
    Object.entries(clusterDeviceCounts).forEach(([clusterId, deviceCount]) => {
      if (totalDeviceCount > 0) {
        apportionment[clusterId] = (networkCost * (deviceCount / totalDeviceCount));
      } else {
        apportionment[clusterId] = 0;
      }
    });
    
    return apportionment;
  };

  return {
    clusterDeviceCounts,
    totalDeviceCount,
    getNetworkCostApportionment
  };
}