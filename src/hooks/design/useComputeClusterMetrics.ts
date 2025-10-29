import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure/component-types';
import { ComputeClusterRequirement } from '@/types/infrastructure/requirements-types';
import { useCostAnalysis } from './useCostAnalysis';

export interface ComputeClusterMetrics {
  clusterId: string;
  clusterName: string;
  totalNodes: number;
  totalPhysicalCores: number; // Physical CPU cores (before overcommit)
  totalVCPUs: number; // Virtual CPUs (after overcommit)
  totalMemoryGB: number;
  usablePhysicalCores: number; // Usable physical cores (after redundancy, before overcommit)
  usableVCPUs: number; // Usable vCPUs (after redundancy and overcommit)
  usableMemoryGB: number;
  redundantVCPUs: number;
  redundantMemoryGB: number;
  redundantNodes: number;
  maxAverageVMs: number;
  monthlyCostPerVM: number;
  redundancyConfig: string;
  availabilityZoneCount: number;
  availabilityZoneIds?: string[];
  overcommitRatio: number;
  isHyperConverged: boolean;
  storageOverheadCores?: number; // CPU cores reserved for storage (hyper-converged only)
  storageOverheadMemoryGB?: number; // Memory reserved for storage (hyper-converged only)
  totalDisksInCluster?: number; // Total disks in cluster (hyper-converged only)
  cpuCoresPerDisk?: number; // Configured CPU cores per disk (hyper-converged only)
  memoryGBPerDisk?: number; // Configured memory GB per disk (hyper-converged only)
  nodeHardware: {
    cpuCores: number;
    memoryGB: number;
    cost: number;
    model: string;
  }[];
  // Cost breakdown details for transparency
  totalComputeNodes: number;
  clusterCostShare: number;
  operationalCostShare: number;
  totalOperationalCost: number;
  computeAmortizedCost: number;
  storageAmortizedCost: number;
  networkAmortizedCost: number;
  licensingCost: number;
  racksCost: number;
  facilityCost: number;
  energyCost: number;
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
        clusterId: 'clusterId' in c ? c.clusterId : undefined
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

      // Check if this is a hyper-converged cluster
      const isHyperConverged = clusterRoles.some(role => role.role === 'hyperConvergedNode');

      // Calculate totals for this cluster
      let totalPhysicalCores = 0;
      let totalMemoryGB = 0;
      let totalDisksInCluster = 0;
      const nodeHardware: ComputeClusterMetrics['nodeHardware'] = [];

