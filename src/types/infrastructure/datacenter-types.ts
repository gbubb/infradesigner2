
export interface DatacenterFacility {
  id: string;
  name: string;
  location: string;
  description?: string;
  hierarchyConfig: HierarchyLevel[];
  powerInfrastructure: PowerLayer[];
  costLayers: CostLayer[];
  constraints: FacilityConstraints;
  metadata?: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
  };
}

export interface HierarchyLevel {
  id: string;
  name: string; // e.g., "Building", "Floor", "Hall", "Pod", "Row"
  parentId?: string;
  level: number; // 0 for root, 1 for first child, etc.
  customAttributes?: Record<string, unknown>;
  capacity?: {
    racks?: number;
    powerKW?: number;
  };
  // Rack assignment tracking
  assignedRacks?: number;
  actualPowerKw?: number;
  rackCapacity?: {
    standard?: number;
    highDensity?: number;
  };
}

export interface PowerLayer {
  id: string;
  name: string; // e.g., "Grid Input", "UPS", "PDU", "Rack"
  type: 'grid' | 'ups' | 'generator' | 'switchgear' | 'pdu' | 'panel' | 'rack';
  capacityKW: number;
  efficiency: number; // 0-1 (e.g., 0.95 for 95% efficient)
  redundancyConfig?: RedundancyConfig;
  parentLayerId?: string;
  metadata?: {
    manufacturer?: string;
    model?: string;
    installDate?: string;
  };
}

export interface RedundancyConfig {
  type: 'N' | 'N+1' | '2N' | '2N+1' | 'custom';
  customConfig?: {
    active: number;
    redundant: number;
  };
}

export interface CostLayer {
  id: string;
  name: string;
  category: CostCategory;
  type: 'capital' | 'operational';
  amount: number;
  currency: string;
  amortizationMonths?: number; // For capital costs
  frequency?: 'monthly' | 'quarterly' | 'annual' | 'one-time'; // For operational costs
  allocationMethod: AllocationMethod;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export type CostCategory = 
  | 'real-estate'
  | 'building-facility' 
  | 'power-infrastructure'
  | 'cooling-infrastructure'
  | 'it-infrastructure'
  | 'network-connectivity'
  | 'security'
  | 'operations'
  | 'maintenance'
  | 'utilities'
  | 'other';

export type AllocationMethod = 
  | 'per-rack' 
  | 'per-kw' 
  | 'hybrid' 
  | 'fixed' 
  | 'percentage';

export interface AllocationConfig {
  method: AllocationMethod;
  hybridRatio?: {
    rackWeight: number; // 0-1
    powerWeight: number; // 0-1, should sum to 1 with rackWeight
  };
  percentageConfig?: {
    distribution: Record<string, number>; // e.g., {"compute": 0.7, "storage": 0.3}
  };
}

export interface FacilityConstraints {
  maxRacks: number;
  maxPowerKW: number;
  maxCoolingKW: number;
  maxWeightPerRackKg?: number;
  maxHeightRackU?: number;
  availabilityTier?: 'I' | 'II' | 'III' | 'IV'; // Uptime Institute tiers
  certifications?: string[];
}

export interface FacilityCostBreakdown {
  facilityId: string;
  totalCapitalCost: number;
  totalOperationalCost: number;
  monthlyAmortizedCapital: number;
  monthlyOperational: number;
  totalMonthlyCost: number;
  costPerRack: number;
  costPerKW: number;
  breakdown: {
    byCategory: Record<CostCategory, number>;
    byLayer: CostLayerBreakdown[];
  };
  utilization: {
    racksUsed: number;
    racksTotal: number;
    powerUsedKW: number;
    powerTotalKW: number;
    utilizationPercentage: number;
  };
}

export interface CostLayerBreakdown {
  layerId: string;
  layerName: string;
  monthlyCost: number;
  percentageOfTotal: number;
  allocatedToRacks: Record<string, number>; // rackId -> cost
}

export interface RackCostAllocation {
  rackId: string;
  rackName: string;
  hierarchyPath: string[];
  hierarchyLevelId: string;
  costs: {
    capital: {
      monthly: number;
      breakdown: Record<CostCategory, number>;
    };
    operational: {
      monthly: number;
      breakdown: Record<CostCategory, number>;
    };
    total: {
      monthly: number;
      perU: number; // Cost per rack unit
      perKw: number; // Cost per kW allocated
    };
  };
  utilization: {
    powerAllocatedKw: number;
    powerUsedKw: number;
    usedU: number;
    totalU: number;
  };
}

export interface FacilityRackStats {
  totalRacks: number;
  assignedRacks: number;
  unassignedRacks: number;
  totalPowerAllocatedKw: number;
  totalPowerUsedKw: number;
  averagePowerPerRack: number;
  racksByHierarchy: Record<string, number>; // hierarchyLevelId -> count
  costPerRack: {
    average: number;
    min: number;
    max: number;
    standardDeviation: number;
  };
}

export interface CostAllocation {
  layerId: string;
  layerName: string;
  type: 'capital' | 'operational';
  monthlyAmount: number;
  allocationMethod: AllocationMethod;
  allocatedByRack: number;
  allocatedByPower: number;
}

export interface PowerEfficiencyMetrics {
  pue: number; // Power Usage Effectiveness
  dcie: number; // Data Center Infrastructure Efficiency (1/PUE)
  coolingEfficiency: number;
  distributionEfficiency: number;
  totalLosses: number; // kW lost in distribution
  efficiencyByLayer: Record<string, number>; // layerId -> efficiency
}

export interface FacilityUtilization {
  facilityId: string;
  timestamp: string;
  power: {
    allocated: number;
    used: number;
    available: number;
    reservedForRedundancy: number;
  };
  space: {
    racksAllocated: number;
    racksUsed: number;
    racksAvailable: number;
  };
  bottlenecks: BottleneckInfo[];
}

export interface BottleneckInfo {
  layer: string;
  type: 'power' | 'space' | 'cooling' | 'network';
  severity: 'warning' | 'critical';
  currentUtilization: number;
  maxCapacity: number;
  message: string;
}

export interface DatacenterDesignMapping {
  designId: string;
  facilityId: string;
  hierarchyPath: string[]; // IDs from root to specific location
  allocatedPowerKW: number;
  allocatedRacks: number;
  startDate?: string;
  endDate?: string;
}

export interface NonProductiveLoad {
  id: string;
  name: string;
  category: 'cooling' | 'lighting' | 'security' | 'other';
  powerKW: number;
  isVariable: boolean; // true if load varies with IT load
  variabilityFactor?: number; // e.g., 0.3 for cooling that scales at 30% of IT load
}

export interface FacilityTemplate {
  id: string;
  name: string;
  description: string;
  hierarchyTemplate: HierarchyLevel[];
  powerTemplate: PowerLayer[];
  costTemplate: CostLayer[];
  constraintTemplate: FacilityConstraints;
  isPublic: boolean;
  tags: string[];
}
