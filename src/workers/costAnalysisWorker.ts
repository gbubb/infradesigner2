import type { PlacedComponent, InfrastructureDesign } from '@/types/infrastructure';

interface CostAnalysisRequest {
  design: InfrastructureDesign;
  components: PlacedComponent[];
  options?: {
    includeOperational?: boolean;
    years?: number;
    powerCostPerKwh?: number;
  };
}

interface CostBreakdown {
  componentId: string;
  componentName: string;
  unitCost: number;
  quantity: number;
  totalCost: number;
  category: string;
  vendor?: string;
}

interface OperationalCost {
  powerCost: number;
  coolingCost: number;
  maintenanceCost: number;
  totalOperational: number;
}

interface CostAnalysisResult {
  capitalExpenditure: {
    total: number;
    byCategory: Record<string, number>;
    byVendor: Record<string, number>;
    breakdown: CostBreakdown[];
  };
  operationalExpenditure?: {
    yearly: OperationalCost;
    total: OperationalCost;
    years: number;
  };
  totalCostOfOwnership?: number;
}

/**
 * Calculate comprehensive cost analysis for the design
 */
function calculateCostAnalysis(
  design: InfrastructureDesign, 
  components: PlacedComponent[],
  options: CostAnalysisRequest['options'] = {}
): CostAnalysisResult {
  const { includeOperational = false, years = 3, powerCostPerKwh = 0.10 } = options;
  
  // Calculate Capital Expenditure (CapEx)
  const breakdown: CostBreakdown[] = [];
  const byCategory: Record<string, number> = {};
  const byVendor: Record<string, number> = {};
  let totalCapex = 0;

  for (const component of components) {
    const unitCost = component.price || 0;
    const quantity = component.quantity || 1;
    const totalCost = unitCost * quantity;
    const category = component.type || 'Other';
    const vendor = component.vendor || 'Unknown';

    breakdown.push({
      componentId: component.id,
      componentName: component.name,
      unitCost,
      quantity,
      totalCost,
      category,
      vendor
    });

    byCategory[category] = (byCategory[category] || 0) + totalCost;
    byVendor[vendor] = (byVendor[vendor] || 0) + totalCost;
    totalCapex += totalCost;
  }

  const result: CostAnalysisResult = {
    capitalExpenditure: {
      total: totalCapex,
      byCategory,
      byVendor,
      breakdown
    }
  };

  // Calculate Operational Expenditure (OpEx) if requested
  if (includeOperational) {
    // Calculate total power consumption
    let totalPowerKw = 0;
    for (const component of components) {
      if (component.specifications?.powerConsumption) {
        const power = component.specifications.powerConsumption;
        const quantity = component.quantity || 1;
        totalPowerKw += (power * quantity) / 1000; // Convert W to kW
      }
    }

    // Apply PUE for cooling overhead
    const pue = design.specifications?.pue || 1.5;
    const totalPowerWithCooling = totalPowerKw * pue;
    const coolingPowerKw = totalPowerWithCooling - totalPowerKw;

    // Calculate yearly costs
    const hoursPerYear = 8760; // 24 * 365
    const yearlyPowerCost = totalPowerKw * hoursPerYear * powerCostPerKwh;
    const yearlyCoolingCost = coolingPowerKw * hoursPerYear * powerCostPerKwh;
    
    // Estimate maintenance as percentage of CapEx
    const maintenanceRate = 0.05; // 5% of CapEx per year
    const yearlyMaintenanceCost = totalCapex * maintenanceRate;

    const yearlyOperational: OperationalCost = {
      powerCost: yearlyPowerCost,
      coolingCost: yearlyCoolingCost,
      maintenanceCost: yearlyMaintenanceCost,
      totalOperational: yearlyPowerCost + yearlyCoolingCost + yearlyMaintenanceCost
    };

    result.operationalExpenditure = {
      yearly: yearlyOperational,
      total: {
        powerCost: yearlyOperational.powerCost * years,
        coolingCost: yearlyOperational.coolingCost * years,
        maintenanceCost: yearlyOperational.maintenanceCost * years,
        totalOperational: yearlyOperational.totalOperational * years
      },
      years
    };

    // Calculate Total Cost of Ownership (TCO)
    result.totalCostOfOwnership = totalCapex + result.operationalExpenditure.total.totalOperational;
  }

  return result;
}

// Web Worker message handler
self.onmessage = (event: MessageEvent<CostAnalysisRequest>) => {
  try {
    const { design, components, options } = event.data;
    
    // Validate input
    if (!design || !components) {
      throw new Error('Invalid input: design and components are required');
    }

    // Perform cost analysis
    const result = calculateCostAnalysis(design, components, options);
    
    // Send result back to main thread
    self.postMessage({ status: 'success', result });
  } catch (error) {
    console.error('[CostAnalysisWorker] Error during cost analysis:', error);
    self.postMessage({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error in cost analysis' 
    });
  }
};

export {}; // Make this a module