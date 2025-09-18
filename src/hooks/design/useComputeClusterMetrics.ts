import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure/component-types';
import { ComputeClusterRequirement } from '@/types/infrastructure/requirements-types';
import { useCostAnalysis } from './useCostAnalysis';

export interface ComputeClusterMetrics {
  clusterId: string;
  clusterName: string;
  totalNodes: number;
  totalVCPUs: number;
  totalMemoryGB: number;
  usableVCPUs: number;
  usableMemoryGB: number;
  redundantVCPUs: number;
  redundantMemoryGB: number;
  redundantNodes: number;
  maxAverageVMs: number;
  monthlyCostPerVM: number;
  redundancyConfig: string;
  availabilityZoneCount: number;
  availabilityZoneIds?: string[];
  nodeHardware: {
    cpuCores: number;
    memoryGB: number;
    cost: number;
    model: string;
  }[];
}

/**
 * Calculate usable capacity after accounting for redundancy
 */
const calculateUsableCapacity = (
  totalCapacity: number,
  redundancy: string | undefined,
  totalNodes: number,
  totalAZs: number
): { usableCapacity: number; redundantCapacity: number; redundantNodes: number } => {
  if (!redundancy || redundancy === 'None') {
    return { usableCapacity: totalCapacity, redundantCapacity: 0, redundantNodes: 0 };
  }

  let redundantNodes = 0;
  let usableCapacity = totalCapacity;
  let redundantCapacity = 0;

  if (totalNodes > 0) {
    if (redundancy === 'N+1') {
      redundantNodes = Math.ceil(totalNodes / totalAZs);
    } else if (redundancy === 'N+2') {
      redundantNodes = Math.ceil((totalNodes / totalAZs) * 2);
    } else if (redundancy === '1 Node') {
      redundantNodes = 1;
    } else if (redundancy === '2 Nodes') {
      redundantNodes = 2;
    }

    const usableNodes = Math.max(0, totalNodes - redundantNodes);
    usableCapacity = totalNodes > 0 ? (totalCapacity / totalNodes) * usableNodes : totalCapacity;
    redundantCapacity = totalCapacity - usableCapacity;
  } else {
    // Fallback for unknown node count
    if (redundancy === 'N+1' && totalAZs > 0) {
      const redundancyRatio = 1 / totalAZs;
      redundantCapacity = totalCapacity * redundancyRatio;
      usableCapacity = totalCapacity - redundantCapacity;
    } else if (redundancy === 'N+2' && totalAZs > 0) {
      const redundancyRatio = Math.min(2 / totalAZs, 1);
      redundantCapacity = totalCapacity * redundancyRatio;
      usableCapacity = totalCapacity - redundantCapacity;
    }
  }

  return { usableCapacity, redundantCapacity, redundantNodes };
};

/**
 * Calculate metrics for each compute cluster including per-VM costs
 */
