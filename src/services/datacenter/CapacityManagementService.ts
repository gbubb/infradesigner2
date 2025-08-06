import type { 
  DatacenterFacility, 
  CapacityMetrics,
  HierarchyCapacityNode,
  ExpansionScenario,
  CapacityConstraint
} from '@/types/infrastructure/datacenter-types';
import type { Rack } from '@/types/infrastructure';

export class CapacityManagementService {
  private facility: DatacenterFacility;
  private racks: Rack[];

  constructor(facility: DatacenterFacility, racks: Rack[]) {
    this.facility = facility;
    this.racks = racks;
  }

  /**
   * Calculate comprehensive capacity metrics for the facility
   */
  calculateCapacityMetrics(): CapacityMetrics {
    const hierarchyCapacity = this.buildHierarchyCapacity();
    const powerCapacity = this.calculatePowerCapacity();
    const spaceCapacity = this.calculateSpaceCapacity();
    const coolingCapacity = this.calculateCoolingCapacity();
    const networkCapacity = this.calculateNetworkCapacity();
    
    const constraints = this.identifyCapacityConstraints();
    const overallUtilization = this.calculateOverallUtilization(
      powerCapacity.utilization,
      spaceCapacity.utilization,
      coolingCapacity.utilization
    );

    return {
      facilityId: this.facility.id,
      facilityName: this.facility.name,
      lastUpdated: new Date().toISOString(),
      powerCapacity,
      spaceCapacity,
      coolingCapacity,
      networkCapacity,
      hierarchyCapacity,
      constraints,
      overallUtilization,
      expansionPotential: this.calculateExpansionPotential(constraints)
    };
  }

  /**
   * Build capacity tree based on facility hierarchy
   */
  private buildHierarchyCapacity(): HierarchyCapacityNode {
    const rootNode: HierarchyCapacityNode = {
      id: 'root',
      name: this.facility.name,
      type: 'facility',
      totalCapacity: {
        racks: this.facility.constraints.maxRacks || 0,
        powerKW: this.facility.constraints.maxPowerKW || 0,
        coolingKW: this.facility.constraints.maxCoolingKW || 0
      },
      usedCapacity: {
        racks: this.racks.filter(r => r.placedComponents.length > 0).length,
        powerKW: this.calculateTotalPowerUsage(),
        coolingKW: this.calculateTotalCoolingLoad()
      },
      utilization: 0,
      children: []
    };

    // Calculate utilization
    rootNode.utilization = this.calculateNodeUtilization(rootNode);

    // Build hierarchy tree
    if (this.facility.hierarchyConfig && this.facility.hierarchyConfig.length > 0) {
      rootNode.children = this.buildHierarchyChildren(null, rootNode.totalCapacity);
    }

    return rootNode;
  }

  /**
   * Recursively build hierarchy children
   */
  private buildHierarchyChildren(
    parentId: string | null, 
    parentCapacity: { racks: number; powerKW: number; coolingKW: number }
  ): HierarchyCapacityNode[] {
    const children = this.facility.hierarchyConfig
      .filter(h => h.parentId === parentId)
      .map(hierarchy => {
        // Distribute parent capacity among children
        const siblingCount = this.facility.hierarchyConfig
          .filter(h => h.parentId === parentId).length;
        
        const nodeCapacity = {
          racks: Math.floor(parentCapacity.racks / siblingCount),
          powerKW: parentCapacity.powerKW / siblingCount,
          coolingKW: parentCapacity.coolingKW / siblingCount
        };

        // Calculate used capacity for this node
        const racksInNode = this.getRacksInHierarchyNode(hierarchy.id);
        const usedCapacity = {
          racks: racksInNode.filter(r => r.placedComponents.length > 0).length,
          powerKW: racksInNode.reduce((sum, rack) => sum + this.calculateRackPower(rack), 0),
          coolingKW: racksInNode.reduce((sum, rack) => sum + this.calculateRackCooling(rack), 0)
        };

        const node: HierarchyCapacityNode = {
          id: hierarchy.id,
          name: hierarchy.name,
          type: hierarchy.name.toLowerCase(),
          totalCapacity: nodeCapacity,
          usedCapacity,
          utilization: 0,
          children: []
        };

        node.utilization = this.calculateNodeUtilization(node);
        node.children = this.buildHierarchyChildren(hierarchy.id, nodeCapacity);

        return node;
      });

    return children;
  }

