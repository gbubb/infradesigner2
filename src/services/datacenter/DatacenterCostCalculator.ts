
export interface CostLayerBreakdown {
  id: string;
  name: string;
  monthlyAllocation: number;
  allocationMethod: string;
  category: string;
}

export interface FacilityCostBreakdown {
  totalMonthlyCost: number;
  costPerRack: number;
  costPerKW: number;
  layers: CostLayerBreakdown[];
}

export class DatacenterCostCalculator {
  calculateCostAllocation(
    costLayers: any[],
    usedRacks: number,
    totalRacks: number,
    usedPowerKW: number,
    totalPowerKW: number
  ): FacilityCostBreakdown {
    const layers: CostLayerBreakdown[] = costLayers.map(layer => ({
      id: layer.id,
      name: layer.name,
      monthlyAllocation: this.calculateLayerAllocation(layer, usedRacks, totalRacks, usedPowerKW, totalPowerKW),
      allocationMethod: layer.allocationMethod,
      category: layer.category
    }));

    const totalMonthlyCost = layers.reduce((sum, layer) => sum + layer.monthlyAllocation, 0);

    return {
      totalMonthlyCost,
      costPerRack: usedRacks > 0 ? totalMonthlyCost / usedRacks : 0,
      costPerKW: usedPowerKW > 0 ? totalMonthlyCost / usedPowerKW : 0,
      layers
    };
  }

  private calculateLayerAllocation(
    layer: any,
    usedRacks: number,
    totalRacks: number,
    usedPowerKW: number,
    totalPowerKW: number
  ): number {
    const baseAmount = layer.type === 'capital' 
      ? (layer.amount || 0) / (layer.amortizationMonths || 1)
      : (layer.amount || 0);

    switch (layer.allocationMethod) {
      case 'per-rack':
        return totalRacks > 0 ? (baseAmount * usedRacks) / totalRacks : 0;
      case 'per-kw':
        return totalPowerKW > 0 ? (baseAmount * usedPowerKW) / totalPowerKW : 0;
      case 'hybrid':
        return totalRacks > 0 && totalPowerKW > 0 
          ? (baseAmount * 0.5 * usedRacks) / totalRacks + (baseAmount * 0.5 * usedPowerKW) / totalPowerKW
          : 0;
      default:
        return baseAmount;
    }
  }
}
