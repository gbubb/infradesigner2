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
}

// Remove hardcoded multipliers - now comes from calibration

// PSU Efficiency curves (based on 80 Plus certification requirements)
const PSU_EFFICIENCY: Record<string, (load: number) => number> = {
  '80Plus': (load) => load < 0.2 ? 0.75 : load > 0.8 ? 0.78 : 0.80,
  '80PlusBronze': (load) => load < 0.2 ? 0.78 : load > 0.8 ? 0.81 : 0.85,
  '80PlusSilver': (load) => load < 0.2 ? 0.80 : load > 0.8 ? 0.85 : 0.88,
  '80PlusGold': (load) => load < 0.2 ? 0.82 : load > 0.8 ? 0.87 : 0.90,
  '80PlusPlatinum': (load) => load < 0.2 ? 0.85 : load > 0.8 ? 0.89 : 0.92,
  '80PlusTitanium': (load) => load < 0.2 ? 0.90 : load > 0.8 ? 0.91 : 0.96
};

function getCpuArchitecture(cpuModel: string): string {
  const model = cpuModel.toLowerCase();
  if (model.includes('xeon')) return 'Intel Xeon';
  if (model.includes('epyc')) return 'AMD EPYC';
  if (model.includes('arm') || model.includes('graviton')) return 'ARM';
  return 'Default';
}

function calculateCpuPower(inputs: PowerCalculationInputs, calibration: PowerCalibrationProfile): { idle: number; average: number; peak: number } {
  const architecture = getCpuArchitecture(inputs.cpuModel);
  const multipliers = calibration.cpuArchitectureMultipliers[architecture] || calibration.cpuArchitectureMultipliers['Default'];
  
  // Defensive programming: use default multipliers if not found
  if (!multipliers) {
    console.warn(`CPU architecture multipliers not found for ${architecture}, using Default`);
    const defaultMultipliers = { idle: 0.15, peak: 1.05 };
    const totalTdp = inputs.tdpPerCpu * inputs.cpuCount;
    
    // Idle power
    const idlePower = totalTdp * calibration.cpuIdleMultiplier;
    
    // Dynamic power based on utilization with non-linear scaling
    const u = inputs.cpuUtilization / 100;
    const { linear, quadratic, cubic } = calibration.cpuDynamicCoefficients;
    const dynamicPower = totalTdp * (linear * u + quadratic * Math.pow(u, 2) + cubic * Math.pow(u, 3));
    
    // Turbo adjustment
    const turboAdjustment = inputs.turboEnabled ? totalTdp * calibration.cpuTurboMultiplier * calibration.cpuTurboProbability : 0;
    
    // Multi-core efficiency factor (decreases with more cores)
    const totalCores = inputs.cpuCount * inputs.coresPerCpu;
    const efficiencyFactor = calibration.cpuMulticoreEfficiencyBase - (calibration.cpuMulticoreEfficiencyDecay * totalCores);
    
    const averagePower = (idlePower + dynamicPower) * efficiencyFactor + turboAdjustment;
    const peakPower = totalTdp * defaultMultipliers.peak;
    
    return { idle: idlePower, average: averagePower, peak: peakPower };
  }
  
  const totalTdp = inputs.tdpPerCpu * inputs.cpuCount;
  
  // Idle power
  const idlePower = totalTdp * calibration.cpuIdleMultiplier;
  
  // Dynamic power based on utilization with non-linear scaling
  const u = inputs.cpuUtilization / 100;
  const { linear, quadratic, cubic } = calibration.cpuDynamicCoefficients;
  const dynamicPower = totalTdp * (linear * u + quadratic * Math.pow(u, 2) + cubic * Math.pow(u, 3));
  
  // Turbo adjustment
  const turboAdjustment = inputs.turboEnabled ? totalTdp * calibration.cpuTurboMultiplier * calibration.cpuTurboProbability : 0;
  
  // Multi-core efficiency factor (decreases with more cores)
  const totalCores = inputs.cpuCount * inputs.coresPerCpu;
  const efficiencyFactor = calibration.cpuMulticoreEfficiencyBase - (calibration.cpuMulticoreEfficiencyDecay * totalCores);
  
  const averagePower = (idlePower + dynamicPower) * efficiencyFactor + turboAdjustment;
  const peakPower = totalTdp * multipliers.peak;
  
  return { idle: idlePower, average: averagePower, peak: peakPower };
}

