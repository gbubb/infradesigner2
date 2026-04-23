import type { 
  DatacenterFacility, 
  CostLayer, 
  FacilityCostBreakdown,
  RackCostAllocation,
  CostLayerBreakdown,
  CostCategory,
  HierarchyLevel
} from '@/types/infrastructure/datacenter-types';
import type { DatacenterRackWithUsage } from '@/types/infrastructure/datacenter-rack-types';

export class DatacenterCostCalculator {
  private facility: DatacenterFacility;
  private datacenterRacks: DatacenterRackWithUsage[];

  constructor(facility: DatacenterFacility, datacenterRacks: DatacenterRackWithUsage[]) {
    this.facility = facility;
    this.datacenterRacks = datacenterRacks;
  }

  /**
   * Calculate total cost breakdown for the facility
   */
  calculateFacilityCosts(): FacilityCostBreakdown {
    const totalPowerCapacityKW = this.calculateTotalPowerCapacity();
    const totalRackCount = this.datacenterRacks?.length || 0;
    const allocatedPowerKW = this.calculateAllocatedPower();
    const allocatedRackCount = this.datacenterRacks?.filter(r => r.mappedRack && r.mappedRack.devices && r.mappedRack.devices.length > 0).length || 0;

    const costLayerBreakdowns = (this.facility.costLayers || []).map(layer => 
      this.calculateCostLayerBreakdown(layer, totalRackCount, totalPowerCapacityKW)
    );

    const totalMonthlyCost = costLayerBreakdowns.reduce((sum, layer) => sum + layer.monthlyAmount, 0);
    const totalCapitalCost = costLayerBreakdowns
      .filter(layer => layer.type === 'capital')
      .reduce((sum, layer) => sum + (layer.totalAmount ?? 0), 0);
    const totalOperationalCost = costLayerBreakdowns
      .filter(layer => layer.type === 'operational')
      .reduce((sum, layer) => sum + layer.monthlyAmount, 0);

    return {
      facilityId: this.facility.id,
      facilityName: this.facility.name,
      totalMonthlyCost,
      totalCapitalCost,
      totalOperationalCost,
      costPerRack: totalRackCount > 0 ? totalMonthlyCost / totalRackCount : 0,
      costPerKW: totalPowerCapacityKW > 0 ? totalMonthlyCost / totalPowerCapacityKW : 0,
      costPerAllocatedRack: allocatedRackCount > 0 ? totalMonthlyCost / allocatedRackCount : 0,
      costPerAllocatedKW: allocatedPowerKW > 0 ? totalMonthlyCost / allocatedPowerKW : 0,
      utilizationMetrics: {
        rackUtilization: totalRackCount > 0 ? allocatedRackCount / totalRackCount : 0,
        powerUtilization: totalPowerCapacityKW > 0 ? allocatedPowerKW / totalPowerCapacityKW : 0,
        totalRackCount,
        allocatedRackCount,
        totalPowerCapacityKW,
        allocatedPowerKW
      },
      costLayerBreakdowns,
      rackAllocations: [] // Use calculatePerRackCosts() for detailed allocations
    };
  }

  /**
   * Calculate monthly cost breakdown for a specific cost layer
   */
  private calculateCostLayerBreakdown(
    layer: CostLayer, 
    totalRacks: number, 
    totalPowerKW: number
  ): CostLayerBreakdown {
    let monthlyAmount = 0;
    
    if (layer.type === 'capital' && layer.amortisationMonths) {
      monthlyAmount = layer.amount / layer.amortisationMonths;
    } else if (layer.type === 'operational') {
      monthlyAmount = layer.frequency === 'annual' ? layer.amount / 12 : layer.amount;
    }

    const perRackAmount = totalRacks > 0 ? monthlyAmount / totalRacks : 0;
    const perKWAmount = totalPowerKW > 0 ? monthlyAmount / totalPowerKW : 0;

    return {
      layerId: layer.id,
      layerName: layer.name,
      type: layer.type,
      totalAmount: layer.amount,
      monthlyAmount,
      perRackAmount,
      perKWAmount,
      allocationMethod: layer.allocationMethod,
      amortisationMonths: layer.amortisationMonths,
      currency: layer.currency
    };
  }

