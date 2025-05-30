import { DesignRequirements } from './requirements-types';

export interface ScenarioParameter {
  computeScale: number;           // Multiplier for compute capacity
  storageScale: number;           // Multiplier for storage capacity
  utilization: number;            // Resource utilization percentage (0-100)
  availabilityZones: number;      // Number of availability zones
  rackQuantity: number;           // Total number of racks
  networkRedundancy: number;      // Network redundancy factor
  powerEfficiency: number;        // Power efficiency factor (PUE-related)
  deviceLifespan: {
    compute: number;
    storage: number;
    network: number;
  };
}

export interface TcoResults {
  totalMonthlyCost: number;       // Total monthly operational cost
  tcoPerVM: number;               // TCO per VM unit
  costPerTB: number;              // Cost per TB of storage
  vmCapacity: number;             // Total VM capacity
  storageCapacity: number;        // Total storage capacity in TB
  costBreakdown: {
    hardware: number;             // Amortized hardware costs
    energy: number;               // Energy costs
    rack: number;                 // Rack/colocation costs
    licensing: number;            // Licensing costs
    network: number;              // Network infrastructure costs
  };
  utilizationMetrics: {
    computeUtilization: number;   // Actual compute utilization %
    storageUtilization: number;   // Actual storage utilization %
  };
}

export interface TcoScenario {
  id: string;
  name: string;
  description: string;
  baseRequirements: DesignRequirements;
  parameters: ScenarioParameter;
  results: TcoResults | null;
} 