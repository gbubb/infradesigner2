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
  
  // Fan Power Scaling
  fanPowerFactors: {
    idle: number; // Default: 0.05 (5% of total)
    average: number; // Default: 0.10 (10% of total)
    peak: number; // Default: 0.15 (15% of total)
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

// Default calibration profile
export const DEFAULT_CALIBRATION_PROFILE: Omit<PowerCalibrationProfile, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Default Profile',
  description: 'Standard calibration parameters based on industry research',
  
  cpuIdleMultiplier: 0.15,
  cpuDynamicCoefficients: {
    linear: 0.4,
    quadratic: 0.5,
    cubic: 0.1
  },
  cpuTurboMultiplier: 0.3,
  cpuTurboProbability: 0.5,
  cpuMulticoreEfficiencyBase: 0.95,
  cpuMulticoreEfficiencyDecay: 0.001,
  
  cpuArchitectureMultipliers: {
    'Intel Xeon': { idle: 0.15, peak: 1.35 },
    'AMD EPYC': { idle: 0.12, peak: 1.2 },
    'ARM': { idle: 0.1, peak: 0.9 },
    'Default': { idle: 0.15, peak: 1.3 }
  },
  
  memoryPowerModel: {
    controllerBasePower: {
      DDR3: 1.2,
      DDR4: 1.0,
      DDR5: 0.8
    },
    powerPerChip: {
      DDR3: 0.25,
      DDR4: 0.18,
      DDR5: 0.135  // Calibrated to match 96GB = 3.85W under load
    },
    chipsPerGB: {
      DDR3: 1.0,
      DDR4: 0.5,
      DDR5: 0.25
    },
    activityMultipliers: {
      idle: 0.34,   // 34% matches 1.32W idle for 96GB
      average: 1.0,  // "Under load" typically means peak
      peak: 1.0
    },
    speedScaling: {
      baseSpeedMHz: {
        DDR3: 1600,
        DDR4: 2400,
        DDR5: 4800
      },
      scalingExponent: 0.3
    }
  },
  memoryConservativeMultiplier: 5,
  
  storageBasePower: {
    hddBase: 6,
    hddCapacityScaling: 0.25,
    hddRpmPenalty: {
      rpm7200: 0,
      rpm10000: 1,
      rpm15000: 2
    },
    ssdSataBase: 3,
    ssdSataCapacityScaling: 0.1,
    nvmeBase: 5,
    nvmeGenScaling: 2,
    nvmeCapacityScaling: 0.2
  },
  storageActivityFactors: {
    hddIdle: 0.7,
    hddPeak: 1.2,
    ssdIdle: 0.5,
    ssdPeak: 1.5,
    nvmeIdle: 0.3,
    nvmePeak: 1.8
  },
  raidControllerPower: {
    idle: 15,
    average: 25,
    peak: 40
  },
  
  networkPowerBySpeed: {
    1: 4,
    10: 10,
    25: 8,
    40: 15,
    100: 20
  },
  networkActivityFactors: {
    idle: 0.9,
    peak: 1.1
  },
  
  motherboardBasePower: {
    '1U': 30,
    '2U': 45,
    '4U': 60
  },
  bmcPower: 6,
  
  fanPowerFactors: {
    idle: 0.05,
    average: 0.10,
    peak: 0.15
  },
  
  tempCoefficientPerDegree: 0.004,
  tempBaselineC: 20,
  
  psuEfficiencyOverrides: {
    '80Plus': {
      '0-20': 0.75,
      '20-80': 0.80,
      '80-100': 0.78
    },
    '80PlusBronze': {
      '0-20': 0.78,
      '20-80': 0.85,
      '80-100': 0.81
    },
    '80PlusSilver': {
      '0-20': 0.80,
      '20-80': 0.88,
      '80-100': 0.85
    },
    '80PlusGold': {
      '0-20': 0.82,
      '20-80': 0.90,
      '80-100': 0.87
    },
    '80PlusPlatinum': {
      '0-20': 0.85,
      '20-80': 0.92,
      '80-100': 0.89
    },
    '80PlusTitanium': {
      '0-20': 0.88,
      '20-80': 0.94,
      '80-100': 0.90
    }
  },
  
  redundantPsuEfficiencyBonus: 0.98,
  safetyMarginPercent: 15
};

// Storage functions
export function saveCalibrationProfile(profile: PowerCalibrationProfile): void {
  const profiles = getCalibrationProfiles();
  const index = profiles.findIndex(p => p.id === profile.id);
  
  if (index >= 0) {
    profiles[index] = { ...profile, updatedAt: new Date() };
  } else {
    profiles.push(profile);
  }
  
  localStorage.setItem('powerCalibrationProfiles', JSON.stringify(profiles));
}

export function getCalibrationProfiles(): PowerCalibrationProfile[] {
  const stored = localStorage.getItem('powerCalibrationProfiles');
  if (!stored) return [];
  
  try {
    const profiles = JSON.parse(stored);
    // Convert date strings back to Date objects
    return profiles.map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt)
    }));
  } catch {
    return [];
  }
}

export function deleteCalibrationProfile(id: string): void {
  const profiles = getCalibrationProfiles().filter(p => p.id !== id);
  localStorage.setItem('powerCalibrationProfiles', JSON.stringify(profiles));
}

export function getActiveCalibrationProfile(): PowerCalibrationProfile | null {
  const activeId = localStorage.getItem('activeCalibrationProfileId');
  if (!activeId) return null;
  
  const profiles = getCalibrationProfiles();
  return profiles.find(p => p.id === activeId) || null;
}

export function setActiveCalibrationProfile(id: string | null): void {
  if (id) {
    localStorage.setItem('activeCalibrationProfileId', id);
  } else {
    localStorage.removeItem('activeCalibrationProfileId');
  }
}