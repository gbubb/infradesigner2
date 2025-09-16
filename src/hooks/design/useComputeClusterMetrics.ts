import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { InfrastructureComponent } from '@/types/infrastructure/component-types';
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
  const costAnalysisResult = useCostAnalysis();

  const metrics = useMemo(() => {
    if (!activeDesign?.components || !requirements?.computeRequirements?.computeClusters || !componentTemplates) {
      return [];
    }

    const computeClusters = requirements.computeRequirements.computeClusters;
    const components = activeDesign.components as InfrastructureComponent[];
    const totalAvailabilityZones = requirements.physicalConstraints?.totalAvailabilityZones || 3;

    // Get average VM specs from requirements or use defaults
    const averageVMVCPUs = requirements.computeRequirements?.averageVMVCPUs || 6;
    const averageVMMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 18;

    const clusterMetrics: ComputeClusterMetrics[] = [];

    computeClusters.forEach((cluster: ComputeClusterRequirement) => {
      // Find all nodes belonging to this cluster
      const clusterNodes = components.filter(
        c => c.role === 'computeNode' &&
        c.clusterInfo?.clusterId === cluster.id
      );

      // Handle hyper-converged nodes
      const hyperConvergedNodes = components.filter(
        c => c.role === 'hyperConvergedNode' &&
        c.clusterInfo?.clusterId === cluster.id
      );

      const allNodes = [...clusterNodes, ...hyperConvergedNodes];
      const totalNodes = allNodes.length;

      // Calculate totals for this cluster
      let totalVCPUs = 0;
      let totalMemoryGB = 0;
      const nodeHardware: ComputeClusterMetrics['nodeHardware'] = [];

      allNodes.forEach(node => {
        const template = componentTemplates.find(t => t.id === node.componentId);
        if (template) {
          const vcpus = (template.cpuCores || 0) * (template.cpuSockets || 1);
          const memoryGB = (template.memoryCapacity || 0);

          totalVCPUs += vcpus;
          totalMemoryGB += memoryGB;

          nodeHardware.push({
            cpuCores: vcpus,
            memoryGB,
            cost: template.cost || 0,
            model: template.model || ''
          });
        }
      });

      // Use cluster-specific AZ count or default to total AZs
      const clusterAZCount = cluster.availabilityZoneCount || totalAvailabilityZones;

      // Calculate usable capacity
      const { usableCapacity: usableVCPUs, redundantCapacity: redundantVCPUs, redundantNodes } =
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

        // Calculate this cluster's share based on node count (simple approach)
        // Could be enhanced to consider actual hardware costs
        const totalComputeNodes = components.filter(
          c => c.role === 'computeNode' || c.role === 'hyperConvergedNode'
        ).length;

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

      clusterMetrics.push({
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
      });
    });

    return clusterMetrics;
  }, [activeDesign, requirements, componentTemplates, costAnalysisResult]);

  return metrics;
};