  /**
   * Calculate detailed per-rack cost allocations
   * Costs are distributed across ALL datacenter racks, not just occupied ones
   */
  async calculatePerRackCosts(): Promise<RackCostAllocation[]> {
    const facilityBreakdown = this.calculateFacilityCosts();
    const rackAllocations: RackCostAllocation[] = [];

    for (const rack of (this.datacenterRacks || [])) {
      const rackPowerKw = rack.powerUsageKw || rack.maxPowerKw || 0;
      const hierarchyPath = await this.getHierarchyPath(rack);
      
      // Calculate costs for this rack
      const capitalCosts = this.calculateRackCapitalCosts(rack, facilityBreakdown);
      const operationalCosts = this.calculateRackOperationalCosts(rack, facilityBreakdown);
      
      const totalMonthly = capitalCosts.monthly + operationalCosts.monthly;
      const perU = rack.uHeight > 0 ? totalMonthly / rack.uHeight : 0;
      const perKw = rackPowerKw > 0 ? totalMonthly / rackPowerKw : 0;
      
      rackAllocations.push({
        rackId: rack.id,
        rackName: rack.name,
        hierarchyPath,
        hierarchyLevelId: rack.hierarchyLevelId || '',
        costs: {
          capital: capitalCosts,
          operational: operationalCosts,
          total: {
            monthly: totalMonthly,
            perU,
            perKw
          }
        },
        utilization: {
          powerAllocatedKw: rack.maxPowerKw || 0,
          powerUsedKw: rack.powerUsageKw,
          usedU: rack.spaceUsageU,
          totalU: rack.uHeight
        }
      });
    }

    return rackAllocations;
  }

  /**
   * Calculate capital cost allocation for a rack
   */
  private calculateRackCapitalCosts(
    rack: DatacenterRackWithUsage,
    facilityBreakdown: FacilityCostBreakdown
  ): { monthly: number; breakdown: Record<CostCategory, number> } {
    const capitalLayers = this.facility.costLayers.filter(l => l.type === 'capital');
    const breakdown: Record<CostCategory, number> = {} as Record<CostCategory, number>;
    let totalMonthly = 0;

    for (const layer of capitalLayers) {
      const layerMonthly = this.allocateCostToRack(layer, rack, facilityBreakdown);
      totalMonthly += layerMonthly;
      breakdown[layer.category] = (breakdown[layer.category] || 0) + layerMonthly;
    }

    return { monthly: totalMonthly, breakdown };
  }

  /**
   * Calculate operational cost allocation for a rack
   */
  private calculateRackOperationalCosts(
    rack: DatacenterRackWithUsage,
    facilityBreakdown: FacilityCostBreakdown
  ): { monthly: number; breakdown: Record<CostCategory, number> } {
    const operationalLayers = this.facility.costLayers.filter(l => l.type === 'operational');
    const breakdown: Record<CostCategory, number> = {} as Record<CostCategory, number>;
    let totalMonthly = 0;

    for (const layer of operationalLayers) {
      const layerMonthly = this.allocateCostToRack(layer, rack, facilityBreakdown);
      totalMonthly += layerMonthly;
      breakdown[layer.category] = (breakdown[layer.category] || 0) + layerMonthly;
    }

    return { monthly: totalMonthly, breakdown };
  }

  /**
   * Allocate a specific cost layer to a rack based on allocation method
   */
  private allocateCostToRack(
    layer: CostLayer,
    rack: DatacenterRackWithUsage,
    _facilityBreakdown: FacilityCostBreakdown
  ): number {
    let monthlyAmount = 0;
    
    if (layer.type === 'capital' && layer.amortisationMonths) {
      monthlyAmount = layer.amount / layer.amortisationMonths;
    } else if (layer.type === 'operational') {
      switch (layer.frequency) {
        case 'annual':
          monthlyAmount = layer.amount / 12;
          break;
        case 'quarterly':
          monthlyAmount = layer.amount / 3;
          break;
        default:
          monthlyAmount = layer.amount;
      }
    }

    // Apply allocation method - costs are distributed across ALL datacenter racks
    const totalRacks = this.datacenterRacks.length;
    const totalPower = this.datacenterRacks.reduce((sum, r) => 
      sum + (r.maxPowerKw || 0), 0  // Use max power capacity for cost allocation
    );
    const rackPower = rack.maxPowerKw || 0;  // Use max power capacity for cost allocation

    switch (layer.allocationMethod) {
      case 'per-rack':
        return totalRacks > 0 ? monthlyAmount / totalRacks : 0;
      
      case 'per-kw':
        return totalPower > 0 ? (rackPower / totalPower) * monthlyAmount : 0;
      
      case 'hybrid': {
        const rackWeight = 0.5; // Default 50/50 split
        const powerWeight = 0.5;
        const rackAllocation = totalRacks > 0 ? monthlyAmount / totalRacks : 0;
        const powerAllocation = totalPower > 0 ? (rackPower / totalPower) * monthlyAmount : 0;
        return (rackAllocation * rackWeight) + (powerAllocation * powerWeight);
      }
      
      case 'fixed':
        // Fixed costs are split evenly
        return totalRacks > 0 ? monthlyAmount / totalRacks : 0;
      
      default:
        return 0;
    }
  }

