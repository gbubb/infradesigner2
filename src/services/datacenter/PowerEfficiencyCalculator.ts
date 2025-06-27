import type { 
  DatacenterFacility, 
  PowerLayer,
  PowerEfficiencyMetrics,
  PowerLayerUtilization,
  NonProductiveLoad
} from '@/types/infrastructure/datacenter-types';
import type { Rack } from '@/types/infrastructure';

export class PowerEfficiencyCalculator {
  private facility: DatacenterFacility;
  private racks: Rack[];

  constructor(facility: DatacenterFacility, racks: Rack[]) {
    this.facility = facility;
    this.racks = racks;
  }

  /**
   * Calculate comprehensive power efficiency metrics including PUE
   */
  calculateEfficiencyMetrics(): PowerEfficiencyMetrics {
    const itPowerKW = this.calculateITPower();
    const layerUtilizations = this.calculateLayerUtilizations(itPowerKW);
    const totalFacilityPower = this.calculateTotalFacilityPower(layerUtilizations);
    const nonProductivePower = this.calculateNonProductivePower();
    const totalPowerWithNonProductive = totalFacilityPower + nonProductivePower;
    
    const pue = itPowerKW > 0 ? totalPowerWithNonProductive / itPowerKW : 0;
    const dcie = pue > 0 ? 1 / pue : 0; // Data Center Infrastructure Efficiency
    
    return {
      pue,
      dcie,
      itPowerKW,
      totalFacilityPowerKW: totalPowerWithNonProductive,
      infrastructureOverheadKW: totalPowerWithNonProductive - itPowerKW,
      nonProductivePowerKW: nonProductivePower,
      layerEfficiencies: this.calculateLayerEfficiencies(),
      layerUtilizations,
      powerDistributionLosses: this.calculateDistributionLosses(layerUtilizations),
      criticalReserveKW: this.calculateCriticalReserve(),
      effectivePUE: this.calculateEffectivePUE(pue, layerUtilizations)
    };
  }

  /**
   * Calculate IT power consumption from all racks
   */
  private calculateITPower(): number {
    return this.racks.reduce((sum, rack) => {
      return sum + rack.placedComponents.reduce((rackSum, component) => {
        const powerW = component.power || 0;
        const quantity = component.quantity || 1;
        return rackSum + (powerW * quantity / 1000); // Convert to kW
      }, 0);
    }, 0);
  }

  /**
   * Calculate power utilization through each infrastructure layer
   */
  private calculateLayerUtilizations(itPowerKW: number): PowerLayerUtilization[] {
    const utilizations: PowerLayerUtilization[] = [];
    let currentPowerKW = itPowerKW;

    // Start from rack level and work up to grid
    const sortedLayers = this.sortLayersByHierarchy();
    
    for (const layer of sortedLayers) {
      const inputPowerKW = currentPowerKW / (layer.efficiency || 1);
      const lossesKW = inputPowerKW - currentPowerKW;
      const utilizationPercent = layer.capacityKW > 0 
        ? (inputPowerKW / layer.capacityKW) * 100 
        : 0;

      utilizations.push({
        layerId: layer.id,
        layerName: layer.name,
        inputPowerKW,
        outputPowerKW: currentPowerKW,
        lossesKW,
        efficiency: layer.efficiency || 1,
        capacityKW: layer.capacityKW,
        utilizationPercent,
        redundancyOverhead: this.calculateRedundancyOverhead(layer),
        isBottleneck: utilizationPercent > 80 // Flag potential bottlenecks
      });

      currentPowerKW = inputPowerKW;
    }

    return utilizations.reverse(); // Return in grid-to-rack order
  }

  /**
   * Sort power layers by hierarchy (rack to grid)
   */
  private sortLayersByHierarchy(): PowerLayer[] {
    const layerMap = new Map(this.facility.powerInfrastructure.map(l => [l.id, l]));
    const sorted: PowerLayer[] = [];
    const visited = new Set<string>();

    const visit = (layer: PowerLayer) => {
      if (visited.has(layer.id)) return;
      visited.add(layer.id);
      
      // Visit parent first (post-order traversal)
      if (layer.parentLayerId && layerMap.has(layer.parentLayerId)) {
        visit(layerMap.get(layer.parentLayerId)!);
      }
      
      sorted.push(layer);
    };

    // Start with leaf nodes (rack-level)
    this.facility.powerInfrastructure
      .filter(layer => !this.facility.powerInfrastructure.some(l => l.parentLayerId === layer.id))
      .forEach(visit);

    return sorted;
  }

  /**
   * Calculate total facility power from layer utilizations
   */
  private calculateTotalFacilityPower(utilizations: PowerLayerUtilization[]): number {
    if (utilizations.length === 0) return 0;
    
    // The grid input power is the total facility power
    const gridLayer = utilizations.find(u => u.layerName.toLowerCase().includes('grid')) 
      || utilizations[0];
    
    return gridLayer.inputPowerKW;
  }

  /**
   * Calculate non-productive power loads (lighting, security, etc.)
   */
  private calculateNonProductivePower(): number {
    if (!this.facility.nonProductiveLoads) return 0;
    
    return this.facility.nonProductiveLoads.reduce((sum, load) => {
      if (load.type === 'fixed') {
        return sum + load.powerKW;
      } else if (load.type === 'percentage') {
        const itPower = this.calculateITPower();
        return sum + (itPower * load.percentage / 100);
      }
      return sum;
    }, 0);
  }