  /**
   * Get racks assigned to a specific hierarchy node
   */
  private getRacksInHierarchyNode(nodeId: string): Rack[] {
    // In a real implementation, racks would have hierarchy assignments
    // For now, distribute racks evenly
    const nodeCount = this.facility.hierarchyConfig.filter(h => !h.parentId).length;
    const racksPerNode = Math.ceil(this.racks.length / nodeCount);
    const nodeIndex = this.facility.hierarchyConfig.findIndex(h => h.id === nodeId);
    
    return this.racks.slice(
      nodeIndex * racksPerNode,
      (nodeIndex + 1) * racksPerNode
    );
  }

  /**
   * Calculate utilization percentage for a hierarchy node
   */
  private calculateNodeUtilization(node: HierarchyCapacityNode): number {
    const metrics = [
      node.totalCapacity.racks > 0 ? node.usedCapacity.racks / node.totalCapacity.racks : 0,
      node.totalCapacity.powerKW > 0 ? node.usedCapacity.powerKW / node.totalCapacity.powerKW : 0,
      node.totalCapacity.coolingKW > 0 ? node.usedCapacity.coolingKW / node.totalCapacity.coolingKW : 0
    ].filter(m => m > 0);

    return metrics.length > 0 
      ? (metrics.reduce((sum, m) => sum + m, 0) / metrics.length) * 100 
      : 0;
  }

  /**
   * Calculate power capacity metrics
   */
  private calculatePowerCapacity(): {
    totalKW: number;
    usedKW: number;
    availableKW: number;
    utilization: number;
    criticalReserveKW: number;
    effectiveAvailableKW: number;
  } {
    const totalKW = this.facility.constraints.maxPowerKW || 0;
    const usedKW = this.calculateTotalPowerUsage();
    const criticalReserveKW = this.calculateCriticalReserve();
    const effectiveAvailableKW = Math.max(0, totalKW - usedKW - criticalReserveKW);

    return {
      totalKW,
      usedKW,
      availableKW: totalKW - usedKW,
      utilization: totalKW > 0 ? (usedKW / totalKW) * 100 : 0,
      criticalReserveKW,
      effectiveAvailableKW
    };
  }

  /**
   * Calculate space capacity metrics
   */
  private calculateSpaceCapacity(): {
    totalRacks: number;
    usedRacks: number;
    availableRacks: number;
    utilization: number;
    totalRU: number;
    usedRU: number;
    availableRU: number;
  } {
    const totalRacks = this.facility.constraints.maxRacks || 0;
    const usedRacks = this.racks.filter(r => r.placedComponents.length > 0).length;
    const totalRU = this.racks.reduce((sum, rack) => sum + (rack.heightU || 42), 0);
    const usedRU = this.racks.reduce((sum, rack) => {
      return sum + rack.placedComponents.reduce((rackSum, comp) => {
        return rackSum + ((comp.heightU || 0) * (comp.quantity || 1));
      }, 0);
    }, 0);

    return {
      totalRacks,
      usedRacks,
      availableRacks: totalRacks - usedRacks,
      utilization: totalRacks > 0 ? (usedRacks / totalRacks) * 100 : 0,
      totalRU,
      usedRU,
      availableRU: totalRU - usedRU
    };
  }

  /**
   * Calculate cooling capacity metrics
   */
  private calculateCoolingCapacity(): {
    totalKW: number;
    usedKW: number;
    availableKW: number;
    utilization: number;
    coolingEfficiency: number;
  } {
    const totalKW = this.facility.constraints.maxCoolingKW || 0;
    const usedKW = this.calculateTotalCoolingLoad();
    const powerUsage = this.calculateTotalPowerUsage();
    const coolingEfficiency = powerUsage > 0 ? usedKW / powerUsage : 1;

    return {
      totalKW,
      usedKW,
      availableKW: totalKW - usedKW,
      utilization: totalKW > 0 ? (usedKW / totalKW) * 100 : 0,
      coolingEfficiency
    };
  }

