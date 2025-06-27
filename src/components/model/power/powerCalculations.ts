import { PowerCalibrationProfile, DEFAULT_CALIBRATION_PROFILE } from './powerCalibration';

export interface PowerCalculationInputs {
  // CPU
  cpuModel: string;
  cpuCount: number;
  coresPerCpu: number;
  baseFrequencyGHz: number;
  tdpPerCpu: number;
  turboEnabled: boolean;
  cpuUtilization: number; // 0-100%
  
  // Memory
  memoryType: 'DDR3' | 'DDR4' | 'DDR5';
  dimmCount: number;
  dimmCapacityGB: number;
  memorySpeedMHz: number;
  
  // Storage
  hdds: Array<{
    count: number;
    capacityTB: number;
    rpm: number;
  }>;
  ssdSata: Array<{
    count: number;
    capacityTB: number;
  }>;
  nvme: Array<{
    count: number;
    capacityTB: number;
    generation: 3 | 4 | 5;
  }>;
  raidController: boolean;
  
  // Network
  networkPorts: Array<{
    count: number;
    speedGbps: 1 | 10 | 25 | 40 | 100;
  }>;
  
  // PSU
  psuRating: number;
  psuEfficiencyRating: '80Plus' | '80PlusBronze' | '80PlusSilver' | '80PlusGold' | '80PlusPlatinum' | '80PlusTitanium';
  redundantPsu: boolean;
  
  // Environmental
  inletTempC: number;
  formFactor: '1U' | '2U' | '4U';
}

export interface PowerCalculationResult {
  idlePowerW: number;
  averagePowerW: number;
  peakPowerW: number;
  
  componentBreakdown: {
    cpu: { idle: number; average: number; peak: number };
    memory: { idle: number; average: number; peak: number };
    storage: { idle: number; average: number; peak: number };
    network: { idle: number; average: number; peak: number };
    motherboard: { idle: number; average: number; peak: number };
    fans: { idle: number; average: number; peak: number };
  };
  
  dcTotalW: { idle: number; average: number; peak: number };
  acTotalW: { idle: number; average: number; peak: number };
  psuEfficiency: { idle: number; average: number; peak: number };
  acTotalBeforeSafety: { idle: number; average: number; peak: number };
  
  warnings: string[];
  missingMetrics: string[];
}

