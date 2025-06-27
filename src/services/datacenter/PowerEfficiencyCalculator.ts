
export interface PowerLayer {
  id: string;
  name: string;
  type: string;
  capacityKW: number;
  efficiency: number;
  parentLayerId?: string;
}

export interface PUEBreakdown {
  itLoad: number;
  coolingLoad: number;
  otherLoads: number;
  totalLoad: number;
}

export interface PUEResult {
  total: number;
  breakdown: PUEBreakdown;
}

export class PowerEfficiencyCalculator {
  calculateCascadedEfficiency(powerLayers: PowerLayer[]): number {
    // Calculate cascaded efficiency through the power chain
    let totalEfficiency = 1.0;
    
    powerLayers.forEach(layer => {
      totalEfficiency *= layer.efficiency;
    });
    
    return totalEfficiency;
  }

  calculatePUE(itLoadKW: number, coolingLoadKW: number, otherLoadsKW: number): PUEResult {
    const totalLoad = itLoadKW + coolingLoadKW + otherLoadsKW;
    const pue = itLoadKW > 0 ? totalLoad / itLoadKW : 1.0;

    return {
      total: pue,
      breakdown: {
        itLoad: itLoadKW,
        coolingLoad: coolingLoadKW,
        otherLoads: otherLoadsKW,
        totalLoad
      }
    };
  }
}