function calculateMemoryPower(inputs: PowerCalculationInputs, calibration: PowerCalibrationProfile): { idle: number; average: number; peak: number } {
  const memModel = calibration.memoryPowerModel;
  
  // Handle missing memoryPowerModel gracefully
  if (!memModel || !memModel.controllerBasePower || !memModel.chipsPerGB || !memModel.powerPerChip) {
    console.warn('Memory power model is missing from calibration profile');
    return {
      idle: 0,
      average: 0,
      peak: 0
    };
  }
  
  // Defensive programming: check if memory type exists in the model
  if (!memModel.controllerBasePower[inputs.memoryType] || 
      !memModel.powerPerChip[inputs.memoryType] || 
      !memModel.chipsPerGB[inputs.memoryType]) {
    console.warn(`Memory type ${inputs.memoryType} not found in calibration, using DDR4 defaults`);
    // Use DDR4 as fallback
    const fallbackType = 'DDR4' as const;
    const controllerPower = memModel.controllerBasePower[fallbackType] || 1.0;
    const chipsPerDimm = inputs.dimmCapacityGB * (memModel.chipsPerGB[fallbackType] || 0.5);
    const chipPower = chipsPerDimm * (memModel.powerPerChip[fallbackType] || 0.18);
    
    // Speed scaling (logarithmic)
    const baseSpeed = memModel.speedScaling?.baseSpeedMHz?.[fallbackType] || 2400;
    const speedRatio = inputs.memorySpeedMHz / baseSpeed;
    const speedMultiplier = Math.pow(speedRatio, memModel.speedScaling?.scalingExponent || 0.3);
    
    // Total power per DIMM at peak
    const peakPowerPerDimm = (controllerPower + chipPower) * speedMultiplier;
    
    // Apply activity multipliers
    const idlePowerPerDimm = peakPowerPerDimm * (memModel.activityMultipliers?.idle || 0.34);
    const avgPowerPerDimm = peakPowerPerDimm * (memModel.activityMultipliers?.average || 1.0);
    
    // Total for all DIMMs
    const totalIdle = inputs.dimmCount * idlePowerPerDimm;
    const totalAvg = inputs.dimmCount * avgPowerPerDimm;
    const totalPeak = inputs.dimmCount * peakPowerPerDimm;
    
    return {
      idle: totalIdle,
      average: totalAvg,
      peak: totalPeak
    };
  }
  
  // Calculate power per DIMM using chip-based model
  const controllerPower = memModel.controllerBasePower[inputs.memoryType] || 1.0;
  const chipsPerDimm = inputs.dimmCapacityGB * (memModel.chipsPerGB[inputs.memoryType] || 0.5);
  const chipPower = chipsPerDimm * (memModel.powerPerChip[inputs.memoryType] || 0.18);
  
  // Speed scaling (logarithmic)
  const baseSpeed = memModel.speedScaling?.baseSpeedMHz?.[inputs.memoryType] || 2400;
  const speedRatio = inputs.memorySpeedMHz / baseSpeed;
  const speedMultiplier = Math.pow(speedRatio, memModel.speedScaling?.scalingExponent || 0.3);
  
  // Total power per DIMM at peak
  const peakPowerPerDimm = (controllerPower + chipPower) * speedMultiplier;
  
  // Apply activity multipliers
  const idlePowerPerDimm = peakPowerPerDimm * (memModel.activityMultipliers?.idle || 0.34);
  const avgPowerPerDimm = peakPowerPerDimm * (memModel.activityMultipliers?.average || 1.0);
  
  // Total for all DIMMs
  const totalIdle = inputs.dimmCount * idlePowerPerDimm;
  const totalAvg = inputs.dimmCount * avgPowerPerDimm;
  const totalPeak = inputs.dimmCount * peakPowerPerDimm;
  
  return {
    idle: totalIdle,
    average: totalAvg,
    peak: totalPeak
  };
}

