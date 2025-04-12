
// Power usage tiers
export interface PowerUsage {
  minimumPower: number;
  operationalPower: number;
  maximumPower: number;
  totalAvailablePower?: number;
  networkRack?: {
    minimumPower: number;
    operationalPower: number;
    maximumPower: number;
    availablePower: number;
  };
  computeRack?: {
    minimumPower: number;
    operationalPower: number;
    maximumPower: number;
    availablePower: number;
  };
}

// Cost analysis breakdown
export interface CostBreakdown {
  capitalCost: number;
  operationalCost: {
    racksMonthly: number;
    energyMonthly: number;
    amortizedMonthly: number;
    totalMonthly: number;
  };
  total: number;
}