      // Calculate resources from component roles
      clusterRoles.forEach(role => {
        const template = componentTemplates.find(t => t.id === role.assignedComponentId);
        if (template) {
          // Handle different CPU field names based on component type
          let physicalCores = 0;
          if (template.type === ComponentType.Server || template.type === 'Server') {
            // Servers use cpuCoresPerSocket and cpuSockets
            physicalCores = (template.cpuCoresPerSocket || template.coreCount || 0) * (template.cpuSockets || 1);
          } else {
            // Other components might use cpuCores
            physicalCores = (template.cpuCores || 0) * (template.cpuSockets || 1);
          }

          const memoryGB = template.memoryCapacity || template.memoryGB || 0;
          const nodeCount = role.adjustedRequiredCount || role.requiredCount || 0;

          totalPhysicalCores += physicalCores * nodeCount;
          totalMemoryGB += memoryGB * nodeCount;

          // Count disks in hyper-converged nodes
          if (isHyperConverged && role.role === 'hyperConvergedNode') {
            // Find actual components to count disks
            const clusterComponents = components.filter(c =>
              c.role === 'hyperConvergedNode' &&
              c.clusterInfo?.clusterId === cluster.id
            );

            clusterComponents.forEach(node => {
              if ('attachedDisks' in node && node.attachedDisks) {
                const disks = node.attachedDisks || [];
                disks.forEach((disk: any) => {
                  if (disk && 'capacityTB' in disk) {
                    const diskQuantity = disk.quantity || 1;
                    totalDisksInCluster += diskQuantity;
                  }
                });
              }
            });
          }

          // Add one entry per role type to nodeHardware
          nodeHardware.push({
            cpuCores: physicalCores,
            memoryGB,
            cost: template.cost || 0,
            model: template.model || ''
          });

          console.log(`[useComputeClusterMetrics] Role ${role.role}: ${nodeCount} x ${template.model} (${physicalCores} cores, ${memoryGB} GB RAM)`, {
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

      // Calculate storage overhead for hyper-converged clusters
      // Get per-disk resource allocation from storage cluster configuration
      let cpuCoresPerDisk = 4; // default
      let memoryGBPerDisk = 2; // default

      if (isHyperConverged) {
        // Find the storage cluster configuration for this compute cluster
        const storageCluster = requirements.storageRequirements?.storageClusters?.find(
          sc => sc.type === 'hyperConverged' && sc.computeClusterId === cluster.id
        );

        if (storageCluster) {
          cpuCoresPerDisk = storageCluster.cpuCoresPerDisk ?? 4;
          memoryGBPerDisk = storageCluster.memoryGBPerDisk ?? 2;
        }
      }

      const storageOverheadCores = isHyperConverged ? totalDisksInCluster * cpuCoresPerDisk : 0;
      const storageOverheadMemoryGB = isHyperConverged ? totalDisksInCluster * memoryGBPerDisk : 0;

      // Subtract storage overhead from total capacity BEFORE redundancy calculation
      const computeAvailablePhysicalCores = totalPhysicalCores - storageOverheadCores;
      const computeAvailableMemoryGB = totalMemoryGB - storageOverheadMemoryGB;

      console.log(`[useComputeClusterMetrics] Cluster ${cluster.name} - Storage overhead:`, {
        isHyperConverged,
        totalDisksInCluster,
        storageOverheadCores,
        storageOverheadMemoryGB,
        totalPhysicalCores,
        computeAvailablePhysicalCores
      });

      // Calculate usable capacity after redundancy (applied to compute-available resources)
      const { usableCapacity: usablePhysicalCores, redundantCapacity: redundantPhysicalCores, redundantNodes } =
        calculateUsableCapacity(
          computeAvailablePhysicalCores,
          cluster.availabilityZoneRedundancy,
          totalNodes,
          clusterAZCount
        );

      const { usableCapacity: usableMemoryGB, redundantCapacity: redundantMemoryGB } =
        calculateUsableCapacity(
          computeAvailableMemoryGB,
          cluster.availabilityZoneRedundancy,
          totalNodes,
          clusterAZCount
        );

      // Apply overcommit ratio to get vCPUs (physical cores * overcommit ratio)
      const overcommitRatio = cluster.overcommitRatio || 1;
      const usableVCPUs = usablePhysicalCores * overcommitRatio;
      const redundantVCPUs = redundantPhysicalCores * overcommitRatio;
      const totalVCPUs = computeAvailablePhysicalCores * overcommitRatio;

      console.log(`[useComputeClusterMetrics] Cluster ${cluster.name} capacity:`, {
        totalPhysicalCores,
        computeAvailablePhysicalCores,
        usablePhysicalCores,
        overcommitRatio,
        totalVCPUs,
        usableVCPUs,
        totalMemoryGB,
        computeAvailableMemoryGB,
        usableMemoryGB
      });

      // Calculate maximum number of VMs
      const vmsByCPU = Math.floor(usableVCPUs / averageVMVCPUs);
      const vmsByMemory = Math.floor(usableMemoryGB / averageVMMemoryGB);
      const maxAverageVMs = Math.min(vmsByCPU, vmsByMemory);

      // Calculate monthly cost per VM for this cluster
      //
      // METHODOLOGY (aligned with global calculation in useDesignCalculations.ts):
      // 1. Start with total operational costs (facility + energy + amortization)
      // 2. Subtract storage amortization (storage costs scale with capacity, not VMs)
      // 3. Calculate cluster's proportional share based on node count
      // 4. Divide by cluster's VM capacity
      //
      // Formula: (Total Operational Cost - Storage Amortization) × (Cluster Nodes / Total Nodes) / Cluster VMs
      let monthlyCostPerVM = 0;
      let clusterCostShare = 0;
      let operationalCostShare = 0;
      let computeAmortizedCost = 0;
      let storageAmortizedCost = 0;
      let totalOperationalCost = 0;
      let networkAmortizedCost = 0;
      let licensingCost = 0;
      let racksCost = 0;
      let facilityCost = 0;
      let energyCost = 0;

      if (maxAverageVMs > 0 && costAnalysisResult?.operationalCosts && costAnalysisResult?.amortizedCostsByType) {
        // Calculate total compute nodes across all clusters from roles
        const allComputeRoles = componentRoles?.filter(r =>
          r.role === 'computeNode' || r.role === 'hyperConvergedNode' || r.role === 'gpuNode'
        ) || [];

        const totalComputeNodes = allComputeRoles.reduce((sum, role) =>
          sum + (role.adjustedRequiredCount || role.requiredCount || 0), 0
        );

        // Calculate cluster's share of total compute nodes
        const clusterNodeRatio = totalNodes > 0 && totalComputeNodes > 0
          ? totalNodes / totalComputeNodes
          : 0;

        // Get cost components
        totalOperationalCost = costAnalysisResult.operationalCosts.totalMonthly;
        computeAmortizedCost = costAnalysisResult.amortizedCostsByType.compute || 0;
        storageAmortizedCost = costAnalysisResult.amortizedCostsByType.storage || 0;
        networkAmortizedCost = costAnalysisResult.amortizedCostsByType.network || 0;
        licensingCost = costAnalysisResult.operationalCosts.licensingMonthly || 0;
        racksCost = costAnalysisResult.operationalCosts.racksMonthly || 0;
        facilityCost = costAnalysisResult.operationalCosts.facilityMonthly || 0;
        energyCost = costAnalysisResult.operationalCosts.energyMonthly || 0;

        // Calculate compute-only operational cost (excluding storage amortization)
        // This matches the global calculation in useDesignCalculations.ts:222-233
        const computeOnlyOperationalCost = totalOperationalCost - storageAmortizedCost;

        // Allocate this cluster's proportional share
        clusterCostShare = computeAmortizedCost * clusterNodeRatio;
        operationalCostShare = (computeOnlyOperationalCost - computeAmortizedCost) * clusterNodeRatio;

        const totalClusterMonthlyCost = computeOnlyOperationalCost * clusterNodeRatio;

        monthlyCostPerVM = totalClusterMonthlyCost / maxAverageVMs;

        console.log(`[useComputeClusterMetrics] Cost calculation for ${cluster.name}:`, {
          totalNodes,
          totalComputeNodes,
          clusterNodeRatio: clusterNodeRatio.toFixed(3),
          totalOperationalCost,
          storageAmortizedCost,
          computeOnlyOperationalCost,
          totalClusterMonthlyCost,
          maxAverageVMs,
          monthlyCostPerVM
        });
      }

      const metrics = {
        clusterId: cluster.id,
        clusterName: cluster.name,
        totalNodes,
        totalPhysicalCores,
        totalVCPUs,
        totalMemoryGB,
        usablePhysicalCores,
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
        overcommitRatio,
        isHyperConverged,
        storageOverheadCores: isHyperConverged ? storageOverheadCores : undefined,
        storageOverheadMemoryGB: isHyperConverged ? storageOverheadMemoryGB : undefined,
        totalDisksInCluster: isHyperConverged ? totalDisksInCluster : undefined,
        cpuCoresPerDisk: isHyperConverged ? cpuCoresPerDisk : undefined,
        memoryGBPerDisk: isHyperConverged ? memoryGBPerDisk : undefined,
        nodeHardware,
        // Cost breakdown details
        totalComputeNodes: componentRoles?.filter(r =>
          r.role === 'computeNode' || r.role === 'hyperConvergedNode' || r.role === 'gpuNode'
        ).reduce((sum, role) => sum + (role.adjustedRequiredCount || role.requiredCount || 0), 0) || 0,
        clusterCostShare,
        operationalCostShare,
        totalOperationalCost,
        computeAmortizedCost,
        storageAmortizedCost,
        networkAmortizedCost,
        licensingCost,
        racksCost,
        facilityCost,
        energyCost
      };

      console.log(`[useComputeClusterMetrics] Metrics for cluster ${cluster.name}:`, metrics);

      clusterMetrics.push(metrics);
    });

    return clusterMetrics;
  }, [activeDesign, requirements, componentTemplates, componentRoles, costAnalysisResult]);

  return metrics;
};