import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useCostAnalysis } from './useCostAnalysis';
import { ComputeClusterMetrics } from './useComputeClusterMetrics';

export interface VMCostScalingDataPoint {
  nodeCount: number;
  totalVCPUs: number;
  usableVCPUs: number;
  maxVMs: number;
  totalMonthlyCost: number;
  costPerVM: number;
  // Additional context
  redundantNodes: number;
  usablePhysicalCores: number;
}

export interface VMCostScalingConfig {
  clusterId: string;
  minNodes: number;
  maxNodes: number;
  increment: number;
}

/**
 * Calculate usable capacity after accounting for redundancy
 * (Duplicated from useComputeClusterMetrics for performance - avoids hook dependencies)
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
  }

  return { usableCapacity, redundantCapacity, redundantNodes };
};

/**
 * Hook to calculate VM cost scaling analysis across a range of node counts
 */
export const useVMCostScaling = (config: VMCostScalingConfig, clusterMetrics: ComputeClusterMetrics) => {
  const store = useDesignStore();
  const requirements = store.requirements;
  const componentRoles = store.componentRoles;
  const costAnalysisResult = useCostAnalysis();

  const scalingData = useMemo(() => {
    if (!clusterMetrics || !costAnalysisResult?.operationalCosts || !requirements) {
      return [];
    }

    const { minNodes, maxNodes, increment } = config;
    const dataPoints: VMCostScalingDataPoint[] = [];

    // Get average VM specs
    const averageVMVCPUs = requirements.computeRequirements?.averageVMVCPUs || 6;
    const averageVMMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 18;

    // Get compute cluster configuration
    const computeClusters = requirements.computeRequirements?.computeClusters || [];
    const cluster = computeClusters.find(c => c.id === clusterMetrics.clusterId);
    if (!cluster) return [];

    const clusterAZCount = cluster.availabilityZoneCount ||
      requirements.physicalConstraints?.totalAvailabilityZones || 3;
    const overcommitRatio = cluster.overcommitRatio || 1;
    const redundancyConfig = cluster.availabilityZoneRedundancy || 'None';

    // Per-node resources (from current cluster metrics)
    const resourcesPerNode = clusterMetrics.totalNodes > 0 ? {
      physicalCores: clusterMetrics.totalPhysicalCores / clusterMetrics.totalNodes,
      memoryGB: clusterMetrics.totalMemoryGB / clusterMetrics.totalNodes
    } : { physicalCores: 0, memoryGB: 0 };

    // Storage overhead per node (for hyper-converged clusters)
    const storageOverheadPerNode = clusterMetrics.isHyperConverged && clusterMetrics.totalNodes > 0 ? {
      cores: (clusterMetrics.storageOverheadCores || 0) / clusterMetrics.totalNodes,
      memoryGB: (clusterMetrics.storageOverheadMemoryGB || 0) / clusterMetrics.totalNodes
    } : { cores: 0, memoryGB: 0 };

    // Calculate total compute nodes across ALL clusters for cost allocation
    const allComputeRoles = componentRoles?.filter(r =>
      r.role === 'computeNode' || r.role === 'hyperConvergedNode' || r.role === 'gpuNode'
    ) || [];
    const totalComputeNodes = allComputeRoles.reduce((sum, role) =>
      sum + (role.adjustedRequiredCount || role.requiredCount || 0), 0
    );

    // Get cost components (same methodology as useComputeClusterMetrics)
    const totalOperationalCost = costAnalysisResult.operationalCosts.totalMonthly;
    const storageAmortizedCost = costAnalysisResult.amortizedCostsByType?.storage || 0;
    const computeOnlyOperationalCost = totalOperationalCost - storageAmortizedCost;

    // Generate data points
    for (let nodeCount = minNodes; nodeCount <= maxNodes; nodeCount += increment) {
      // Calculate total physical resources for this node count
      const totalPhysicalCores = resourcesPerNode.physicalCores * nodeCount;
      const totalMemoryGB = resourcesPerNode.memoryGB * nodeCount;

      // Subtract storage overhead
      const storageOverheadCores = storageOverheadPerNode.cores * nodeCount;
      const storageOverheadMemoryGB = storageOverheadPerNode.memoryGB * nodeCount;
      const computeAvailablePhysicalCores = totalPhysicalCores - storageOverheadCores;
      const computeAvailableMemoryGB = totalMemoryGB - storageOverheadMemoryGB;

      // Apply redundancy
      const { usableCapacity: usablePhysicalCores, redundantNodes } = calculateUsableCapacity(
        computeAvailablePhysicalCores,
        redundancyConfig,
        nodeCount,
        clusterAZCount
      );

      const { usableCapacity: usableMemoryGB } = calculateUsableCapacity(
        computeAvailableMemoryGB,
        redundancyConfig,
        nodeCount,
        clusterAZCount
      );

      // Apply overcommit to get vCPUs
      const totalVCPUs = computeAvailablePhysicalCores * overcommitRatio;
      const usableVCPUs = usablePhysicalCores * overcommitRatio;

      // Calculate max VMs
      const vmsByCPU = Math.floor(usableVCPUs / averageVMVCPUs);
      const vmsByMemory = Math.floor(usableMemoryGB / averageVMMemoryGB);
      const maxVMs = Math.min(vmsByCPU, vmsByMemory);

      // Calculate cost allocation for this scaled cluster
      // This cluster's share of total compute infrastructure
      const scaledTotalComputeNodes = totalComputeNodes - clusterMetrics.totalNodes + nodeCount;
      const clusterNodeRatio = nodeCount / scaledTotalComputeNodes;

      // Allocate costs proportionally
      const totalClusterMonthlyCost = computeOnlyOperationalCost * clusterNodeRatio;

      // Cost per VM
      const costPerVM = maxVMs > 0 ? totalClusterMonthlyCost / maxVMs : 0;

      dataPoints.push({
        nodeCount,
        totalVCPUs,
        usableVCPUs,
        maxVMs,
        totalMonthlyCost: totalClusterMonthlyCost,
        costPerVM,
        redundantNodes,
        usablePhysicalCores
      });
    }

    return dataPoints;
  }, [config, clusterMetrics, requirements, componentRoles, costAnalysisResult]);

  return scalingData;
};

/**
 * Calculate recommended scaling range based on cluster configuration
 */
export const getRecommendedScalingRange = (
  clusterMetrics: ComputeClusterMetrics
): { minNodes: number; maxNodes: number; increment: number } => {
  const currentNodes = clusterMetrics.totalNodes;
  const redundantNodes = clusterMetrics.redundantNodes;

  // Minimum: Must maintain redundancy requirements (can't go below redundant nodes + 1)
  const minNodes = Math.max(redundantNodes + 1, Math.ceil(currentNodes * 0.5));

  // Maximum: 200% of current, but reasonable upper bound
  const maxNodes = Math.min(Math.ceil(currentNodes * 3), currentNodes + 100);

  // Increment: Scale with cluster size
  const increment = currentNodes <= 10 ? 1 : currentNodes <= 50 ? 2 : 5;

  return { minNodes, maxNodes, increment };
};