  /**
   * Calculate network capacity metrics
   */
  private calculateNetworkCapacity(): {
    totalPorts: number;
    usedPorts: number;
    availablePorts: number;
    utilization: number;
    portsBySpeed: Record<string, { total: number; used: number }>;
  } {
    // This is a simplified calculation - in reality would track actual network infrastructure
    const portsBySpeed: Record<string, { total: number; used: number }> = {};
    let totalPorts = 0;
    let usedPorts = 0;

    // Count ports from network components in racks
    this.racks.forEach(rack => {
      rack.placedComponents.forEach(component => {
        if (component.componentType === 'Switch' || component.componentType === 'Router') {
          const portCount = component.ports?.length || 0;
          totalPorts += portCount * (component.quantity || 1);
          
          // Track by speed
          component.ports?.forEach(port => {
            const speed = port.speed || 'Unknown';
            if (!portsBySpeed[speed]) {
              portsBySpeed[speed] = { total: 0, used: 0 };
            }
            portsBySpeed[speed].total += port.count * (component.quantity || 1);
          });
        }
      });
    });

    // Estimate used ports (simplified)
    usedPorts = Math.floor(totalPorts * 0.6); // Assume 60% utilization

    return {
      totalPorts,
      usedPorts,
      availablePorts: totalPorts - usedPorts,
      utilization: totalPorts > 0 ? (usedPorts / totalPorts) * 100 : 0,
      portsBySpeed
    };
  }

  /**
   * Calculate total power usage across all racks
   */
  private calculateTotalPowerUsage(): number {
    return this.racks.reduce((sum, rack) => sum + this.calculateRackPower(rack), 0);
  }

  /**
   * Calculate power for a single rack
   */
  private calculateRackPower(rack: Rack): number {
    return rack.placedComponents.reduce((sum, component) => {
      const powerW = component.power || 0;
      const quantity = component.quantity || 1;
      return sum + (powerW * quantity / 1000); // Convert to kW
    }, 0);
  }

  /**
   * Calculate cooling load for a rack (assumes cooling load = power usage)
   */
  private calculateRackCooling(rack: Rack): number {
    return this.calculateRackPower(rack); // 1:1 ratio for simplicity
  }

  /**
   * Calculate total cooling load
   */
  private calculateTotalCoolingLoad(): number {
    return this.calculateTotalPowerUsage(); // 1:1 ratio for simplicity
  }

  /**
   * Calculate critical power reserve
   */
  private calculateCriticalReserve(): number {
    // Use power infrastructure redundancy to determine reserve
    const maxRedundancy = Math.max(
      ...this.facility.powerInfrastructure.map(layer => {
        if (!layer.redundancyConfig) return 0;
        switch (layer.redundancyConfig.type) {
          case 'N+1': return layer.capacityKW / (layer.redundancyConfig.config.n || 1);
          case '2N': return layer.capacityKW * 0.5;
          case '2N+1': return layer.capacityKW * 0.5 + (layer.capacityKW / ((layer.redundancyConfig.config.n || 1) * 2));
          default: return 0;
        }
      })
    );
    
    return maxRedundancy;
  }

  /**
   * Identify capacity constraints
   */
  private identifyCapacityConstraints(): CapacityConstraint[] {
    const constraints: CapacityConstraint[] = [];
    const metrics = this.calculateCapacityMetrics();

    // Check power constraints
    if (metrics.powerCapacity.utilization > 80) {
      constraints.push({
        type: 'power',
        severity: metrics.powerCapacity.utilization > 90 ? 'critical' : 'warning',
        currentUtilization: metrics.powerCapacity.utilization,
        thresholdPercent: 80,
        availableCapacity: metrics.powerCapacity.effectiveAvailableKW,
        recommendedAction: 'Consider power infrastructure upgrade or load balancing',
        impactedHierarchy: ['facility']
      });
    }

    // Check space constraints
    if (metrics.spaceCapacity.utilization > 85) {
      constraints.push({
        type: 'space',
        severity: metrics.spaceCapacity.utilization > 95 ? 'critical' : 'warning',
        currentUtilization: metrics.spaceCapacity.utilization,
        thresholdPercent: 85,
        availableCapacity: metrics.spaceCapacity.availableRacks,
        recommendedAction: 'Plan for facility expansion or optimise rack density',
        impactedHierarchy: ['facility']
      });
    }

    // Check cooling constraints
    if (metrics.coolingCapacity.utilization > 75) {
      constraints.push({
        type: 'cooling',
        severity: metrics.coolingCapacity.utilization > 85 ? 'critical' : 'warning',
        currentUtilization: metrics.coolingCapacity.utilization,
        thresholdPercent: 75,
        availableCapacity: metrics.coolingCapacity.availableKW,
        recommendedAction: 'Upgrade cooling infrastructure or improve efficiency',
        impactedHierarchy: ['facility']
      });
    }

    return constraints;
  }

