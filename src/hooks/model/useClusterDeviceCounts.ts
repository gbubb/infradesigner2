import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';
import { DesignRequirements } from '@/types/infrastructure/requirements-types';
import { ComponentWithPlacement } from '@/types/service-types';

/**
 * Custom hook for calculating device counts per cluster for network cost apportionment
 */
export function useClusterDeviceCounts(requirements: DesignRequirements) {
  // Subscribe to activeDesign from store to get reactive updates
  const activeDesign = useDesignStore(state => state.activeDesign);

  // Calculate device counts per cluster for network cost apportionment
  const clusterDeviceCounts = useMemo(() => {
    if (!activeDesign?.components) return {};

    const deviceCounts: Record<string, number> = {};

    // Get compute cluster requirements to map device counts
    const computeClusters = requirements.computeRequirements?.computeClusters || [];
    const storageClusters = requirements.storageRequirements?.storageClusters || [];

    // Count servers per cluster based on actual cluster assignments
    computeClusters.forEach(cluster => {
      // Count compute nodes that are actually assigned to this cluster
      // Include computeNode, gpuNode, and hyperConvergedNode roles
      const clusterNodes = activeDesign.components.filter(
        component => component.type === ComponentType.Server &&
        (component.role === 'computeNode' || component.role === 'gpuNode' || component.role === 'hyperConvergedNode') &&
        (component as ComponentWithPlacement).clusterInfo?.clusterId === cluster.id
      );

      const nodeCount = clusterNodes.reduce((sum, server) => sum + (server.quantity || 1), 0);
      deviceCounts[cluster.id] = nodeCount;

      // Debug logging
      if (nodeCount === 0) {
        const allComputeNodes = activeDesign.components.filter(
          component => component.type === ComponentType.Server &&
          (component.role === 'computeNode' || component.role === 'gpuNode' || component.role === 'hyperConvergedNode')
        );
        console.log(`[useClusterDeviceCounts] No nodes found for cluster "${cluster.name}" (${cluster.id})`);
        console.log(`[useClusterDeviceCounts] Total compute nodes in design:`, allComputeNodes.length);
        if (allComputeNodes.length > 0) {
          console.log(`[useClusterDeviceCounts] Sample compute node clusterInfo:`, (allComputeNodes[0] as ComponentWithPlacement).clusterInfo);
        }
      }
    });

    storageClusters.forEach(cluster => {
      // Count storage nodes and disks that are actually assigned to this cluster
      const clusterStorageComponents = activeDesign.components.filter(
        component => (
          (component.type === ComponentType.Server && component.role === 'storageNode') ||
          component.type === ComponentType.Disk
        ) &&
        (component as ComponentWithPlacement).clusterInfo?.clusterId === cluster.id
      );

      const deviceCount = clusterStorageComponents.reduce((sum, device) => sum + (device.quantity || 1), 0);
      deviceCounts[cluster.id] = deviceCount;

      // Debug logging
      if (deviceCount === 0) {
        const allStorageComponents = activeDesign.components.filter(
          component => (component.type === ComponentType.Server && component.role === 'storageNode') ||
          component.type === ComponentType.Disk
        );
        console.log(`[useClusterDeviceCounts] No storage devices found for cluster "${cluster.name}" (${cluster.id})`);
        console.log(`[useClusterDeviceCounts] Total storage components in design:`, allStorageComponents.length);
        if (allStorageComponents.length > 0) {
          console.log(`[useClusterDeviceCounts] Sample storage component clusterInfo:`, (allStorageComponents[0] as ComponentWithPlacement).clusterInfo);
        }
      }
    });

    return deviceCounts;
  }, [activeDesign?.components, requirements]);

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