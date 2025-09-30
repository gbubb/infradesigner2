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

import { DesignRequirements, ComputeClusterRequirement, InfrastructureComponent } from '@/types/infrastructure';
import { calculateComponentRoles } from '@/store/slices/requirements/roleCalculator';
import { ComponentRole } from '@/types/infrastructure';
import { calculateRequiredQuantity } from '@/store/slices/requirements/calculationManager';
import {
  calculateCompleteCostAnalysis,
  calculatePowerConsumption,
  estimateRackQuantity,
  countInfrastructure
} from '@/lib/costCalculationHelpers';
import { v4 as uuidv4 } from 'uuid';
import { StoreState } from '@/store/types';

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
 * @param coresPerNode - Physical CPU cores per compute node
 * @returns Required totalVCPUs to achieve target node count
 */
export const reverseEngineerVCPURequirement = (
  targetNodes: number,
  redundancy: string,
  overcommit: number,
  totalAZs: number,
  coresPerNode: number
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

  // Calculate total physical cores needed
  // Role calculator: totalPhysicalCoresNeeded = Math.ceil(totalVCPUs / overcommit)
  // Then: nodesPerAZ = Math.ceil(totalPhysicalCoresNeeded / totalAZs)
  // So: totalPhysicalCoresNeeded = nodesPerAZ * totalAZs * coresPerNode
  const totalPhysicalCoresNeeded = nodesPerAZ * totalAZs * coresPerNode;

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
 * @param coresPerNode - Physical CPU cores per compute node
 * @returns Cloned and modified requirements object
 */
export const cloneAndModifyRequirements = (
  baseRequirements: DesignRequirements,
  clusterId: string,
  targetNodeCount: number,
  coresPerNode: number
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
    totalAZs,
    coresPerNode
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
  componentTemplates: InfrastructureComponent[],
  existingAssignments: RoleAssignmentMap,
  averageVMVCPUs: number,
  averageVMMemoryGB: number
): SimulationResult => {
  const calculationSteps: string[] = [];

  try {
    calculationSteps.push('Step 1: Calculate component roles from requirements');

    // Step 1: Calculate component roles
    const roles = calculateComponentRoles(requirements);
    calculationSteps.push(`Generated ${roles.length} component roles`);

    // Step 2: Apply existing component assignments to roles
    calculationSteps.push('Step 2: Apply component assignments to roles');
    const rolesWithAssignments = roles.map(role => {
      const assignedComponentId = existingAssignments[role.role] || existingAssignments[`${role.role}-${role.clusterInfo?.clusterId}`];
      if (assignedComponentId) {
        calculationSteps.push(`Assigned ${assignedComponentId} to role ${role.role}`);
        return { ...role, assignedComponentId };
      }
      return role;
    });

    // Step 3: Calculate quantities for each role
    calculationSteps.push('Step 3: Calculate required quantities for each role');

    // Build a mock state object for quantity calculations
    const mockState = {
      requirements,
      componentRoles: rolesWithAssignments,
      componentTemplates,
      selectedDisksByRole: {}, // Simplified: no disk configurations in simulation
      selectedGPUsByRole: {}, // Simplified: no GPU configurations in simulation
      selectedDisksByStorageCluster: {}
    } as unknown as StoreState;

    const rolesWithQuantities = rolesWithAssignments.map(role => {
      if (!role.assignedComponentId) {
        return { ...role, adjustedRequiredCount: 0 };
      }

      const result = calculateRequiredQuantity(role.id, role.assignedComponentId, mockState);
      calculationSteps.push(`Role ${role.role}: ${result.requiredQuantity} units`);

      return {
        ...role,
        adjustedRequiredCount: result.requiredQuantity
      };
    });

    // Step 4: Generate component instances (simplified - no disk/GPU attachments)
    calculationSteps.push('Step 4: Generate component instances');

    const components: InfrastructureComponent[] = [];
    const templateInstanceCounts: { [key: string]: number } = {};

    rolesWithQuantities.forEach(role => {
      if (!role.assignedComponentId || !role.adjustedRequiredCount || role.adjustedRequiredCount === 0) {
        return;
      }

      const componentTemplate = componentTemplates.find(c => c.id === role.assignedComponentId);
      if (!componentTemplate) {
        calculationSteps.push(`WARNING: Template ${role.assignedComponentId} not found for role ${role.role}`);
        return;
      }

      // Create component instances
      for (let i = 0; i < role.adjustedRequiredCount; i++) {
        const templateIdForCount = componentTemplate.id;
        templateInstanceCounts[templateIdForCount] = (templateInstanceCounts[templateIdForCount] || 0) + 1;
        const instanceName = `${componentTemplate.namingPrefix || componentTemplate.name}-${templateInstanceCounts[templateIdForCount]}`;

        const instanceComponent: InfrastructureComponent = {
          ...componentTemplate,
          id: uuidv4(),
          name: instanceName,
          templateId: componentTemplate.id,
          quantity: 1,
          role: role.role,
          ruSize: componentTemplate.ruSize,
          clusterInfo: role.clusterInfo
        };

        components.push(instanceComponent);
      }
    });

    calculationSteps.push(`Generated ${components.length} component instances`);

    // Step 5: Count infrastructure
    calculationSteps.push('Step 5: Count infrastructure components');
    const infrastructure = countInfrastructure(components);

    // Step 6: Estimate rack quantity
    calculationSteps.push('Step 6: Estimate rack requirements');
    const rackEstimate = estimateRackQuantity(components, requirements);
    calculationSteps.push(`Estimated ${rackEstimate.totalRacks} total racks (${rackEstimate.computeRacks} compute, ${rackEstimate.networkRacks} network)`);

    // Step 7: Calculate power consumption
    calculationSteps.push('Step 7: Calculate power consumption');
    const operationalLoadPercentage = requirements.physicalConstraints?.operationalLoadPercentage ?? 50;
    const powerConsumption = calculatePowerConsumption(components, operationalLoadPercentage);
    calculationSteps.push(`Total power: ${powerConsumption.operationalPower}W`);

    // Step 8: Calculate costs
    calculationSteps.push('Step 8: Calculate costs');
    const costAnalysis = calculateCompleteCostAnalysis(
      components,
      requirements,
      rackEstimate.totalRacks,
      null // No facility costs in simulation
    );
    calculationSteps.push(`Capital cost: $${costAnalysis.capitalCost.toFixed(2)}`);
    calculationSteps.push(`Monthly operational cost: $${costAnalysis.monthlyOperationalCost.toFixed(2)}`);

    // Step 9: Calculate VM capacity and cost per VM
    calculationSteps.push('Step 9: Calculate VM capacity metrics');

    // Find the target cluster to extract its details
    const computeClusters = requirements.computeRequirements?.computeClusters || [];
    const targetCluster = computeClusters.find(c => components.some(comp =>
      comp.clusterInfo?.clusterId === c.id &&
      (comp.role === 'computeNode' || comp.role === 'gpuNode' || comp.role === 'hyperConvergedNode')
    ));

    if (!targetCluster) {
      throw new Error('No target compute cluster found in simulation');
    }

    // Calculate total vCPUs and memory from actual components
    let totalVCPUs = 0;
    let totalMemoryGB = 0;
    let nodeCount = 0;
    let redundantNodes = 0;

    const computeNodes = components.filter(c =>
      c.clusterInfo?.clusterId === targetCluster.id &&
      (c.role === 'computeNode' || c.role === 'gpuNode' || c.role === 'hyperConvergedNode')
    );

    computeNodes.forEach(node => {
      nodeCount++;

      // Extract CPU cores
      let coresPerNode = 0;
      if ('cpuSockets' in node && 'cpuCoresPerSocket' in node) {
        coresPerNode = (node.cpuSockets || 0) * (node.cpuCoresPerSocket || 0);
      } else if ('coreCount' in node) {
        coresPerNode = node.coreCount || 0;
      } else if ('cores' in node) {
        coresPerNode = node.cores || 0;
      }

      const overcommitRatio = targetCluster.overcommitRatio || 2;
      const nodeVCPUs = coresPerNode * overcommitRatio;
      totalVCPUs += nodeVCPUs;

      // Extract memory
      let nodeMemoryGB = 0;
      if ('memoryCapacity' in node) {
        nodeMemoryGB = node.memoryCapacity || 0;
      } else if ('memoryGB' in node) {
        nodeMemoryGB = node.memoryGB || 0;
      } else if ('memoryTB' in node && node.memoryTB) {
        nodeMemoryGB = node.memoryTB * 1024;
      }
      totalMemoryGB += nodeMemoryGB;
    });

    // Calculate redundancy overhead
    const redundancy = targetCluster.availabilityZoneRedundancy || 'None';
    const totalAZs = requirements.physicalConstraints?.totalAvailabilityZones || 3;

    if (redundancy === 'N+1') {
      redundantNodes = Math.ceil(nodeCount / totalAZs);
    } else if (redundancy === 'N+2') {
      redundantNodes = Math.ceil((nodeCount / totalAZs) * 2);
    } else if (redundancy === '1 Node') {
      redundantNodes = 1;
    } else if (redundancy === '2 Nodes') {
      redundantNodes = 2;
    }

    const usableNodes = nodeCount - redundantNodes;
    const usableVCPUs = Math.round((totalVCPUs / nodeCount) * usableNodes);
    const usableMemoryGB = Math.round((totalMemoryGB / nodeCount) * usableNodes);

    // Calculate max VMs based on both vCPU and memory constraints
    const maxVMsByVCPU = Math.floor(usableVCPUs / averageVMVCPUs);
    const maxVMsByMemory = Math.floor(usableMemoryGB / averageVMMemoryGB);
    const maxVMs = Math.min(maxVMsByVCPU, maxVMsByMemory);

    // Calculate cost per VM
    const costPerVM = maxVMs > 0 ? costAnalysis.monthlyOperationalCost / maxVMs : 0;

    calculationSteps.push(`Total nodes: ${nodeCount}, Redundant nodes: ${redundantNodes}, Usable nodes: ${usableNodes}`);
    calculationSteps.push(`Total vCPUs: ${totalVCPUs}, Usable vCPUs: ${usableVCPUs}`);
    calculationSteps.push(`Max VMs: ${maxVMs} (limited by ${maxVMsByVCPU < maxVMsByMemory ? 'CPU' : 'memory'})`);
    calculationSteps.push(`Cost per VM: $${costPerVM.toFixed(2)}/month`);

    // Build and return the result
    const result: SimulationResult = {
      // Configuration
      nodeCount,
      clusterId: targetCluster.id,
      clusterName: targetCluster.name,

      // Capacity metrics
      totalVCPUs,
      usableVCPUs,
      totalMemoryGB,
      usableMemoryGB,
      maxVMs,

      // Infrastructure that scales
      totalRacks: rackEstimate.totalRacks,
      totalLeafSwitches: infrastructure.leafSwitches,
      totalMgmtSwitches: infrastructure.managementSwitches,
      totalStorageSwitches: 0, // Simplified: not tracking storage switches separately
      totalPowerW: powerConsumption.operationalPower,

      // Cost breakdown
      capitalCost: costAnalysis.capitalCost,
      monthlyOperationalCost: costAnalysis.monthlyOperationalCost,
      monthlyFacilityCost: costAnalysis.monthlyFacilityCost,
      monthlyEnergyCost: costAnalysis.monthlyEnergyCost,
      monthlyAmortizedCost: costAnalysis.monthlyAmortizedCost,
      costPerVM,

      // Debug info
      redundantNodes,
      calculationSteps
    };

    return result;
  } catch (error) {
    console.error('Simulation error:', error);
    throw new Error(`Design simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};