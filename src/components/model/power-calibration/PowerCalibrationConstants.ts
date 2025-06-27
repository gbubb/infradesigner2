import { PowerCalibrationProfile } from './PowerCalibrationTypes';

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
    'Intel Xeon': { idle: 0.15, peak: 1.0 },
    'AMD EPYC': { idle: 0.12, peak: 1.0 },
    'ARM': { idle: 0.1, peak: 0.9 },
    'Default': { idle: 0.15, peak: 1.0 }
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
  
  fanPowerByFormFactor: {
    '1U': { idle: 24, peak: 96 },     // 1U: 96W peak, 24W idle (1/4 of peak)
    '2U': { idle: 11.25, peak: 45 },  // 2U: 45W peak, 11.25W idle (1/4 of peak)
    '4U': { idle: 50, peak: 150 }     // 4U: 50-150W for 4U servers (unchanged)
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
      '0-20': 0.90,
      '20-80': 0.96,
      '80-100': 0.91
    }
  },
  
  redundantPsuEfficiencyBonus: 0.98,
  safetyMarginPercent: 15
};