  /**
   * Calculate efficiency of each power layer
   */
  private calculateLayerEfficiencies(): Array<{
    layerName: string;
    efficiency: number;
    annualEnergyLossMWh: number;
  }> {
    return this.facility.powerInfrastructure.map(layer => {
      const utilization = this.calculateLayerUtilizations(this.calculateITPower())
        .find(u => u.layerId === layer.id);
      
      const annualEnergyLossMWh = utilization 
        ? utilization.lossesKW * 24 * 365 / 1000 
        : 0;

      return {
        layerName: layer.name,
        efficiency: layer.efficiency || 1,
        annualEnergyLossMWh
      };
    });
  }

  /**
   * Calculate power distribution losses through the infrastructure
   */
  private calculateDistributionLosses(utilizations: PowerLayerUtilization[]): {
    totalLossesKW: number;
    lossPercentage: number;
    lossesByLayer: Array<{ layerName: string; lossKW: number }>;
  } {
    const totalLossesKW = utilizations.reduce((sum, u) => sum + u.lossesKW, 0);
    const gridPower = utilizations[0]?.inputPowerKW || 0;
    const lossPercentage = gridPower > 0 ? (totalLossesKW / gridPower) * 100 : 0;

    return {
      totalLossesKW,
      lossPercentage,
      lossesByLayer: utilizations.map(u => ({
        layerName: u.layerName,
        lossKW: u.lossesKW
      }))
    };
  }

  /**
   * Calculate critical power reserve based on redundancy configuration
   */
  private calculateCriticalReserve(): number {
    let totalReserve = 0;

    this.facility.powerInfrastructure.forEach(layer => {
      if (layer.redundancyConfig) {
        const { type, config } = layer.redundancyConfig;
        let reserveFactor = 0;

        switch (type) {
          case 'N+1':
            reserveFactor = 1 / (config.n || 1);
            break;
          case '2N':
            reserveFactor = 0.5;
            break;
          case '2N+1':
            reserveFactor = 0.5 + (1 / ((config.n || 1) * 2));
            break;
        }

        const layerReserve = layer.capacityKW * reserveFactor;
        totalReserve = Math.max(totalReserve, layerReserve);
      }
    });

    return totalReserve;
  }

  /**
   * Calculate redundancy overhead for a specific layer
   */
  private calculateRedundancyOverhead(layer: PowerLayer): number {
    if (!layer.redundancyConfig) return 0;

    const { type, config } = layer.redundancyConfig;
    
    switch (type) {
      case 'N+1':
        return 100 / (config.n || 1);
      case '2N':
        return 100;
      case '2N+1':
        return 100 + (100 / (config.n || 1));
      default:
        return 0;
    }
  }

  /**
   * Calculate effective PUE considering partial load efficiency
   */
  private calculateEffectivePUE(
    nominalPUE: number, 
    utilizations: PowerLayerUtilization[]
  ): number {
    // Account for reduced efficiency at partial loads
    const avgUtilization = utilizations.reduce((sum, u) => 
      sum + u.utilizationPercent, 0
    ) / utilizations.length;

    // Efficiency typically drops at low utilization
    const utilizationFactor = avgUtilization < 50 
      ? 1 + (50 - avgUtilization) / 100 
      : 1;

    return nominalPUE * utilizationFactor;
  }

  /**
   * Identify power capacity bottlenecks
   */
  identifyBottlenecks(targetUtilization: number = 80): Array<{
    layerName: string;
    currentUtilization: number;
    availableCapacityKW: number;
    maxAdditionalITLoadKW: number;
  }> {
    const metrics = this.calculateEfficiencyMetrics();
    const bottlenecks: Array<{
      layerName: string;
      currentUtilization: number;
      availableCapacityKW: number;
      maxAdditionalITLoadKW: number;
    }> = [];

    metrics.layerUtilizations.forEach((utilization, index) => {
      if (utilization.utilizationPercent > targetUtilization) {
        const availableCapacity = utilization.capacityKW - utilization.inputPowerKW;
        
        // Calculate how much IT load this translates to
        let efficiencyFactor = 1;
        for (let i = index + 1; i < metrics.layerUtilizations.length; i++) {
          efficiencyFactor *= metrics.layerUtilizations[i].efficiency;
        }
        
        bottlenecks.push({
          layerName: utilization.layerName,
          currentUtilization: utilization.utilizationPercent,
          availableCapacityKW: availableCapacity,
          maxAdditionalITLoadKW: availableCapacity * efficiencyFactor
        });
      }
    });

    return bottlenecks;
  }

  /**
   * Calculate carbon footprint based on power consumption and grid carbon intensity
   */
  calculateCarbonFootprint(
    carbonIntensityKgCO2PerMWh: number = 400
  ): {
    annualCarbonTonsCO2: number;
    carbonPerRackTonsCO2: number;
    carbonPerITkWTonsCO2: number;
  } {
    const metrics = this.calculateEfficiencyMetrics();
    const annualEnergyMWh = metrics.totalFacilityPowerKW * 24 * 365 / 1000;
    const annualCarbonTonsCO2 = annualEnergyMWh * carbonIntensityKgCO2PerMWh / 1000;
    
    const activeRacks = this.racks.filter(r => r.placedComponents.length > 0).length;
    const carbonPerRackTonsCO2 = activeRacks > 0 
      ? annualCarbonTonsCO2 / activeRacks 
      : 0;
    
    const carbonPerITkWTonsCO2 = metrics.itPowerKW > 0
      ? annualCarbonTonsCO2 / metrics.itPowerKW
      : 0;

    return {
      annualCarbonTonsCO2,
      carbonPerRackTonsCO2,
      carbonPerITkWTonsCO2
    };
  }
}