  /**
   * Get hierarchy path for a rack
   */
  private async getHierarchyPath(rack: DatacenterRackWithUsage): Promise<string[]> {
    if (!rack.facilityId || !rack.hierarchyLevelId) return [];
    
    try {
      // Get hierarchy path from facility configuration
      const facility = this.facility;
      const hierarchyMap = new Map<string, HierarchyLevel>();
      facility.hierarchyConfig.forEach(level => {
        hierarchyMap.set(level.id, level);
      });
      
      const path: string[] = [];
      let currentLevel = hierarchyMap.get(rack.hierarchyLevelId);
      
      while (currentLevel) {
        path.unshift(currentLevel.name);
        currentLevel = currentLevel.parentId ? hierarchyMap.get(currentLevel.parentId) : undefined;
      }
      
      return path;
    } catch {
      return [];
    }
  }

  /**
   * Calculate total power capacity from facility power infrastructure
   */
  private calculateTotalPowerCapacity(): number {
    // Find the rack-level power layer (typically PDU or panel)
    const rackPowerLayer = (this.facility.powerInfrastructure || [])
      .filter(layer => !layer.parentLayerId)
      .sort((a, b) => b.capacityKW - a.capacityKW)[0];
    
    return rackPowerLayer?.capacityKW || 0;
  }

  /**
   * Calculate total allocated power across all racks
   */
  private calculateAllocatedPower(): number {
    return (this.datacenterRacks || []).reduce((sum, rack) => {
      return sum + (rack.mappedRack?.actualPowerUsageKw || rack.mappedRack?.powerAllocationKw || rack.powerUsageKw || 0);
    }, 0);
  }

  /**
   * Calculate cost impact of adding/removing a rack
   */
  calculateIncrementalRackCost(addRack: boolean = true): {
    deltaMonthlyCost: number;
    newCostPerRack: number;
    newCostPerKW: number;
  } {
    const currentBreakdown = this.calculateFacilityCosts();
    const newRackCount = (this.datacenterRacks?.length || 0) + (addRack ? 1 : -1);
    
    if (newRackCount <= 0) {
      return {
        deltaMonthlyCost: -currentBreakdown.totalMonthlyCost,
        newCostPerRack: 0,
        newCostPerKW: currentBreakdown.costPerKW
      };
    }

    const newCostPerRack = currentBreakdown.totalMonthlyCost / newRackCount;
    const deltaMonthlyCost = addRack 
      ? newCostPerRack 
      : -currentBreakdown.costPerRack;

    return {
      deltaMonthlyCost,
      newCostPerRack,
      newCostPerKW: currentBreakdown.costPerKW
    };
  }

  /**
   * Project costs over time with growth scenarios
   */
  projectCosts(
    monthsAhead: number,
    monthlyGrowthRate: number = 0
  ): Array<{
    month: number;
    rackCount: number;
    powerKW: number;
    monthlyCost: number;
    cumulativeCost: number;
  }> {
    const projections = [];
    let cumulativeCost = 0;
    const baseBreakdown = this.calculateFacilityCosts();
    
    for (let month = 0; month <= monthsAhead; month++) {
      const growthFactor = Math.pow(1 + monthlyGrowthRate, month);
      const projectedRacks = Math.min(
        Math.round((this.datacenterRacks?.length || 0) * growthFactor),
        this.facility.constraints?.maxRacks || 0
      );
      const utilizationMetrics = baseBreakdown.utilizationMetrics;
      const projectedPower = Math.min(
        (utilizationMetrics?.allocatedPowerKW ?? 0) * growthFactor,
        utilizationMetrics?.totalPowerCapacityKW ?? 0
      );

      const utilizationFactor = utilizationMetrics?.totalRackCount
        ? projectedRacks / utilizationMetrics.totalRackCount
        : 0;
      const monthlyCost = baseBreakdown.totalMonthlyCost * utilizationFactor;
      cumulativeCost += monthlyCost;
      
      projections.push({
        month,
        rackCount: projectedRacks,
        powerKW: projectedPower,
        monthlyCost,
        cumulativeCost
      });
    }
    
    return projections;
  }
}