export const useComputeClusterMetrics = () => {
  const store = useDesignStore();
  const activeDesign = store.activeDesign;
  const requirements = store.requirements;
  const componentTemplates = store.componentTemplates;
  const componentRoles = store.componentRoles;
  const costAnalysisResult = useCostAnalysis();

  const metrics = useMemo(() => {
    if (!activeDesign?.components || !requirements?.computeRequirements?.computeClusters || !componentTemplates) {
      console.log('[useComputeClusterMetrics] Missing required data:', {
        hasComponents: !!activeDesign?.components,
        hasComputeClusters: !!requirements?.computeRequirements?.computeClusters,
        hasComponentTemplates: !!componentTemplates
      });
      return [];
    }

    const computeClusters = requirements.computeRequirements.computeClusters;
    const components = activeDesign.components as InfrastructureComponent[];
    const totalAvailabilityZones = requirements.physicalConstraints?.totalAvailabilityZones || 3;

    console.log('[useComputeClusterMetrics] Starting calculation:', {
      computeClustersCount: computeClusters.length,
      componentsCount: components.length,
      totalAvailabilityZones,
      computeClusters: computeClusters.map(c => ({ id: c.id, name: c.name, azCount: c.availabilityZoneCount })),
      components: components.filter(c => c.role === 'computeNode' || c.role === 'hyperConvergedNode').map(c => ({
        name: c.name,
        role: c.role,
        clusterInfo: c.clusterInfo,
        clusterId: (c as any).clusterId
      }))
    });

    // Get average VM specs from requirements or use defaults
    const averageVMVCPUs = requirements.computeRequirements?.averageVMVCPUs || 6;
    const averageVMMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 18;

    const clusterMetrics: ComputeClusterMetrics[] = [];

    computeClusters.forEach((cluster: ComputeClusterRequirement) => {
      console.log(`[useComputeClusterMetrics] Processing cluster: ${cluster.name} (${cluster.id})`);

      // Find component roles for this cluster
      const clusterRoles = componentRoles?.filter(role => {
        const isComputeRole = role.role === 'computeNode' || role.role === 'hyperConvergedNode' || role.role === 'gpuNode';
        const belongsToCluster = role.clusterInfo?.clusterId === cluster.id;
        return isComputeRole && belongsToCluster;
      }) || [];

      console.log(`[useComputeClusterMetrics] Found ${clusterRoles.length} roles for cluster ${cluster.id}:`,
        clusterRoles.map(r => ({
          role: r.role,
          count: r.adjustedRequiredCount || r.requiredCount,
          componentId: r.assignedComponentId
        }))
      );

      // Calculate total nodes from roles
      const totalNodes = clusterRoles.reduce((sum, role) =>
        sum + (role.adjustedRequiredCount || role.requiredCount || 0), 0
      );

      console.log(`[useComputeClusterMetrics] Total nodes for cluster ${cluster.id}: ${totalNodes}`);

      // Calculate totals for this cluster
      let totalVCPUs = 0;
      let totalMemoryGB = 0;
      const nodeHardware: ComputeClusterMetrics['nodeHardware'] = [];

      // Calculate resources from component roles
      clusterRoles.forEach(role => {
        const template = componentTemplates.find(t => t.id === role.assignedComponentId);
        if (template) {
          // Handle different CPU field names based on component type
          let vcpus = 0;
          if (template.type === ComponentType.Server || template.type === 'Server') {
            // Servers use cpuCoresPerSocket and cpuSockets
            vcpus = (template.cpuCoresPerSocket || template.coreCount || 0) * (template.cpuSockets || 1);
          } else {
            // Other components might use cpuCores
            vcpus = (template.cpuCores || 0) * (template.cpuSockets || 1);
          }

          const memoryGB = template.memoryCapacity || template.memoryGB || 0;
          const nodeCount = role.adjustedRequiredCount || role.requiredCount || 0;

          totalVCPUs += vcpus * nodeCount;
          totalMemoryGB += memoryGB * nodeCount;

          // Add one entry per role type to nodeHardware
          nodeHardware.push({
            cpuCores: vcpus,
            memoryGB,
            cost: template.cost || 0,
            model: template.model || ''
          });

          console.log(`[useComputeClusterMetrics] Role ${role.role}: ${nodeCount} x ${template.model} (${vcpus} vCPUs, ${memoryGB} GB RAM)`, {
            template: {
              type: template.type,
              cpuCoresPerSocket: template.cpuCoresPerSocket,
              cpuSockets: template.cpuSockets,
              coreCount: template.coreCount,
              memoryCapacity: template.memoryCapacity
            }
          });
        }
      });

      // Use cluster-specific AZ count or default to total AZs
      const clusterAZCount = cluster.availabilityZoneCount || totalAvailabilityZones;

      // Calculate usable capacity after redundancy
      const { usableCapacity: usablePhysicalCores, redundantCapacity: redundantPhysicalCores, redundantNodes } =
        calculateUsableCapacity(
          totalVCPUs,
          cluster.availabilityZoneRedundancy,
          totalNodes,
          clusterAZCount
        );

      const { usableCapacity: usableMemoryGB, redundantCapacity: redundantMemoryGB } =
        calculateUsableCapacity(
          totalMemoryGB,
          cluster.availabilityZoneRedundancy,
          totalNodes,
          clusterAZCount
        );

      // Apply overcommit ratio to get vCPUs (physical cores * overcommit ratio)
      const overcommitRatio = cluster.overcommitRatio || 1;
      const usableVCPUs = usablePhysicalCores * overcommitRatio;
      const redundantVCPUs = redundantPhysicalCores * overcommitRatio;

      console.log(`[useComputeClusterMetrics] Cluster ${cluster.name} capacity:`, {
        totalPhysicalCores: totalVCPUs,
        usablePhysicalCores,
        overcommitRatio,
        usableVCPUs,
        totalMemoryGB,
        usableMemoryGB
      });

      // Calculate maximum number of VMs
      const vmsByCPU = Math.floor(usableVCPUs / averageVMVCPUs);
      const vmsByMemory = Math.floor(usableMemoryGB / averageVMMemoryGB);
      const maxAverageVMs = Math.min(vmsByCPU, vmsByMemory);

      // Calculate monthly cost per VM for this cluster
      let monthlyCostPerVM = 0;
      if (maxAverageVMs > 0 && costAnalysisResult?.operationalCosts && costAnalysisResult?.amortizedCostsByType) {
        // Calculate the portion of operational costs attributable to this cluster
        // This is based on the cluster's share of total compute resources
        const totalComputeCost = costAnalysisResult.amortizedCostsByType.compute || 0;

        // Calculate total compute nodes across all clusters from roles
        const allComputeRoles = componentRoles?.filter(r =>
          r.role === 'computeNode' || r.role === 'hyperConvergedNode' || r.role === 'gpuNode'
        ) || [];

        const totalComputeNodes = allComputeRoles.reduce((sum, role) =>
          sum + (role.adjustedRequiredCount || role.requiredCount || 0), 0
        );

        const clusterCostShare = totalNodes > 0 && totalComputeNodes > 0
          ? totalComputeCost * (totalNodes / totalComputeNodes)
          : 0;

        // Add proportional share of facility and other operational costs
        const operationalCostShare = totalNodes > 0 && totalComputeNodes > 0
          ? (costAnalysisResult.operationalCosts.totalMonthly - (costAnalysisResult.amortizedCostsByType?.storage || 0))
            * (totalNodes / totalComputeNodes)
          : 0;

        monthlyCostPerVM = (clusterCostShare + operationalCostShare) / maxAverageVMs;
      }

      const metrics = {
        clusterId: cluster.id,
        clusterName: cluster.name,
        totalNodes,
        totalVCPUs,
        totalMemoryGB,
        usableVCPUs,
        usableMemoryGB,
        redundantVCPUs,
        redundantMemoryGB,
        redundantNodes,
        maxAverageVMs,
        monthlyCostPerVM,
        redundancyConfig: cluster.availabilityZoneRedundancy || 'None',
        availabilityZoneCount: clusterAZCount,
        availabilityZoneIds: cluster.availabilityZoneIds,
        nodeHardware
      };

      console.log(`[useComputeClusterMetrics] Metrics for cluster ${cluster.name}:`, metrics);

      clusterMetrics.push(metrics);
    });

    return clusterMetrics;
  }, [activeDesign, requirements, componentTemplates, componentRoles, costAnalysisResult]);

  return metrics;
};