function calculateStoragePower(inputs: PowerCalculationInputs, calibration: PowerCalibrationProfile): { idle: number; average: number; peak: number } {
  let totalIdle = 0;
  let totalAverage = 0;
  let totalPeak = 0;
  
  // Defensive programming: check if storage calibration exists
  if (!calibration.storageBasePower || !calibration.storageActivityFactors) {
    console.warn('Storage calibration not found, using conservative defaults');
    // Conservative defaults
    const hddPower = 8; // 8W per HDD
    const ssdPower = 4; // 4W per SSD
    const nvmePower = 6; // 6W per NVMe
    
    inputs.hdds.forEach(hdd => {
      totalIdle += hdd.count * hddPower * 0.7;
      totalAverage += hdd.count * hddPower;
      totalPeak += hdd.count * hddPower * 1.2;
    });
    
    inputs.ssdSata.forEach(ssd => {
      totalIdle += ssd.count * ssdPower * 0.5;
      totalAverage += ssd.count * ssdPower;
      totalPeak += ssd.count * ssdPower * 1.5;
    });
    
    inputs.nvme.forEach(nvme => {
      totalIdle += nvme.count * nvmePower * 0.3;
      totalAverage += nvme.count * nvmePower;
      totalPeak += nvme.count * nvmePower * 1.8;
    });
    
    // RAID controller
    if (inputs.raidController) {
      totalIdle += 15;
      totalAverage += 25;
      totalPeak += 40;
    }
    
    return { idle: totalIdle, average: totalAverage, peak: totalPeak };
  }
  
  // HDDs
  inputs.hdds.forEach(hdd => {
    const basePower = calibration.storageBasePower.hddBase + (hdd.capacityTB * calibration.storageBasePower.hddCapacityScaling);
    const rpmPenalty = hdd.rpm > 10000 ? calibration.storageBasePower.hddRpmPenalty.rpm15000 : 
                      hdd.rpm > 7200 ? calibration.storageBasePower.hddRpmPenalty.rpm10000 : 
                      calibration.storageBasePower.hddRpmPenalty.rpm7200;
    const power = basePower + rpmPenalty;
    
    totalIdle += hdd.count * power * calibration.storageActivityFactors.hddIdle;
    totalAverage += hdd.count * power;
    totalPeak += hdd.count * power * calibration.storageActivityFactors.hddPeak;
  });
  
  // SATA SSDs
  inputs.ssdSata.forEach(ssd => {
    const power = calibration.storageBasePower.ssdSataBase + (ssd.capacityTB * calibration.storageBasePower.ssdSataCapacityScaling);
    
    totalIdle += ssd.count * power * calibration.storageActivityFactors.ssdIdle;
    totalAverage += ssd.count * power;
    totalPeak += ssd.count * power * calibration.storageActivityFactors.ssdPeak;
  });
  
  // NVMe SSDs
  inputs.nvme.forEach(nvme => {
    const genFactor = nvme.generation - 3; // 0 for Gen3, 1 for Gen4, 2 for Gen5
    const power = calibration.storageBasePower.nvmeBase + (genFactor * calibration.storageBasePower.nvmeGenScaling) + (nvme.capacityTB * calibration.storageBasePower.nvmeCapacityScaling);
    
    totalIdle += nvme.count * power * calibration.storageActivityFactors.nvmeIdle;
    totalAverage += nvme.count * power;
    totalPeak += nvme.count * power * calibration.storageActivityFactors.nvmePeak;
  });
  
  // RAID controller
  if (inputs.raidController) {
    totalIdle += calibration.raidControllerPower?.idle || 15;
    totalAverage += calibration.raidControllerPower?.average || 25;
    totalPeak += calibration.raidControllerPower?.peak || 40;
  }
  
  return { idle: totalIdle, average: totalAverage, peak: totalPeak };
}

function calculateNetworkPower(inputs: PowerCalculationInputs, calibration: PowerCalibrationProfile): { idle: number; average: number; peak: number } {
  let totalPower = 0;
  inputs.networkPorts.forEach(port => {
    const portPower = calibration.networkPowerBySpeed[port.speedGbps];
    if (portPower === undefined) {
      console.warn(`Network power not found for speed ${port.speedGbps}Gbps, using 10Gbps default`);
      totalPower += port.count * (calibration.networkPowerBySpeed[10] || 10);
    } else {
      totalPower += port.count * portPower;
    }
  });
  
  // Network power is relatively constant
  return {
    idle: totalPower * (calibration.networkActivityFactors?.idle || 0.9),
    average: totalPower,
    peak: totalPower * (calibration.networkActivityFactors?.peak || 1.1)
  };
}

