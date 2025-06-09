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
  
  warnings: string[];
  missingMetrics: string[];
}

// CPU Architecture multipliers
const CPU_ARCHITECTURE_MULTIPLIERS: Record<string, { idle: number; peak: number }> = {
  'Intel Xeon': { idle: 0.15, peak: 1.35 },
  'AMD EPYC': { idle: 0.12, peak: 1.2 },
  'ARM': { idle: 0.1, peak: 0.9 },
  'Default': { idle: 0.15, peak: 1.3 }
};

// PSU Efficiency curves
const PSU_EFFICIENCY: Record<string, (load: number) => number> = {
  '80Plus': (load) => load < 0.2 ? 0.75 : load > 0.8 ? 0.78 : 0.80,
  '80PlusBronze': (load) => load < 0.2 ? 0.78 : load > 0.8 ? 0.81 : 0.85,
  '80PlusSilver': (load) => load < 0.2 ? 0.80 : load > 0.8 ? 0.85 : 0.88,
  '80PlusGold': (load) => load < 0.2 ? 0.82 : load > 0.8 ? 0.87 : 0.90,
  '80PlusPlatinum': (load) => load < 0.2 ? 0.85 : load > 0.8 ? 0.89 : 0.92,
  '80PlusTitanium': (load) => load < 0.2 ? 0.88 : load > 0.8 ? 0.90 : 0.94
};

function getCpuArchitecture(cpuModel: string): string {
  const model = cpuModel.toLowerCase();
  if (model.includes('xeon')) return 'Intel Xeon';
  if (model.includes('epyc')) return 'AMD EPYC';
  if (model.includes('arm') || model.includes('graviton')) return 'ARM';
  return 'Default';
}

function calculateCpuPower(inputs: PowerCalculationInputs): { idle: number; average: number; peak: number } {
  const architecture = getCpuArchitecture(inputs.cpuModel);
  const multipliers = CPU_ARCHITECTURE_MULTIPLIERS[architecture];
  
  const totalTdp = inputs.tdpPerCpu * inputs.cpuCount;
  
  // Idle power (10-20% of TDP)
  const idlePower = totalTdp * multipliers.idle;
  
  // Dynamic power based on utilization with non-linear scaling
  const u = inputs.cpuUtilization / 100;
  const dynamicPower = totalTdp * (0.4 * u + 0.5 * Math.pow(u, 2) + 0.1 * Math.pow(u, 3));
  
  // Turbo adjustment
  const turboAdjustment = inputs.turboEnabled ? totalTdp * 0.3 * 0.5 : 0; // 50% turbo probability
  
  // Multi-core efficiency factor (decreases with more cores)
  const totalCores = inputs.cpuCount * inputs.coresPerCpu;
  const efficiencyFactor = 0.95 - (0.001 * totalCores);
  
  const averagePower = (idlePower + dynamicPower) * efficiencyFactor + turboAdjustment;
  const peakPower = totalTdp * multipliers.peak;
  
  return { idle: idlePower, average: averagePower, peak: peakPower };
}

function calculateMemoryPower(inputs: PowerCalculationInputs): { idle: number; average: number; peak: number } {
  // Base power per DIMM type
  const basePowerPerDimm = {
    'DDR3': 4.0,
    'DDR4': 3.0,
    'DDR5': 2.4
  };
  
  const basePower = basePowerPerDimm[inputs.memoryType] * (inputs.dimmCapacityGB / 8);
  
  // Speed factor
  const baseSpeed = inputs.memoryType === 'DDR3' ? 1600 : inputs.memoryType === 'DDR4' ? 2133 : 3200;
  const speedFactor = (inputs.memorySpeedMHz - baseSpeed) / baseSpeed * 0.15;
  
  // Capacity factor
  const capacityFactor = (inputs.dimmCapacityGB - 8) * 0.008;
  
  const powerPerDimm = basePower * (1 + speedFactor + capacityFactor);
  const totalPower = inputs.dimmCount * powerPerDimm;
  
  // Conservative estimate: use 5W per DIMM for planning
  const conservativePower = inputs.dimmCount * 5;
  
  return {
    idle: totalPower * 0.8,
    average: Math.max(totalPower, conservativePower),
    peak: Math.max(totalPower * 1.2, conservativePower * 1.2)
  };
}

function calculateStoragePower(inputs: PowerCalculationInputs): { idle: number; average: number; peak: number } {
  let totalIdle = 0;
  let totalAverage = 0;
  let totalPeak = 0;
  
  // HDDs
  inputs.hdds.forEach(hdd => {
    const basePower = 6 + (hdd.capacityTB * 0.25);
    const rpmPenalty = hdd.rpm > 10000 ? 2 : hdd.rpm > 7200 ? 1 : 0;
    const power = basePower + rpmPenalty;
    
    totalIdle += hdd.count * power * 0.7;
    totalAverage += hdd.count * power;
    totalPeak += hdd.count * power * 1.2;
  });
  
  // SATA SSDs
  inputs.ssdSata.forEach(ssd => {
    const power = 3 + (ssd.capacityTB * 0.1);
    
    totalIdle += ssd.count * power * 0.5;
    totalAverage += ssd.count * power;
    totalPeak += ssd.count * power * 1.5;
  });
  
  // NVMe SSDs
  inputs.nvme.forEach(nvme => {
    const genFactor = nvme.generation - 3; // 0 for Gen3, 1 for Gen4, 2 for Gen5
    const power = 5 + (genFactor * 2) + (nvme.capacityTB * 0.2);
    
    totalIdle += nvme.count * power * 0.3;
    totalAverage += nvme.count * power;
    totalPeak += nvme.count * power * 1.8;
  });
  
  // RAID controller
  if (inputs.raidController) {
    totalIdle += 15;
    totalAverage += 25;
    totalPeak += 40;
  }
  
  return { idle: totalIdle, average: totalAverage, peak: totalPeak };
}

