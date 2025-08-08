import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComputeClusterMetrics } from '@/components/results/ComputeClustersTable';

export const useComputeClusters = () => {
  const activeDesign = useDesignStore((state) => state.activeDesign);
  const componentRoles = useDesignStore((state) => state.componentRoles);
  
  const computeClustersMetrics = useMemo(() => {
    console.log('[useComputeClusters] Starting calculation:', {
      hasActiveDesign: !!activeDesign,
      componentRolesCount: componentRoles?.length || 0,
      componentRoles: componentRoles?.map(r => ({ 
        role: r.role, 
        assignedComponentId: r.assignedComponentId,
        clusterInfo: r.clusterInfo 
      }))
    });

    if (!activeDesign || !componentRoles) {
      return [];
    }

    const clusters: ComputeClusterMetrics[] = [];
    const clusterMap = new Map<string, {
      roles: any[],
      name: string,
      isHyperConverged: boolean,
      gpuEnabled: boolean
    }>();

    // Group component roles by cluster
    componentRoles.forEach(role => {
      if (!role.assignedComponentId) {
        console.log('[useComputeClusters] Skipping role without assignedComponentId:', role.role);
        return;
      }
      
      // Check if this is a compute-related role
      const isComputeRole = 
        role.role === 'computeNode' || 
        role.role === 'hyperConvergedNode' || 
        role.role === 'gpuNode';
      
      console.log('[useComputeClusters] Role check:', {
        role: role.role,
        isComputeRole,
        assignedComponentId: role.assignedComponentId
      });
      
      if (!isComputeRole) return;

      const clusterId = role.clusterInfo?.clusterId || role.role;
      const clusterName = role.clusterInfo?.clusterName || role.role;
      
      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, {
          roles: [],
          name: clusterName,
          isHyperConverged: role.role === 'hyperConvergedNode',
          gpuEnabled: role.role === 'gpuNode'
        });
      }
      
      clusterMap.get(clusterId)?.roles.push(role);
    });

    // Calculate metrics for each cluster
    clusterMap.forEach((clusterData, clusterId) => {
      const { roles, name, isHyperConverged, gpuEnabled } = clusterData;
      
      // Find the component details
      const firstRole = roles[0];
      const component = activeDesign.components?.find(
        (c: any) => c.id === firstRole.assignedComponentId
      );
      
      if (!component) return;

      // Calculate total nodes
      const nodeCount = roles.reduce((sum, role) => 
        sum + (role.requiredCount || role.adjustedRequiredCount || 0), 0
      );

      // Get component specifications
      const cores = component.specifications?.cpu?.cores || 
                   component.cpu?.cores || 
                   component.cpuCores || 0;
      const memory = component.specifications?.memory?.capacity || 
                    component.memory?.capacity || 
                    component.memoryGB || 0;
      const gpuCount = component.specifications?.gpu?.quantity || 
                      component.gpu?.quantity || 0;

      // Get overcommit ratios from requirements
      const cpuOvercommitRatio = activeDesign.requirements?.compute?.cpu?.oversubscriptionRatio || 
                                activeDesign.requirements?.computeRequirements?.cpu?.oversubscriptionRatio || 4;
      const memoryOvercommitRatio = activeDesign.requirements?.compute?.memory?.oversubscriptionRatio || 
                                   activeDesign.requirements?.computeRequirements?.memory?.oversubscriptionRatio || 1;

      // Calculate totals
      const physicalCores = cores * nodeCount;
      const physicalMemoryGB = memory * nodeCount;
      const totalVCPUs = physicalCores * cpuOvercommitRatio;
      const allocatableMemoryGB = physicalMemoryGB * memoryOvercommitRatio;

      // Get availability zone count from requirements
      const totalAvailabilityZones = activeDesign.requirements?.physicalConstraints?.totalAvailabilityZones || 
                                    activeDesign.requirements?.physical?.datacenter?.availabilityZoneCount || 8;
      
      // Find the corresponding compute cluster configuration to get AZ redundancy
      const computeClusters = activeDesign.requirements?.computeRequirements?.computeClusters || 
                            activeDesign.requirements?.compute?.clusters || [];
      const clusterConfig = computeClusters.find((c: any) => c.id === clusterId || c.name === name);
      
      // Calculate actual AZ count for this cluster
      let availabilityZoneCount = totalAvailabilityZones;
      if (clusterConfig?.availabilityZoneRedundancy === 'N+1') {
        availabilityZoneCount = totalAvailabilityZones + 1;
      } else if (clusterConfig?.availabilityZoneRedundancy === 'N+2') {
        availabilityZoneCount = totalAvailabilityZones + 2;
      }

      clusters.push({
        id: clusterId,
        name,
        availabilityZoneCount,
        physicalCores,
        cpuOvercommitRatio,
        totalVCPUs,
        physicalMemoryGB,
        memoryOvercommitRatio,
        allocatableMemoryGB,
        nodeCount,
        isHyperConverged,
        gpuEnabled,
        gpuCount: gpuEnabled ? gpuCount * nodeCount : undefined
      });
    });

    console.log('[useComputeClusters] Final clusters:', clusters);
    return clusters;
  }, [activeDesign, componentRoles]);

  return { computeClustersMetrics };
};