function calculateOtherComponentsPower(inputs: PowerCalculationInputs, calibration: PowerCalibrationProfile): {
  motherboard: { idle: number; average: number; peak: number };
  fans: { idle: number; average: number; peak: number };
} {
  // Motherboard base power
  const motherboardBase = calibration.motherboardBasePower[inputs.formFactor];
  
  // Defensive programming: use default values if form factor not found
  if (motherboardBase === undefined) {
    console.warn(`Motherboard power not found for form factor ${inputs.formFactor}, using 2U defaults`);
    const defaultMotherboardBase = 45; // 2U default
    const bmcPower = calibration.bmcPower || 6;
    
    const motherboard = {
      idle: defaultMotherboardBase + bmcPower,
      average: defaultMotherboardBase + bmcPower,
      peak: defaultMotherboardBase + bmcPower
    };
    
    // Fan power (5-15% of total, varies by load)
    // This is calculated later based on total DC power
    const fans = { idle: 0, average: 0, peak: 0 };
    
    return { motherboard, fans };
  }
  
  // BMC/Management
  const bmcPower = calibration.bmcPower;
  
  const motherboard = {
    idle: motherboardBase + bmcPower,
    average: motherboardBase + bmcPower,
    peak: motherboardBase + bmcPower
  };
  
  // Fan power (5-15% of total, varies by load)
  // This is calculated later based on total DC power
  const fans = { idle: 0, average: 0, peak: 0 };
  
  return { motherboard, fans };
}

function calculateEnvironmentalFactor(inletTempC: number, calibration: PowerCalibrationProfile): number {
  return 1 + (calibration.tempCoefficientPerDegree * Math.max(0, inletTempC - calibration.tempBaselineC));
}

function calculateFanPower(formFactor: '1U' | '2U' | '4U', calibration: PowerCalibrationProfile): { idle: number; average: number; peak: number } {
  console.log('calculateFanPower called with:', { formFactor, calibration: calibration.name });
  console.log('fanPowerByFormFactor:', calibration.fanPowerByFormFactor);
  
  const fanPower = calibration.fanPowerByFormFactor[formFactor];
  console.log('fanPower for formFactor', formFactor, ':', fanPower);
  
  // Defensive programming: use default values if form factor not found
  if (!fanPower) {
    console.warn(`Fan power not found for form factor ${formFactor}, using 2U defaults`);
    console.warn('Available form factors:', Object.keys(calibration.fanPowerByFormFactor));
    const defaultFanPower = { idle: 40, peak: 100 };
    const average = defaultFanPower.idle + (defaultFanPower.peak - defaultFanPower.idle) * 0.5;
    return {
      idle: defaultFanPower.idle,
      average: average,
      peak: defaultFanPower.peak
    };
  }
  
  // Linear interpolation for average (50% between idle and peak)
  const average = fanPower.idle + (fanPower.peak - fanPower.idle) * 0.5;
  
  console.log('Fan power result:', { idle: fanPower.idle, average, peak: fanPower.peak });
  
  return {
    idle: fanPower.idle,
    average: average,
    peak: fanPower.peak
  };
}

function calculatePsuEfficiency(dcPower: number, psuRating: number, efficiencyRating: string, calibration: PowerCalibrationProfile): number {
  const loadPercentage = dcPower / psuRating;
  const loadPercent = loadPercentage * 100;
  
  // Check for calibration overrides
  if (calibration.psuEfficiencyOverrides && calibration.psuEfficiencyOverrides[efficiencyRating]) {
    const overrides = calibration.psuEfficiencyOverrides[efficiencyRating];
    
    // Check each range
    if (loadPercent >= 0 && loadPercent <= 20 && overrides['0-20']) {
      return overrides['0-20'];
    } else if (loadPercent > 20 && loadPercent <= 80 && overrides['20-80']) {
      return overrides['20-80'];
    } else if (loadPercent > 80 && loadPercent <= 100 && overrides['80-100']) {
      return overrides['80-100'];
    }
  }
  
  // Fall back to default curves
  const efficiencyFunc = PSU_EFFICIENCY[efficiencyRating];
  if (!efficiencyFunc) {
    console.warn(`PSU efficiency function not found for rating ${efficiencyRating}, using 80PlusGold`);
    return PSU_EFFICIENCY['80PlusGold'](loadPercentage);
  }
  return efficiencyFunc(loadPercentage);
}

