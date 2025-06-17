/**
 * Type definitions for design comparison functionality
 */

/**
 * Metrics calculated from a design for comparison purposes
 */
export interface DesignMetrics {
  // Cost metrics
  totalCost: number;
  costPerVCPU: number;
  costPerTB: number;
  monthlyCost: number;
  monthlyCostPerAverageVM: number;
  
  // Resource metrics
  totalVCPUs: number;
  totalMemoryTB: number;
  totalStorageTB: number;
  
  // Power metrics
  totalPower: number;
  minimumPower: number;
  operationalPower: number;
  maximumPower: number;
  
  // Operational costs
  energyCostMonthly: number;
  rackCostMonthly: number;
  amortizedCostMonthly: number;
  
  // Utilization metrics
  networkUtilization: number;
  storageUtilization: number;
}

/**
 * Significant differences between design metrics
 */
export interface SignificantDifferences {
  totalCost: boolean;
  costPerVCPU: boolean;
  costPerTB: boolean;
  totalPower: boolean;
  totalVCPUs: boolean;
  totalMemoryTB: boolean;
  totalStorageTB: boolean;
  monthlyCost: boolean;
  monthlyCostPerAverageVM: boolean;
}

/**
 * Component costs breakdown by category
 */
export interface ComponentCostsByType {
  compute: number;
  storage: number;
  network: number;
  cabling: number;
  operational: number;
}

/**
 * Additional metrics for designs
 */
export interface AdditionalDesignMetrics {
  rackUnits: number;
  usableStorageTB: number;
}

/**
 * Resource metrics for radar chart visualization
 */
export interface ResourceMetrics {
  vCPUs: number;
  memoryTB: number;
  storageTB: number;
  powerKW: number;
  rackUnits: number;
}

/**
 * Efficiency metrics calculated from resource utilization
 */
export interface EfficiencyMetrics {
  cpuPerRU: number;
  tbPerRU: number;
  cpuPerKW: number;
}

/**
 * Custom tooltip payload for Recharts
 */
export interface ChartTooltipPayload {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
    name?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
}

/**
 * Server component with extended properties
 */
export interface ServerComponentExtended {
  cpuCoresPerSocket?: number;
  cpuSockets?: number;
  memoryCapacity?: number;
  clusterInfo?: {
    clusterId: string;
  };
  attachedDisks?: Array<{
    capacityTB: number;
    quantity?: number;
  }>;
}

/**
 * Disk component with extended properties
 */
export interface DiskComponentExtended {
  capacityTB?: number;
}

/**
 * Storage pool efficiency factors
 */
export const StoragePoolEfficiencyFactors: Record<string, number> = {
  '3 Replica': 0.33333,
  '2 Replica': 0.5,
  'Erasure Coding 4+2': 0.66666,
  'Erasure Coding 8+3': 0.72727,
  'Erasure Coding 6+3': 0.66666,
  'Erasure Coding 10+4': 0.71429,
};

/**
 * Props for custom label rendering in pie charts
 */
export interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  index: number;
}

/**
 * Extended tooltip payload entry for charts
 */
export interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
  name?: string;
  payload?: {
    category?: string;
    total?: number;
    [key: string]: unknown;
  };
}

/**
 * Format types for value display
 */
export type FormatType = 'standard' | 'currency' | 'decimal' | 'power';

/**
 * Better direction for metric comparison
 */
export type BetterDirection = 'lower' | 'higher';