function calculateNetworkPower(inputs: PowerCalculationInputs): { idle: number; average: number; peak: number } {
  const powerBySpeed: Record<number, number> = {
    1: 4,
    10: 10,
    25: 8,
    40: 15,
    100: 20
  };
  
  let totalPower = 0;
  inputs.networkPorts.forEach(port => {
    totalPower += port.count * powerBySpeed[port.speedGbps];
  });
  
  // Network power is relatively constant
  return {
    idle: totalPower * 0.9,
    average: totalPower,
    peak: totalPower * 1.1
  };
}

function calculateOtherComponentsPower(inputs: PowerCalculationInputs): {
  motherboard: { idle: number; average: number; peak: number };
  fans: { idle: number; average: number; peak: number };
} {
  // Motherboard base power
  const motherboardBase = inputs.formFactor === '4U' ? 60 : inputs.formFactor === '2U' ? 45 : 30;
  
  // BMC/Management
  const bmcPower = 6;
  
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

function calculateEnvironmentalFactor(inletTempC: number): number {
  // 0.4% increase per degree C above 20°C
  return 1 + (0.004 * Math.max(0, inletTempC - 20));
}

function calculatePsuEfficiency(dcPower: number, psuRating: number, efficiencyRating: string): number {
  const loadPercentage = dcPower / psuRating;
  const efficiencyFunc = PSU_EFFICIENCY[efficiencyRating];
  return efficiencyFunc(loadPercentage);
}

export function calculateServerPower(inputs: PowerCalculationInputs): PowerCalculationResult {
  const warnings: string[] = [];
  const missingMetrics: string[] = [];
  
  // Validate inputs
  if (!inputs.cpuModel || inputs.cpuModel === 'Unknown') {
    missingMetrics.push('Specific CPU model for accurate architecture detection');
  }
  
  if (inputs.tdpPerCpu === 0) {
    missingMetrics.push('CPU TDP (Thermal Design Power) rating');
    warnings.push('Using estimated TDP based on core count');
    inputs.tdpPerCpu = inputs.coresPerCpu * 8; // Rough estimate
  }
  
  // Calculate component power
  const cpuPower = calculateCpuPower(inputs);
  const memoryPower = calculateMemoryPower(inputs);
  const storagePower = calculateStoragePower(inputs);
  const networkPower = calculateNetworkPower(inputs);
  const { motherboard: motherboardPower } = calculateOtherComponentsPower(inputs);
  
  // Calculate DC totals before fans
  const dcBeforeFans = {
    idle: cpuPower.idle + memoryPower.idle + storagePower.idle + networkPower.idle + motherboardPower.idle,
    average: cpuPower.average + memoryPower.average + storagePower.average + networkPower.average + motherboardPower.average,
    peak: cpuPower.peak + memoryPower.peak + storagePower.peak + networkPower.peak + motherboardPower.peak
  };
  
  // Calculate fan power (5-15% of total)
  const fansPower = {
    idle: dcBeforeFans.idle * 0.05,
    average: dcBeforeFans.average * 0.10,
    peak: dcBeforeFans.peak * 0.15
  };
  
  // Total DC power
  const dcTotal = {
    idle: dcBeforeFans.idle + fansPower.idle,
    average: dcBeforeFans.average + fansPower.average,
    peak: dcBeforeFans.peak + fansPower.peak
  };
  
  // Apply environmental factor
  const envFactor = calculateEnvironmentalFactor(inputs.inletTempC);
  const dcWithEnv = {
    idle: dcTotal.idle * envFactor,
    average: dcTotal.average * envFactor,
    peak: dcTotal.peak * envFactor
  };
  
  // Calculate AC power
  const psuEfficiencyIdle = calculatePsuEfficiency(dcWithEnv.idle, inputs.psuRating, inputs.psuEfficiencyRating);
  const psuEfficiencyAvg = calculatePsuEfficiency(dcWithEnv.average, inputs.psuRating, inputs.psuEfficiencyRating);
  const psuEfficiencyPeak = calculatePsuEfficiency(dcWithEnv.peak, inputs.psuRating, inputs.psuEfficiencyRating);
  
  // Redundant PSU adjustment
  let redundantPsuFactor = 1.0;
  if (inputs.redundantPsu) {
    // In load-balancing mode, both PSUs share the load, improving efficiency slightly
    redundantPsuFactor = 0.98; // 2% efficiency improvement
    warnings.push('Redundant PSU configuration assumed to be in load-balancing mode');
  }
  
  const acTotal = {
    idle: (dcWithEnv.idle / psuEfficiencyIdle) * redundantPsuFactor,
    average: (dcWithEnv.average / psuEfficiencyAvg) * redundantPsuFactor,
    peak: (dcWithEnv.peak / psuEfficiencyPeak) * redundantPsuFactor
  };
  
  // Apply safety margin (15%)
  const safetyMargin = 1.15;
  const acWithSafety = {
    idle: acTotal.idle,
    average: acTotal.average * safetyMargin,
    peak: acTotal.peak * safetyMargin
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
    
    warnings,
    missingMetrics
  };
}