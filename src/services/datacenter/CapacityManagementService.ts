
export interface UtilizationMetrics {
  rackUtilization: number;
  powerUtilization: number;
  overallUtilization: number;
  availableRacks: number;
  availablePowerKW: number;
}

export class CapacityManagementService {
  calculateUtilization(
    usedRacks: number,
    totalRacks: number,
    usedPowerKW: number,
    totalPowerKW: number
  ): UtilizationMetrics {
    const rackUtilization = totalRacks > 0 ? (usedRacks / totalRacks) * 100 : 0;
    const powerUtilization = totalPowerKW > 0 ? (usedPowerKW / totalPowerKW) * 100 : 0;
    const overallUtilization = Math.max(rackUtilization, powerUtilization);

    return {
      rackUtilization,
      powerUtilization,
      overallUtilization,
      availableRacks: totalRacks - usedRacks,
      availablePowerKW: totalPowerKW - usedPowerKW
    };
  }
}