  /**
   * Calculate overall facility utilization
   */
  private calculateOverallUtilization(
    powerUtil: number,
    spaceUtil: number,
    coolingUtil: number
  ): number {
    // Weighted average with power being most critical
    return (powerUtil * 0.4) + (spaceUtil * 0.3) + (coolingUtil * 0.3);
  }

  /**
   * Calculate expansion potential
   */
  private calculateExpansionPotential(
    constraints: CapacityConstraint[]
  ): {
    maxAdditionalRacks: number;
    maxAdditionalPowerKW: number;
    limitingFactor: 'power' | 'space' | 'cooling' | 'none';
    expansionCost?: number;
  } {
    const powerCapacity = this.calculatePowerCapacity();
    const spaceCapacity = this.calculateSpaceCapacity();
    const coolingCapacity = this.calculateCoolingCapacity();

    const avgPowerPerRack = this.racks.length > 0 
      ? this.calculateTotalPowerUsage() / this.racks.filter(r => r.placedComponents.length > 0).length 
      : 5; // Default 5kW per rack

    const racksByPower = powerCapacity.effectiveAvailableKW / avgPowerPerRack;
    const racksBySpace = spaceCapacity.availableRacks;
    const racksByCooling = coolingCapacity.availableKW / avgPowerPerRack;

    const maxAdditionalRacks = Math.floor(Math.min(racksByPower, racksBySpace, racksByCooling));
    
    let limitingFactor: 'power' | 'space' | 'cooling' | 'none' = 'none';
    if (maxAdditionalRacks === Math.floor(racksByPower)) limitingFactor = 'power';
    else if (maxAdditionalRacks === racksBySpace) limitingFactor = 'space';
    else if (maxAdditionalRacks === Math.floor(racksByCooling)) limitingFactor = 'cooling';

    return {
      maxAdditionalRacks,
      maxAdditionalPowerKW: maxAdditionalRacks * avgPowerPerRack,
      limitingFactor
    };
  }

  /**
   * Generate expansion scenarios
   */
  generateExpansionScenarios(
    targetGrowthPercent: number = 50
  ): ExpansionScenario[] {
    const currentMetrics = this.calculateCapacityMetrics();
    const scenarios: ExpansionScenario[] = [];

    // Scenario 1: Optimise existing infrastructure
    scenarios.push({
      name: 'Optimisation Only',
      description: 'Improve efficiency without infrastructure changes',
      capitalCost: 0,
      timelineMonths: 3,
      additionalCapacity: {
        racks: 0,
        powerKW: currentMetrics.powerCapacity.usedKW * 0.1, // 10% efficiency gain
        coolingKW: currentMetrics.coolingCapacity.usedKW * 0.15 // 15% cooling efficiency
      },
      newConstraints: [],
      roi: {
        paybackMonths: 6,
        npv: 100000, // Example values
        irr: 0.25
      }
    });

    // Scenario 2: Incremental expansion
    const targetRacks = Math.ceil(this.racks.length * (1 + targetGrowthPercent / 100));
    const additionalRacks = targetRacks - this.racks.length;
    const avgPowerPerRack = currentMetrics.powerCapacity.usedKW / 
      Math.max(1, this.racks.filter(r => r.placedComponents.length > 0).length);

    scenarios.push({
      name: 'Incremental Expansion',
      description: `Add capacity for ${additionalRacks} additional racks`,
      capitalCost: additionalRacks * 50000, // Example cost per rack
      timelineMonths: 6,
      additionalCapacity: {
        racks: additionalRacks,
        powerKW: additionalRacks * avgPowerPerRack * 1.2, // 20% overhead
        coolingKW: additionalRacks * avgPowerPerRack * 1.2
      },
      newConstraints: [],
      roi: {
        paybackMonths: 24,
        npv: 500000,
        irr: 0.15
      }
    });

    return scenarios;
  }
}