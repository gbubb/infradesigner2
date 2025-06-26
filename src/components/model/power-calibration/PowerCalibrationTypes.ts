export interface PowerCalibrationProfile {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // CPU Calibration Parameters
  cpuIdleMultiplier: number; // Default: 0.15
  cpuDynamicCoefficients: {
    linear: number;    // Default: 0.4
    quadratic: number; // Default: 0.5
    cubic: number;     // Default: 0.1
  };
  cpuTurboMultiplier: number; // Default: 0.3
  cpuTurboProbability: number; // Default: 0.5
  cpuMulticoreEfficiencyBase: number; // Default: 0.95
  cpuMulticoreEfficiencyDecay: number; // Default: 0.001
  
  // Architecture-specific multipliers
  cpuArchitectureMultipliers: {
    [architecture: string]: {
      idle: number;
      peak: number;
    };
  };
  
  // Memory Calibration Parameters - Redesigned for accurate non-linear modeling
  memoryPowerModel: {
    // Base controller power (fixed per DIMM regardless of capacity)
    controllerBasePower: {
      DDR3: number; // Default: 1.2W
      DDR4: number; // Default: 1.0W 
      DDR5: number; // Default: 0.8W
    };
    // Power per memory chip/die
    powerPerChip: {
      DDR3: number; // Default: 0.25W per chip
      DDR4: number; // Default: 0.18W per chip
      DDR5: number; // Default: 0.12W per chip
    };
    // Chips per GB of capacity
    chipsPerGB: {
      DDR3: number; // Default: 1.0 (8Gb chips)
      DDR4: number; // Default: 0.5 (16Gb chips)
      DDR5: number; // Default: 0.25 (32Gb chips)
    };
    // Activity multipliers
    activityMultipliers: {
      idle: number; // Default: 0.35
      average: number; // Default: 0.70
      peak: number; // Default: 1.0
    };
    // Speed scaling (logarithmic)
    speedScaling: {
      baseSpeedMHz: {
        DDR3: number; // Default: 1600
        DDR4: number; // Default: 2400
        DDR5: number; // Default: 4800
      };
      scalingExponent: number; // Default: 0.3 (logarithmic scaling)
    };
  };
  memoryConservativeMultiplier: number; // Default: 5W per DIMM (legacy/override)
  
  // Storage Calibration Parameters
  storageBasePower: {
    hddBase: number; // Default: 6W
    hddCapacityScaling: number; // Default: 0.25W per TB
    hddRpmPenalty: {
      rpm7200: number; // Default: 0W
      rpm10000: number; // Default: 1W
      rpm15000: number; // Default: 2W
    };
    ssdSataBase: number; // Default: 3W
    ssdSataCapacityScaling: number; // Default: 0.1W per TB
    nvmeBase: number; // Default: 5W
    nvmeGenScaling: number; // Default: 2W per generation
    nvmeCapacityScaling: number; // Default: 0.2W per TB
  };
  storageActivityFactors: {
    hddIdle: number; // Default: 0.7
    hddPeak: number; // Default: 1.2
    ssdIdle: number; // Default: 0.5
    ssdPeak: number; // Default: 1.5
    nvmeIdle: number; // Default: 0.3
    nvmePeak: number; // Default: 1.8
  };
  raidControllerPower: {
    idle: number; // Default: 15W
    average: number; // Default: 25W
    peak: number; // Default: 40W
  };
  
  // Network Calibration Parameters
  networkPowerBySpeed: {
    1: number;   // Default: 4W
    10: number;  // Default: 10W
    25: number;  // Default: 8W
    40: number;  // Default: 15W
    100: number; // Default: 20W
  };
  networkActivityFactors: {
    idle: number; // Default: 0.9
    peak: number; // Default: 1.1
  };
  
  // System Components
  motherboardBasePower: {
    '1U': number; // Default: 30W
    '2U': number; // Default: 45W
    '4U': number; // Default: 60W
  };
  bmcPower: number; // Default: 6W
  
  // Fan Power by Form Factor (absolute wattage)
  fanPowerByFormFactor: {
    '1U': { idle: number; peak: number; };
    '2U': { idle: number; peak: number; };
    '4U': { idle: number; peak: number; };
  };
  
  // Environmental Factors
  tempCoefficientPerDegree: number; // Default: 0.004
  tempBaselineC: number; // Default: 20°C
  
  // PSU Efficiency Curves
  psuEfficiencyOverrides?: {
    [rating: string]: {
      [loadRange: string]: number; // e.g., "0-20": 0.75, "20-80": 0.90
    };
  };
  redundantPsuEfficiencyBonus: number; // Default: 0.98
  
  // Safety Margins
  safetyMarginPercent: number; // Default: 15
  
  // Validation Data (for tracking accuracy)
  validationData?: {
    serverModel: string;
    observedPower: {
      idle: number;
      average: number;
      peak: number;
    };
    predictedPower: {
      idle: number;
      average: number;
      peak: number;
    };
    accuracy: {
      idle: number; // percentage
      average: number;
      peak: number;
    };
  }[];
}

export interface PowerCalibrationSectionProps {
  onCalibrationChange: (profile: PowerCalibrationProfile | null) => void;
}