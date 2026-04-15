export interface DatacenterFacility {
  id: string;
  name: string;
  location: string;
  description?: string;
  hierarchyConfig: HierarchyLevel[];
  powerInfrastructure: PowerLayer[];
  costLayers: CostLayer[];
  constraints: FacilityConstraints;
  nonProductiveLoads?: NonProductiveLoad[];
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
  config?: {
    n?: number;
  };
}

export interface CostLayer {
  id: string;
  name: string;
  category: CostCategory;
  type: 'capital' | 'operational';
  amount: number;
  currency: string;
  amortisationMonths?: number; // For capital costs
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
  facilityName?: string;
  totalCapitalCost: number;
  totalOperationalCost: number;
  monthlyAmortisedCapital?: number;
  monthlyOperational?: number;
  totalMonthlyCost: number;
  costPerRack: number;
  costPerKW: number;
  costPerAllocatedRack?: number;
  costPerAllocatedKW?: number;
  utilizationMetrics?: {
    rackUtilization: number;
    powerUtilization: number;
    totalRackCount: number;
    allocatedRackCount: number;
    totalPowerCapacityKW: number;
    allocatedPowerKW: number;
  };
  costLayerBreakdowns?: CostLayerBreakdown[];
  rackAllocations?: RackCostAllocation[];
  breakdown?: {
    byCategory: Record<CostCategory, number>;
    byLayer: CostLayerBreakdown[];
  };
  utilization?: {
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
  type?: CostLayer['type'];
  totalAmount?: number;
  monthlyAmount: number;
  perRackAmount?: number;
  perKWAmount?: number;
  allocationMethod?: AllocationMethod;
  amortisationMonths?: number;
  currency?: string;
  // Legacy/alternative fields retained for downstream consumers
  monthlyCost?: number;
  percentageOfTotal?: number;
  allocatedToRacks?: Record<string, number>;
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
  coolingEfficiency?: number;
  distributionEfficiency?: number;
  totalLosses?: number; // kW lost in distribution
  efficiencyByLayer?: Record<string, number>; // layerId -> efficiency
  itPowerKW?: number;
  totalFacilityPowerKW?: number;
  infrastructureOverheadKW?: number;
  nonProductivePowerKW?: number;
  layerEfficiencies?: Array<{
    layerName: string;
    efficiency: number;
    annualEnergyLossMWh: number;
  }>;
  layerUtilizations?: PowerLayerUtilization[];
  powerDistributionLosses?: {
    totalLossesKW: number;
    lossPercentage: number;
    lossesByLayer: Array<{ layerName: string; lossKW: number }>;
  };
  criticalReserveKW?: number;
  effectivePUE?: number;
}

export interface PowerLayerUtilization {
  layerId: string;
  layerName: string;
  inputPowerKW: number;
  outputPowerKW: number;
  lossesKW: number;
  efficiency: number;
  capacityKW: number;
  utilizationPercent: number;
  redundancyOverhead: number;
  isBottleneck: boolean;
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
  category?: 'cooling' | 'lighting' | 'security' | 'other';
  powerKW: number;
  isVariable?: boolean; // true if load varies with IT load
  variabilityFactor?: number; // e.g., 0.3 for cooling that scales at 30% of IT load
  type?: 'fixed' | 'percentage';
  percentage?: number;
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

// Capacity management types used by CapacityManagementService
export interface HierarchyCapacityNode {
  id: string;
  name: string;
  type: string;
  totalCapacity: {
    racks: number;
    powerKW: number;
    coolingKW: number;
  };
  usedCapacity: {
    racks: number;
    powerKW: number;
    coolingKW: number;
  };
  utilization: number;
  children: HierarchyCapacityNode[];
}

export interface CapacityConstraint {
  type: 'power' | 'space' | 'cooling' | 'network';
  severity: 'warning' | 'critical';
  currentUtilization: number;
  thresholdPercent: number;
  availableCapacity: number;
  recommendedAction: string;
  impactedHierarchy: string[];
}

export interface CapacityMetrics {
  facilityId: string;
  facilityName: string;
  lastUpdated: string;
  powerCapacity: {
    totalKW: number;
    usedKW: number;
    availableKW: number;
    utilization: number;
    criticalReserveKW: number;
    effectiveAvailableKW: number;
  };
  spaceCapacity: {
    totalRacks: number;
    usedRacks: number;
    availableRacks: number;
    utilization: number;
    totalRU: number;
    usedRU: number;
    availableRU: number;
  };
  coolingCapacity: {
    totalKW: number;
    usedKW: number;
    availableKW: number;
    utilization: number;
    coolingEfficiency: number;
  };
  networkCapacity: {
    totalPorts: number;
    usedPorts: number;
    availablePorts: number;
    utilization: number;
    portsBySpeed: Record<string, { total: number; used: number }>;
  };
  hierarchyCapacity: HierarchyCapacityNode;
  constraints: CapacityConstraint[];
  overallUtilization: number;
  expansionPotential: {
    maxAdditionalRacks: number;
    maxAdditionalPowerKW: number;
    limitingFactor: 'power' | 'space' | 'cooling' | 'none';
    expansionCost?: number;
  };
}

export interface ExpansionScenario {
  name: string;
  description: string;
  capitalCost: number;
  timelineMonths: number;
  additionalCapacity: {
    racks: number;
    powerKW: number;
    coolingKW: number;
  };
  newConstraints: CapacityConstraint[];
  roi: {
    paybackMonths: number;
    npv: number;
    irr: number;
  };
}