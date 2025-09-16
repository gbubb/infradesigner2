import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComputeClusterMetrics } from '@/components/results/ComputeClustersTable';

export const useComputeClusters = () => {
  const activeDesign = useDesignStore((state) => state.activeDesign);
  const componentRoles = useDesignStore((state) => state.componentRoles);
  const componentTemplates = useDesignStore((state) => state.componentTemplates);
  const requirements = useDesignStore((state) => state.requirements);
  
  const computeClustersMetrics = useMemo(() => {
    console.log('[useComputeClusters] Starting calculation:', {
      hasActiveDesign: !!activeDesign,
      componentRolesCount: componentRoles?.length || 0,
      componentRoles: componentRoles?.map(r => ({ 
        role: r.role, 
        assignedComponentId: r.assignedComponentId,
        clusterInfo: r.clusterInfo 
      })),
      activeDesignStructure: activeDesign ? {
        hasComponents: !!activeDesign.components,
        componentsIsArray: Array.isArray(activeDesign.components),
        componentsLength: activeDesign.components?.length,
        computeNodeCount: activeDesign.components?.filter((c) => 
          c.name?.includes('Compute') || c.role === 'hyperConvergedNode'
        ).length,
        firstComponent: activeDesign.components?.[0]
      } : null
    });

    if (!activeDesign || !componentRoles) {
      return [];
    }

    const clusters: ComputeClusterMetrics[] = [];
    const clusterMap = new Map<string, {
      roles: Array<typeof componentRoles[0]>,
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
      
      // Find the component details from componentTemplates
      const firstRole = roles[0];
      console.log('[useComputeClusters] Looking for component:', {
        assignedComponentId: firstRole.assignedComponentId,
        availableTemplates: componentTemplates?.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type
        }))
      });
      
      const component = componentTemplates?.find(
        (c) => c.id === firstRole.assignedComponentId
      );
      
      console.log('[useComputeClusters] Component found:', component);
      
      if (!component) {
        console.log('[useComputeClusters] Component not found for cluster:', clusterId);
        return;
      }

      // Calculate total nodes - use adjustedRequiredCount (after component selection) not requiredCount (initial estimate)
      console.log('[useComputeClusters] Calculating node count for cluster:', {
        clusterId,
        roles: roles.map(r => ({
          role: r.role,
          requiredCount: r.requiredCount,
          adjustedRequiredCount: r.adjustedRequiredCount
        }))
      });
      
      const nodeCount = roles.reduce((sum, role) => 
        sum + (role.adjustedRequiredCount || role.requiredCount || 0), 0
      );
      
      console.log('[useComputeClusters] Total node count:', nodeCount);

      // Get component specifications
      console.log('[useComputeClusters] Component structure:', {
        componentName: component.name,
        hasSpecifications: !!component.specifications,
        specifications: component.specifications,
        directCpu: component.cpu,
        directCpuCores: component.cpuCores,
        cpuSockets: component.cpuSockets,
        cpuCoresPerSocket: component.cpuCoresPerSocket,
        coreCount: component.coreCount,
        cores: component.cores,
        totalCores: component.totalCores
      });
      
      // Try different ways to get cores - check for socket-based calculation first
      let cores = 0;
      if (component.cpuSockets && component.cpuCoresPerSocket) {
        cores = component.cpuSockets * component.cpuCoresPerSocket;
      } else if (component.specifications?.cpu?.cores) {
        cores = component.specifications.cpu.cores;
      } else if (component.cpu?.cores) {
        cores = component.cpu.cores;
      } else if (component.cpuCores) {
        cores = component.cpuCores;
      } else if (component.coreCount) {
        cores = component.coreCount;
      } else if (component.cores) {
        cores = component.cores;
      } else if (component.totalCores) {
        cores = component.totalCores;
      }
      
      const memory = component.memoryCapacity || 
                    component.specifications?.memory?.capacity || 
                    component.memory?.capacity || 
                    component.memoryGB || 0;
      const gpuCount = component.specifications?.gpu?.quantity || 
                      component.gpu?.quantity || 0;

      // Get overcommit ratios from the specific compute cluster configuration
      // First find the corresponding compute cluster configuration
      const computeClusters = activeDesign.requirements?.computeRequirements?.computeClusters || 
                            activeDesign.requirements?.compute?.clusters || [];
      const clusterConfig = computeClusters.find((c) => c.id === clusterId || c.name === name);
      
      // Use the cluster-specific overcommit ratio, falling back to global or default
      const cpuOvercommitRatio = clusterConfig?.overcommitRatio || 
                                activeDesign.requirements?.computeRequirements?.overcommitRatio || 
                                activeDesign.requirements?.compute?.cpu?.oversubscriptionRatio || 4;
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

      // Get cluster-specific AZ count if available
      let availabilityZoneCount = totalAvailabilityZones;

      // Find the matching compute cluster in requirements to get its specific AZ configuration
      const computeClusterRequirements = requirements?.computeRequirements?.computeClusters || [];
      const matchingCluster = computeClusterRequirements.find(cc =>
        cc.id === clusterId || cc.name === name
      );

      if (matchingCluster?.availabilityZoneCount) {
        availabilityZoneCount = matchingCluster.availabilityZoneCount;
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
  }, [activeDesign, componentRoles, componentTemplates, requirements]);

  return { computeClustersMetrics };
};