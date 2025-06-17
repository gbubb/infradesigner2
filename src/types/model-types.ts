// Model and Analysis Types

export interface ClusterAnalysis {
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
  costBreakdown: {
    compute?: {
      hardwareCost: number;
      deviceCount: number;
      amortizationPeriod: number;
    };
    storage?: {
      hardwareCost: number;
      deviceCount: number;
      amortizationPeriod: number;
    };
    network: {
      totalCost: number;
      deviceShare: number;
      totalDevices: number;
    };
    rack: {
      totalCost: number;
      ruShare: number;
      totalRU: number;
    };
    energy: {
      totalCost: number;
      powerShare: number;
      totalPower: number;
    };
    licensing: {
      totalCost: number;
      deviceShare: number;
      totalDevices: number;
    };
  };
  revenue: number;
  profit: number;
  profitMargin: number;
  costPerUnit: number;
  pricePerUnit: number;
  currentUnits: number;
  maxUnits: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

export interface PowerCapacityData {
  name: string;
  capacity: number;
  loss: number;
  efficiency: number;
  utilization: number;
  isBottleneck?: boolean;
  isUsage?: boolean;
}

export interface CalibrationProfile {
  id: string;
  name: string;
  type: 'cpu' | 'memory' | 'network' | 'storage' | 'system';
  values: Record<string, number>;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalibrationTabProps {
  profiles: CalibrationProfile[];
  onSave: (profile: CalibrationProfile) => void;
  onDelete: (profileId: string) => void;
  onApply: (profile: CalibrationProfile) => void;
}

export interface MemoryPowerData {
  dimms: number;
  powerPerDimm: number;
  totalPower: number;
  memoryType: string;
}