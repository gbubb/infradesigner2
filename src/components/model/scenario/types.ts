export interface ClusterAnalysisData {
  name: string;
  type: 'compute' | 'storage';
  consumption: number;
  deviceCount: number;
  costs: {
    compute?: number;
    storage?: number;
    network: number;
    rack: number;
    energy: number;
    licensing: number;
    total: number;
  };
  revenue: number;
  profit: number;
  profitMargin: number;
  costPerUnit: number;
  pricePerUnit: number;
  currentUnits: number;
  maxUnits: number;
}

export interface ScenarioTabProps {
  clusterAnalysis: Record<string, ClusterAnalysisData>;
  computePricing: Array<{
    clusterId: string;
    clusterName: string;
    pricePerMonth: number;
  }>;
  storagePricing: Array<{
    clusterId: string;
    clusterName: string;
    pricePerMonth: number;
  }>;
  operationalCosts: {
    totalMonthly: number;
    amortizedMonthly: number;
    networkMonthly: number;
    racksMonthly: number;
    energyMonthly: number;
    licensingMonthly: number;
  };
  storageClustersMetrics: Array<{
    id: string;
    usableCapacityTiB: number;
  }>;
}

export interface ClusterParams {
  startUtilization: number;
  targetUtilization: number;
  growthModel: 'compound' | 'logistic' | 'phased';
  // Logistic growth parameters
  inflectionMonth?: number;
  growthRate?: number;
  // Phased growth parameters
  phase1Duration?: number;
  phase1Rate?: number;
  phase2Duration?: number;
  phase2Rate?: number;
  phase3Rate?: number;
  // Storage specific
  overallocationRatio?: number;
}

export interface ScenarioDataPoint {
  week: number;
  month: number;
  monthDisplay: number;
  totalRevenue: number;
  totalCosts: number;
  profit: number;
  margin: number;
  cumulativeRevenue?: number;
  cumulativeProfit?: number;
  [key: string]: number | undefined; // For dynamic cluster utilization keys
}

export interface ClusterMetrics {
  utilization: number;
  revenue: number;
  cost: number;
  units: number;
}