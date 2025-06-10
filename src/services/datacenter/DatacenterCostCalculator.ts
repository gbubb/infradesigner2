import type { 
  DatacenterFacility, 
  CostLayer, 
  FacilityCostBreakdown,
  RackCostAllocation,
  CostLayerBreakdown
} from '@/types/infrastructure/datacenter-types';
import type { Rack } from '@/types/infrastructure';

export class DatacenterCostCalculator {
  private facility: DatacenterFacility;
  private racks: Rack[];

  constructor(facility: DatacenterFacility, racks: Rack[]) {
    this.facility = facility;
    this.racks = racks;
  }

  /**
   * Calculate total cost breakdown for the facility
   */
  calculateFacilityCosts(): FacilityCostBreakdown {
    const totalPowerCapacityKW = this.calculateTotalPowerCapacity();
    const totalRackCount = this.racks.length;
    const allocatedPowerKW = this.calculateAllocatedPower();
    const allocatedRackCount = this.racks.filter(r => r.placedComponents.length > 0).length;

    const costLayerBreakdowns = this.facility.costLayers.map(layer => 
      this.calculateCostLayerBreakdown(layer, totalRackCount, totalPowerCapacityKW)
    );

    const totalMonthlyCost = costLayerBreakdowns.reduce((sum, layer) => sum + layer.monthlyAmount, 0);
    const totalCapitalCost = costLayerBreakdowns
      .filter(layer => layer.type === 'capital')
      .reduce((sum, layer) => sum + layer.totalAmount, 0);
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
      rackAllocations: this.calculateRackAllocations(totalMonthlyCost, totalPowerCapacityKW)
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
    
    if (layer.type === 'capital' && layer.amortizationMonths) {
      monthlyAmount = layer.amount / layer.amortizationMonths;
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
      amortizationMonths: layer.amortizationMonths,
      currency: layer.currency
    };
  }

  /**
   * Calculate cost allocation for each rack based on power and space
   */
  private calculateRackAllocations(
    totalMonthlyCost: number, 
    totalPowerKW: number
  ): RackCostAllocation[] {
    return this.racks.map(rack => {
      const rackPowerKW = this.calculateRackPower(rack);
      const costByPower = totalPowerKW > 0 ? (rackPowerKW / totalPowerKW) * totalMonthlyCost : 0;
      const costBySpace = this.racks.length > 0 ? totalMonthlyCost / this.racks.length : 0;
      
      // Calculate weighted allocation based on facility cost layers
      const powerWeightedLayers = this.facility.costLayers.filter(l => 
        l.allocationMethod === 'per-kw' || l.allocationMethod === 'hybrid'
      );
      const spaceWeightedLayers = this.facility.costLayers.filter(l => 
        l.allocationMethod === 'per-rack' || l.allocationMethod === 'hybrid'
      );
      
      const powerWeight = powerWeightedLayers.length / this.facility.costLayers.length;
      const spaceWeight = spaceWeightedLayers.length / this.facility.costLayers.length;
      
      const allocatedCost = (costByPower * powerWeight) + (costBySpace * spaceWeight);

      return {
        rackId: rack.id,
        rackName: rack.name,
        powerKW: rackPowerKW,
        powerPercentage: totalPowerKW > 0 ? (rackPowerKW / totalPowerKW) * 100 : 0,
        spacePercentage: this.racks.length > 0 ? (1 / this.racks.length) * 100 : 0,
        allocatedMonthlyCost: allocatedCost,
        costBreakdown: {
          byPower: costByPower * powerWeight,
          bySpace: costBySpace * spaceWeight
        }
      };
    });
  }

  /**
   * Calculate total power capacity from facility power infrastructure
   */
  private calculateTotalPowerCapacity(): number {
    // Find the rack-level power layer (typically PDU or panel)
    const rackPowerLayer = this.facility.powerInfrastructure
      .filter(layer => !layer.parentLayerId)
      .sort((a, b) => b.capacityKW - a.capacityKW)[0];
    
    return rackPowerLayer?.capacityKW || 0;
  }

  /**
   * Calculate total allocated power across all racks
   */
  private calculateAllocatedPower(): number {
    return this.racks.reduce((sum, rack) => sum + this.calculateRackPower(rack), 0);
  }

  /**
   * Calculate power consumption for a single rack
   */
  private calculateRackPower(rack: Rack): number {
    return rack.placedComponents.reduce((sum, component) => {
      const powerW = component.power || 0;
      const quantity = component.quantity || 1;
      return sum + (powerW * quantity / 1000); // Convert to kW
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
    const newRackCount = this.racks.length + (addRack ? 1 : -1);
    
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
        Math.round(this.racks.length * growthFactor),
        baseBreakdown.utilizationMetrics.totalRackCount
      );
      const projectedPower = Math.min(
        baseBreakdown.utilizationMetrics.allocatedPowerKW * growthFactor,
        baseBreakdown.utilizationMetrics.totalPowerCapacityKW
      );
      
      const utilizationFactor = projectedRacks / baseBreakdown.utilizationMetrics.totalRackCount;
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