export function calculateServerPower(inputs: PowerCalculationInputs, calibration?: PowerCalibrationProfile): PowerCalculationResult {
  console.log('calculateServerPower called with inputs:', inputs);
  console.log('calibration:', calibration);
  
  // Use provided calibration or create a complete default profile
  const cal = calibration || {
    ...DEFAULT_CALIBRATION_PROFILE,
    id: 'default',
    createdAt: new Date(),
    updatedAt: new Date()
  } as PowerCalibrationProfile;
  
  console.log('Using calibration:', cal.name);
  console.log('Form factor:', inputs.formFactor);
  
  // Validate inputs
  if (!inputs.cpuModel || inputs.cpuModel === 'Unknown') {
    console.warn('Specific CPU model not provided for accurate architecture detection');
  }
  
  if (inputs.tdpPerCpu === 0) {
    console.warn('Using estimated TDP based on core count');
    inputs.tdpPerCpu = inputs.coresPerCpu * 8; // Rough estimate
  }
  
  console.log('Starting component power calculations...');
  
  // Calculate component power
  const cpuPower = calculateCpuPower(inputs, cal);
  console.log('CPU power calculated:', cpuPower);
  
  const memoryPower = calculateMemoryPower(inputs, cal);
  console.log('Memory power calculated:', memoryPower);
  
  const storagePower = calculateStoragePower(inputs, cal);
  console.log('Storage power calculated:', storagePower);
  
  const networkPower = calculateNetworkPower(inputs, cal);
  console.log('Network power calculated:', networkPower);
  
  const { motherboard: motherboardPower } = calculateOtherComponentsPower(inputs, cal);
  console.log('Motherboard power calculated:', motherboardPower);
  
  // Calculate DC totals before fans
  const dcBeforeFans = {
    idle: cpuPower.idle + memoryPower.idle + storagePower.idle + networkPower.idle + motherboardPower.idle,
    average: cpuPower.average + memoryPower.average + storagePower.average + networkPower.average + motherboardPower.average,
    peak: cpuPower.peak + memoryPower.peak + storagePower.peak + networkPower.peak + motherboardPower.peak
  };
  console.log('DC before fans:', dcBeforeFans);
  
  // Calculate fan power based on form factor (absolute wattage)
  console.log('Calculating fan power for form factor:', inputs.formFactor);
  const fansPower = calculateFanPower(inputs.formFactor, cal);
  console.log('Fan power calculated:', fansPower);
  
  // Total DC power
  const dcTotal = {
    idle: dcBeforeFans.idle + fansPower.idle,
    average: dcBeforeFans.average + fansPower.average,
    peak: dcBeforeFans.peak + fansPower.peak
  };
  console.log('DC total:', dcTotal);
  
  // Apply environmental factor
  const envFactor = calculateEnvironmentalFactor(inputs.inletTempC, cal);
  const dcWithEnv = {
    idle: dcTotal.idle * envFactor,
    average: dcTotal.average * envFactor,
    peak: dcTotal.peak * envFactor
  };
  console.log('DC with environmental factor:', dcWithEnv);
  
  // Calculate AC power
  const psuEfficiencyIdle = calculatePsuEfficiency(dcWithEnv.idle, inputs.psuRating, inputs.psuEfficiencyRating, cal);
  const psuEfficiencyAvg = calculatePsuEfficiency(dcWithEnv.average, inputs.psuRating, inputs.psuEfficiencyRating, cal);
  const psuEfficiencyPeak = calculatePsuEfficiency(dcWithEnv.peak, inputs.psuRating, inputs.psuEfficiencyRating, cal);
  
  // Redundant PSU adjustment
  let efficiencyMultiplier = 1.0;
  if (inputs.redundantPsu) {
    // In load-balancing mode, both PSUs share the load, improving efficiency slightly
    // This increases the effective efficiency, not the power draw
    efficiencyMultiplier = cal.redundantPsuEfficiencyBonus;
  }
  
  const acTotal = {
    idle: dcWithEnv.idle / (psuEfficiencyIdle * efficiencyMultiplier),
    average: dcWithEnv.average / (psuEfficiencyAvg * efficiencyMultiplier),
    peak: dcWithEnv.peak / (psuEfficiencyPeak * efficiencyMultiplier)
  };
  console.log('AC total:', acTotal);
  
  // No safety margin - this is accounted for elsewhere in the datacenter
  const acWithSafety = {
    idle: acTotal.idle,
    average: acTotal.average,
    peak: acTotal.peak
  };
  
  const result = {
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
    }
  };
  
  console.log('Final result:', result);
  return result;
}