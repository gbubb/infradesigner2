import type { InfrastructureDesign } from '@/types/infrastructure';
import type { PlacedComponent } from '@/types/placement';

interface PowerCalculationRequest {
  design: InfrastructureDesign;
  components: PlacedComponent[];
}

interface PowerBreakdown {
  componentId: string;
  componentName: string;
  powerUsage: number;
  quantity: number;
  totalPower: number;
  category: string;
}

interface RackPowerSummary {
  rackId: string;
  rackName: string;
  totalPower: number;
  components: PowerBreakdown[];
}

interface PowerCalculationResult {
  totalPower: number;
  byCategory: Record<string, number>;
  byRack: RackPowerSummary[];
  breakdown: PowerBreakdown[];
}

/**
 * Calculate power consumption for all components
 */
function calculatePowerConsumption(design: InfrastructureDesign, components: PlacedComponent[]): PowerCalculationResult {
  const breakdown: PowerBreakdown[] = [];
  const byCategory: Record<string, number> = {};
  const byRack: Record<string, RackPowerSummary> = {};
  let totalPower = 0;

  // Process each placed component
  for (const placed of components) {
    const component = placed.component as unknown as Record<string, unknown> | undefined;
    const specifications = component?.specifications as { powerConsumption?: number } | undefined;
    if (!specifications?.powerConsumption) continue;

    const power = specifications.powerConsumption;
    const quantity = placed.quantity || 1;
    const totalComponentPower = power * quantity;
    const category = (component?.type as string | undefined) || 'Other';
    const componentName = (component?.name as string | undefined) || placed.id;
    const rackId = placed.metadata?.rack_id;

    // Add to breakdown
    breakdown.push({
      componentId: placed.id,
      componentName,
      powerUsage: power,
      quantity,
      totalPower: totalComponentPower,
      category
    });

    // Add to category totals
    byCategory[category] = (byCategory[category] || 0) + totalComponentPower;

    // Add to rack totals if component has rack assignment
    if (rackId) {
      if (!byRack[rackId]) {
        byRack[rackId] = {
          rackId,
          rackName: `Rack ${rackId}`,
          totalPower: 0,
          components: []
        };
      }
      byRack[rackId].totalPower += totalComponentPower;
      byRack[rackId].components.push({
        componentId: placed.id,
        componentName,
        powerUsage: power,
        quantity,
        totalPower: totalComponentPower,
        category
      });
    }

    totalPower += totalComponentPower;
  }

  // Apply PUE if specified
  const designSpecs = (design as unknown as { specifications?: { pue?: number } }).specifications;
  const pue = designSpecs?.pue || 1.0;
  const adjustedTotalPower = totalPower * pue;

  // Adjust all values by PUE
  for (const category in byCategory) {
    byCategory[category] *= pue;
  }
  for (const rackId in byRack) {
    byRack[rackId].totalPower *= pue;
    byRack[rackId].components.forEach(comp => {
      comp.totalPower *= pue;
    });
  }
  breakdown.forEach(item => {
    item.totalPower *= pue;
  });

  return {
    totalPower: adjustedTotalPower,
    byCategory,
    byRack: Object.values(byRack),
    breakdown
  };
}

// Web Worker message handler
self.onmessage = (event: MessageEvent<PowerCalculationRequest>) => {
  try {
    const { design, components } = event.data;
    
    // Validate input
    if (!design || !components) {
      throw new Error('Invalid input: design and components are required');
    }

    // Perform power calculations
    const result = calculatePowerConsumption(design, components);
    
    // Send result back to main thread
    self.postMessage({ status: 'success', result });
  } catch (error) {
    console.error('[PowerCalculationWorker] Error during power calculation:', error);
    self.postMessage({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error in power calculation' 
    });
  }
};

export {}; // Make this a module