export function calculateServerPower(inputs: PowerCalculationInputs, calibration?: PowerCalibrationProfile): PowerCalculationResult {
  // Validate inputs
  if (!inputs) {
    throw new Error('Power calculation inputs are required');
  }
  
  if (!inputs.cpuModel || inputs.cpuModel.trim() === '') {
    throw new Error('CPU model is required');
  }
  
  if (inputs.cpuCount <= 0) {
    throw new Error('CPU count must be greater than 0');
  }
  
  if (inputs.coresPerCpu <= 0) {
    throw new Error('Cores per CPU must be greater than 0');
  }
  
  if (inputs.tdpPerCpu <= 0) {
    throw new Error('CPU TDP must be greater than 0');
  }
  
  if (inputs.dimmCount <= 0) {
    throw new Error('DIMM count must be greater than 0');
  }
  
  if (inputs.dimmCapacityGB <= 0) {
    throw new Error('DIMM capacity must be greater than 0');
  }
  
  if (inputs.psuRating <= 0) {
    throw new Error('PSU rating must be greater than 0');
  }
  
  // Use provided calibration or default
  const cal = calibration || DEFAULT_CALIBRATION_PROFILE as PowerCalibrationProfile;
  
  if (!cal) {
    throw new Error('No calibration profile available');
  }
  
  const warnings: string[] = [];
  const missingMetrics: string[] = [];
  
  try {
    // Validate inputs
    if (!inputs.cpuModel || inputs.cpuModel === 'Unknown') {
      missingMetrics.push('Specific CPU model for accurate architecture detection');
    }
    
    if (inputs.tdpPerCpu === 0) {
      missingMetrics.push('CPU TDP (Thermal Design Power) rating');
      warnings.push('Using estimated TDP based on core count');
      inputs.tdpPerCpu = inputs.coresPerCpu * 8; // Rough estimate
    }
    
    // Calculate component power with error handling
    const cpuPower = calculateCpuPower(inputs, cal);
    const memoryPower = calculateMemoryPower(inputs, cal);
    const storagePower = calculateStoragePower(inputs, cal);
    const networkPower = calculateNetworkPower(inputs, cal);
    const { motherboard: motherboardPower } = calculateOtherComponentsPower(inputs, cal);
    
    // Validate calculated values
    if (!cpuPower || cpuPower.idle < 0 || cpuPower.average < 0 || cpuPower.peak < 0) {
      throw new Error('Invalid CPU power calculation result');
    }
    
    if (!memoryPower || memoryPower.idle < 0 || memoryPower.average < 0 || memoryPower.peak < 0) {
      throw new Error('Invalid memory power calculation result');
    }
    
    // Calculate DC totals before fans
    const dcBeforeFans = {
      idle: cpuPower.idle + memoryPower.idle + storagePower.idle + networkPower.idle + motherboardPower.idle,
      average: cpuPower.average + memoryPower.average + storagePower.average + networkPower.average + motherboardPower.average,
      peak: cpuPower.peak + memoryPower.peak + storagePower.peak + networkPower.peak + motherboardPower.peak
    };
    
    // Calculate fan power based on form factor (absolute wattage)
    const fansPower = calculateFanPower(inputs.formFactor, cal);
    
    // Total DC power
    const dcTotal = {
      idle: dcBeforeFans.idle + fansPower.idle,
      average: dcBeforeFans.average + fansPower.average,
      peak: dcBeforeFans.peak + fansPower.peak
    };
    
    // Apply environmental factor
    const envFactor = calculateEnvironmentalFactor(inputs.inletTempC, cal);
    const dcWithEnv = {
      idle: dcTotal.idle * envFactor,
      average: dcTotal.average * envFactor,
      peak: dcTotal.peak * envFactor
    };
    
    // Calculate AC power
    const psuEfficiencyIdle = calculatePsuEfficiency(dcWithEnv.idle, inputs.psuRating, inputs.psuEfficiencyRating, cal);
    const psuEfficiencyAvg = calculatePsuEfficiency(dcWithEnv.average, inputs.psuRating, inputs.psuEfficiencyRating, cal);
    const psuEfficiencyPeak = calculatePsuEfficiency(dcWithEnv.peak, inputs.psuRating, inputs.psuEfficiencyRating, cal);
    
    // Validate PSU efficiency values
    if (psuEfficiencyIdle <= 0 || psuEfficiencyAvg <= 0 || psuEfficiencyPeak <= 0) {
      throw new Error('Invalid PSU efficiency calculation');
    }
    
    // Redundant PSU adjustment
    let efficiencyMultiplier = 1.0;
    if (inputs.redundantPsu) {
      // In load-balancing mode, both PSUs share the load, improving efficiency slightly
      // This increases the effective efficiency, not the power draw
      efficiencyMultiplier = cal.redundantPsuEfficiencyBonus;
      warnings.push('Redundant PSU configuration assumed to be in load-balancing mode');
    }
    
    const acTotal = {
      idle: dcWithEnv.idle / (psuEfficiencyIdle * efficiencyMultiplier),
      average: dcWithEnv.average / (psuEfficiencyAvg * efficiencyMultiplier),
      peak: dcWithEnv.peak / (psuEfficiencyPeak * efficiencyMultiplier)
    };
    
    // No safety margin - this is accounted for elsewhere in the datacenter
    const acWithSafety = {
      idle: acTotal.idle,
      average: acTotal.average,
      peak: acTotal.peak
    };
    
    // Additional validations and warnings
    if (inputs.cpuUtilization > 80) {
      warnings.push('High CPU utilization may result in thermal throttling');
    }
    
    if (dcWithEnv.peak > inputs.psuRating * 0.8) {
      warnings.push('Peak power exceeds 80% of PSU rating - consider higher capacity PSU');
    }
    
    if (inputs.inletTempC > 30) {
      warnings.push('High inlet temperature will increase fan power consumption');
    }
    
    // Missing metrics that would improve accuracy
    if (!inputs.turboEnabled) {
      missingMetrics.push('Turbo boost frequency and probability data');
    }
    
    if (inputs.networkPorts.length === 0) {
      missingMetrics.push('Network port configuration');
    }
    
    missingMetrics.push('Specific workload profile (CPU vs memory vs I/O intensive)');
    missingMetrics.push('Ambient humidity levels');
    missingMetrics.push('Altitude/air pressure for fan efficiency');
    
    return {
      idlePowerW: Math.round(acWithSafety.idle),
      averagePowerW: Math.round(acWithSafety.average),
      peakPowerW: Math.round(acWithSafety.peak),
      
      componentBreakdown: {
        cpu: {
          idle: Math.round(cpuPower.idle),
          average: Math.round(cpuPower.average),
          peak: Math.round(cpuPower.peak)
        },
        memory: {
          idle: Math.round(memoryPower.idle),
          average: Math.round(memoryPower.average),
          peak: Math.round(memoryPower.peak)
        },
        storage: {
          idle: Math.round(storagePower.idle),
          average: Math.round(storagePower.average),
          peak: Math.round(storagePower.peak)
        },
        network: {
          idle: Math.round(networkPower.idle),
          average: Math.round(networkPower.average),
          peak: Math.round(networkPower.peak)
        },
        motherboard: {
          idle: Math.round(motherboardPower.idle),
          average: Math.round(motherboardPower.average),
          peak: Math.round(motherboardPower.peak)
        },
        fans: {
          idle: Math.round(fansPower.idle),
          average: Math.round(fansPower.average),
          peak: Math.round(fansPower.peak)
        }
      },
      
      dcTotalW: {
        idle: Math.round(dcWithEnv.idle),
        average: Math.round(dcWithEnv.average),
        peak: Math.round(dcWithEnv.peak)
      },
      
      acTotalW: {
        idle: Math.round(acWithSafety.idle),
        average: Math.round(acWithSafety.average),
        peak: Math.round(acWithSafety.peak)
      },
      
      psuEfficiency: {
        idle: psuEfficiencyIdle,
        average: psuEfficiencyAvg,
        peak: psuEfficiencyPeak
      },
      
      acTotalBeforeSafety: {
        idle: Math.round(acTotal.idle),
        average: Math.round(acTotal.average),
        peak: Math.round(acTotal.peak)
      },
      
      warnings,
      missingMetrics
    };
  } catch (error) {
    console.error('Error in power calculation:', error);
    throw new Error(`Power calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
