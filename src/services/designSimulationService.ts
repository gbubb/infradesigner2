/**
 * Design Simulation Service
 *
 * Provides accurate simulation of design changes by running the full calculation pipeline
 * rather than extrapolating. This ensures results match what would happen if the user
 * manually adjusted requirements.
 *
 * Key principle: Each simulation must produce identical results to manually changing
 * requirements and triggering a full recalculation.
 */

import { DesignRequirements, ComputeClusterRequirement } from '@/types/infrastructure';
import { calculateComponentRoles } from '@/store/slices/requirements/roleCalculator';
import { ComponentRole } from '@/types/infrastructure';

export interface SimulationResult {
  // Configuration
  nodeCount: number;
  clusterId: string;
  clusterName: string;

  // Capacity metrics
  totalVCPUs: number;
  usableVCPUs: number;
  totalMemoryGB: number;
  usableMemoryGB: number;
  maxVMs: number;

  // Infrastructure that scales
  totalRacks: number;
  totalLeafSwitches: number;
  totalMgmtSwitches: number;
  totalStorageSwitches: number;
  totalPowerW: number;

  // Cost breakdown
  capitalCost: number;
  monthlyOperationalCost: number;
  monthlyFacilityCost: number;
  monthlyEnergyCost: number;
  monthlyAmortizedCost: number;
  costPerVM: number;

  // Debug info
  redundantNodes: number;
  calculationSteps: string[];
}

export interface RoleAssignmentMap {
  [roleType: string]: string; // role type -> assigned component ID
}

/**
 * Calculate what totalVCPUs requirement produces the target node count
 *
 * This "reverse engineers" the requirement by working backwards from the desired
 * node count to the vCPU requirement that would produce it.
 *
 * The role calculator does: vCPUs → nodes, we need to do: nodes → vCPUs
 *
 * @param targetNodes - Desired number of nodes (including redundancy)
 * @param redundancy - Redundancy configuration (e.g., 'N+1', 'N+2', '1 Node', '2 Nodes')
 * @param overcommit - Overcommit ratio (e.g., 2 for 2:1)
 * @param totalAZs - Number of availability zones
 * @returns Required totalVCPUs to achieve target node count
 */
export const reverseEngineerVCPURequirement = (
  targetNodes: number,
  redundancy: string,
  overcommit: number,
  totalAZs: number
): number => {
  // Calculate how many nodes are redundancy overhead
  let redundantNodes = 0;

  if (redundancy === 'N+1') {
    // N+1 means one AZ worth of nodes is redundancy
    redundantNodes = Math.ceil(targetNodes / totalAZs);
  } else if (redundancy === 'N+2') {
    // N+2 means two AZs worth of nodes is redundancy
    redundantNodes = Math.ceil((targetNodes / totalAZs) * 2);
  } else if (redundancy === '1 Node') {
    redundantNodes = 1;
  } else if (redundancy === '2 Nodes') {
    redundantNodes = 2;
  }
  // 'None' or unknown -> redundantNodes = 0

  // Work backwards: target nodes - redundancy = base nodes
  // This is what the user specifies in requirements (before redundancy is added)
  const baseNodeCount = targetNodes - redundantNodes;

  // The role calculator distributes nodes across AZs
  const nodesPerAZ = Math.ceil(baseNodeCount / totalAZs);

  // Physical cores needed = nodes per AZ * number of AZs
  const totalPhysicalCoresNeeded = nodesPerAZ * totalAZs;

  // Convert physical cores to vCPUs (what the requirement specifies)
  const requiredVCPUs = totalPhysicalCoresNeeded * overcommit;

  return requiredVCPUs;
};

/**
 * Clone requirements and modify the target cluster's vCPU requirement
 * to achieve the desired node count
 *
 * @param baseRequirements - Current design requirements
 * @param clusterId - ID of the compute cluster to modify
 * @param targetNodeCount - Desired number of nodes
 * @returns Cloned and modified requirements object
 */
export const cloneAndModifyRequirements = (
  baseRequirements: DesignRequirements,
  clusterId: string,
  targetNodeCount: number
): DesignRequirements => {
  // Deep clone to avoid mutations
  const clonedRequirements: DesignRequirements = JSON.parse(JSON.stringify(baseRequirements));

  // Find the target cluster
  const computeClusters = clonedRequirements.computeRequirements?.computeClusters || [];
  const targetCluster = computeClusters.find(c => c.id === clusterId);

  if (!targetCluster) {
    throw new Error(`Cluster ${clusterId} not found in requirements`);
  }

  // Get configuration for reverse engineering
  const totalAZs = clonedRequirements.physicalConstraints?.totalAvailabilityZones || 3;
  const overcommitRatio = targetCluster.overcommitRatio || 2;
  const redundancy = targetCluster.availabilityZoneRedundancy || 'None';

  // Calculate what vCPU requirement produces this node count
  const requiredVCPUs = reverseEngineerVCPURequirement(
    targetNodeCount,
    redundancy,
    overcommitRatio,
    totalAZs
  );

  // Update the cluster's vCPU requirement
  targetCluster.totalVCPUs = requiredVCPUs;

  // Also ensure memory scales proportionally (maintain CPU:memory ratio)
  // Get current ratio
  const currentVCPUs = baseRequirements.computeRequirements?.computeClusters
    ?.find(c => c.id === clusterId)?.totalVCPUs || 5000;
  const currentMemoryTB = baseRequirements.computeRequirements?.computeClusters
    ?.find(c => c.id === clusterId)?.totalMemoryTB || 30;

  const cpuMemoryRatio = currentMemoryTB / currentVCPUs;
  targetCluster.totalMemoryTB = requiredVCPUs * cpuMemoryRatio;

  return clonedRequirements;
};

/**
 * Simulate a complete design configuration with modified requirements
 *
 * This runs the full calculation pipeline that would occur if the user
 * manually changed requirements:
 * 1. Calculate component roles
 * 2. Apply component assignments
 * 3. Calculate quantities
 * 4. Count infrastructure
 * 5. Calculate costs
 * 6. Extract metrics
 *
 * @param requirements - Modified requirements to simulate
 * @param componentTemplates - Available component templates
 * @param existingAssignments - Current component assignments to preserve
 * @param averageVMVCPUs - Average VM vCPU size
 * @param averageVMMemoryGB - Average VM memory size
 * @returns Simulation result with all metrics
 */
export const simulateDesignConfiguration = (
  requirements: DesignRequirements,
  componentTemplates: any[],
  existingAssignments: RoleAssignmentMap,
  averageVMVCPUs: number,
  averageVMMemoryGB: number
): SimulationResult => {
  // TODO: This is a placeholder that will be fully implemented in subsequent commits
  // The full implementation requires:
  // - Component role calculation
  // - Quantity calculation for each role
  // - Infrastructure counting (racks, switches, power)
  // - Cost calculation
  // - VM capacity calculation

  throw new Error('simulateDesignConfiguration not yet implemented - see scalingplan.md');
};