/**
 * Cost Calculation Helpers
 *
 * Pure functions for calculating costs in design simulations.
 * These are extracted from useCostAnalysis to enable standalone calculations
 * without React hooks or store dependencies.
 */

import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import { DesignRequirements } from '@/types/infrastructure';

/**
 * Result of a cost calculation
 */
export interface CostCalculationResult {
  // Capital costs
  capitalCost: number;
  computeCapitalCost: number;
  storageCapitalCost: number;
  networkCapitalCost: number;

  // Monthly costs
  monthlyOperationalCost: number;
  monthlyFacilityCost: number;
  monthlyEnergyCost: number;
  monthlyAmortizedCost: number;
  monthlyLicensingCost: number;

  // Amortization breakdown
  computeAmortized: number;
  storageAmortized: number;
  networkAmortized: number;

  // One-time costs
  oneTimeLicensingCost: number;
}

/**
 * Calculate total capital cost including hardware and one-time licensing
 */
export const calculateCapitalCost = (
  components: InfrastructureComponent[],
  oneTimeLicensingCost: number = 0
): number => {
  if (!components || components.length === 0) return 0;

  const hardwareCost = components.reduce((total, component) => {
    let componentTotalCost = component.cost;

    // Add costs of attached disks if present
    if ('attachedDisks' in component && Array.isArray(component.attachedDisks)) {
      const attachedDisks = component.attachedDisks as Array<InfrastructureComponent & { quantity?: number }>;
      const disksCost = attachedDisks.reduce((diskTotal, disk) => {
        const diskQuantity = disk.quantity || 1;
        return diskTotal + (disk.cost * diskQuantity);
      }, 0);
      componentTotalCost += disksCost;
    }

    return total + componentTotalCost;
  }, 0);

  return hardwareCost + oneTimeLicensingCost;
};

/**
 * Calculate capital cost per category (compute, storage, network)
 */
export const calculateCapitalCostByCategory = (
  components: InfrastructureComponent[]
): { compute: number; storage: number; network: number } => {
  if (!components || components.length === 0) {
    return { compute: 0, storage: 0, network: 0 };
  }

  let computeTotal = 0;
  let storageTotal = 0;
  let networkTotal = 0;
  const hyperConvergedNodes = new Map<string, { baseCost: number; disksCost: number }>();

  components.forEach(component => {
    const componentCost = component.cost;

    // Calculate cost of attached disks for this component
    let attachedDisksCost = 0;
    if ('attachedDisks' in component && Array.isArray(component.attachedDisks)) {
      const attachedDisks = component.attachedDisks as Array<InfrastructureComponent & { quantity?: number }>;
      attachedDisksCost = attachedDisks.reduce((diskTotal, disk) => {
        const diskQuantity = disk.quantity || 1;
        return diskTotal + (disk.cost * diskQuantity);
      }, 0);
    }

    if (component.role === 'hyperConvergedNode') {
      // Track hyper-converged nodes for later splitting
      hyperConvergedNodes.set(component.id, {
        baseCost: componentCost,
        disksCost: attachedDisksCost
      });
    } else if (component.role === 'storageNode' || component.type === ComponentType.Disk) {
      // Storage nodes and standalone disks go to storage total
      storageTotal += componentCost + attachedDisksCost;
    } else if (component.type === ComponentType.Server || component.type === ComponentType.GPU) {
      // For compute nodes, the node itself goes to compute, but attached disks go to storage
      computeTotal += componentCost;
      storageTotal += attachedDisksCost;
    } else if (component.type === ComponentType.Switch || component.type === ComponentType.Router || component.type === ComponentType.Firewall) {
      // Network devices
      networkTotal += componentCost;
      storageTotal += attachedDisksCost; // Unlikely, but handle it
    }
  });

  // Handle hyper-converged nodes: all disk costs go to storage, all server costs go to compute
  if (hyperConvergedNodes.size > 0) {
    hyperConvergedNodes.forEach(nodeData => {
      storageTotal += nodeData.disksCost;
      computeTotal += nodeData.baseCost;
    });
  }

  return { compute: computeTotal, storage: storageTotal, network: networkTotal };
};

/**
 * Calculate amortized monthly costs by component type
 */
export const calculateAmortizedCostsByType = (
  components: InfrastructureComponent[],
  computeLifespanYears: number = 3,
  storageLifespanYears: number = 3,
  networkLifespanYears: number = 3
): { compute: number; storage: number; network: number; total: number } => {
  if (!components || components.length === 0) {
    return { compute: 0, storage: 0, network: 0, total: 0 };
  }

  const costs = calculateCapitalCostByCategory(components);

  const monthsInYear = 12;
  const computeAmortized = costs.compute / (computeLifespanYears * monthsInYear);
  const storageAmortized = costs.storage / (storageLifespanYears * monthsInYear);
  const networkAmortized = costs.network / (networkLifespanYears * monthsInYear);
  const totalAmortized = computeAmortized + storageAmortized + networkAmortized;

  return {
    compute: computeAmortized,
    storage: storageAmortized,
    network: networkAmortized,
    total: totalAmortized
  };
};

/**
 * Calculate licensing costs (one-time and monthly)
 */
export const calculateLicensingCosts = (
  requirements: DesignRequirements,
  components: InfrastructureComponent[]
): { oneTime: number; monthly: number } => {
  const licensingReqs = requirements.licensingRequirements;
  if (!licensingReqs) {
    return { oneTime: 0, monthly: 0 };
  }

  let oneTimeCosts = 0;
  let monthlyCosts = 0;

  // Support cost per node with frequency
  if (licensingReqs.supportCostPerNode) {
    const totalNodes = components.filter(
      component => component.type === ComponentType.Server
    ).length;

    const supportCostPerNode = licensingReqs.supportCostPerNode;
    const frequency = licensingReqs.supportCostFrequency || 'monthly';

    let monthlySupportCost = 0;
    switch (frequency) {
      case 'monthly':
        monthlySupportCost = supportCostPerNode;
        break;
      case 'quarterly':
        monthlySupportCost = supportCostPerNode / 3;
        break;
      case 'annually':
        monthlySupportCost = supportCostPerNode / 12;
        break;
    }

    monthlyCosts += monthlySupportCost * totalNodes;
  }

  // Additional costs
  if (licensingReqs.additionalCosts) {
    licensingReqs.additionalCosts.forEach(cost => {
      switch (cost.frequency) {
        case 'one-time':
          oneTimeCosts += cost.amount;
          break;
        case 'monthly':
          monthlyCosts += cost.amount;
          break;
        case 'quarterly':
          monthlyCosts += cost.amount / 3;
          break;
        case 'annually':
          monthlyCosts += cost.amount / 12;
          break;
      }
    });
  }

  return { oneTime: oneTimeCosts, monthly: monthlyCosts };
};

/**
 * Calculate power consumption for all components
 */
export const calculatePowerConsumption = (
  components: InfrastructureComponent[],
  operationalLoadPercentage: number = 50
): { minimumPower: number; operationalPower: number; maximumPower: number } => {
  if (!components || components.length === 0) {
    return { minimumPower: 0, operationalPower: 0, maximumPower: 0 };
  }

  let totalMaximumPower = 0;
  let totalMinimumPower = 0;
  let totalOperationalPower = 0;

  components.forEach(component => {
    const quantity = component.quantity || 1;

    // Calculate minimum (idle), operational, and maximum (peak) power
    let minPower = component.powerTypical || 0;
    let operationalPower = component.powerTypical || 0;
    let maxPower = component.powerTypical || 0;

    if (component.powerIdle !== undefined && component.powerTypical !== undefined && component.powerPeak !== undefined
        && (component.powerIdle > 0 || component.powerTypical > 0 || component.powerPeak > 0)) {
      // Use enhanced power values
      minPower = component.powerIdle;
      maxPower = component.powerPeak;

      // Calculate operational power based on load percentage
      if (operationalLoadPercentage <= 10) {
        operationalPower = component.powerIdle;
      } else if (operationalLoadPercentage <= 50) {
        const ratio = (operationalLoadPercentage - 10) / 40;
        operationalPower = component.powerIdle + (component.powerTypical - component.powerIdle) * ratio;
      } else if (operationalLoadPercentage <= 80) {
        const ratio = (operationalLoadPercentage - 50) / 30;
        operationalPower = component.powerTypical + (component.powerPeak - component.powerTypical) * ratio;
      } else {
        operationalPower = component.powerPeak;
      }
    } else {
      // Fallback to legacy calculation: min = 1/3 of max
      minPower = maxPower / 3;
      const remainingPower = maxPower - minPower;
      const loadFactor = operationalLoadPercentage / 100;
      operationalPower = minPower + (remainingPower * loadFactor);
    }

    totalMinimumPower += minPower * quantity;
    totalOperationalPower += operationalPower * quantity;
    totalMaximumPower += maxPower * quantity;
  });

  return {
    minimumPower: Math.round(totalMinimumPower),
    operationalPower: Math.round(totalOperationalPower),
    maximumPower: Math.round(totalMaximumPower)
  };
};

/**
 * Calculate energy costs based on power consumption
 */
export const calculateEnergyCosts = (
  operationalPowerWatts: number,
  electricityPricePerKwh: number = 0.25
): { hourly: number; daily: number; monthly: number; yearly: number } => {
  const operationalPowerKw = operationalPowerWatts / 1000;

  const hourlyEnergyCost = operationalPowerKw * electricityPricePerKwh;
  const dailyEnergyCost = hourlyEnergyCost * 24;
  const monthlyEnergyCost = dailyEnergyCost * 30;
  const yearlyEnergyCost = dailyEnergyCost * 365;

  return {
    hourly: hourlyEnergyCost,
    daily: dailyEnergyCost,
    monthly: monthlyEnergyCost,
    yearly: yearlyEnergyCost
  };
};

/**
 * Calculate rack costs based on facility type
 */
export const calculateRackCosts = (
  rackQuantity: number,
  facilityType: string,
  rackCostPerMonth: number = 2000,
  facilityCosts?: { totalMonthlyCost: number; costPerRack: number } | null
): { monthlyRackCost: number; monthlyFacilityCost: number } => {
  let rackMonthly = 0;
  let facilityMonthly = 0;

  if (facilityType === 'colocation') {
    rackMonthly = rackCostPerMonth * rackQuantity;
  } else if (facilityType === 'owned' && facilityCosts) {
    // For owned facilities, use the total monthly facility cost
    facilityMonthly = facilityCosts.totalMonthlyCost;
  }

  return { monthlyRackCost: rackMonthly, monthlyFacilityCost: facilityMonthly };
};

/**
 * Calculate total operational costs
 */
export const calculateOperationalCosts = (
  requirements: DesignRequirements,
  components: InfrastructureComponent[],
  rackQuantity: number,
  operationalPowerWatts: number,
  facilityCosts?: { totalMonthlyCost: number; costPerRack: number } | null
): {
  racksMonthly: number;
  facilityMonthly: number;
  energyMonthly: number;
  amortizedMonthly: number;
  licensingMonthly: number;
  networkMonthly: number;
  totalMonthly: number;
} => {
  const facilityType = requirements.physicalConstraints?.facilityType || 'none';
  const electricityPrice = requirements.physicalConstraints?.electricityPricePerKwh ?? 0.25;
  const rackCostPerMonth = requirements.physicalConstraints?.rackCostPerMonthEuros
    ?? requirements.physicalConstraints?.rackCostPerMonth
    ?? 2000;

  // Calculate rack costs
  const { monthlyRackCost, monthlyFacilityCost } = calculateRackCosts(
    rackQuantity,
    facilityType,
    rackCostPerMonth,
    facilityCosts
  );

  // Calculate energy costs (not included if owned facility)
  const energyCosts = calculateEnergyCosts(operationalPowerWatts, electricityPrice);
  const energyMonthly = facilityType === 'owned' ? 0 : energyCosts.monthly;

  // Calculate amortization
  const computeLifespan = requirements.computeRequirements?.deviceLifespanYears || 3;
  const storageLifespan = requirements.storageRequirements?.deviceLifespanYears || 3;
  const networkLifespan = requirements.networkRequirements?.deviceLifespanYears || 3;
  const amortizedCostsByType = calculateAmortizedCostsByType(
    components,
    computeLifespan,
    storageLifespan,
    networkLifespan
  );

  // Calculate licensing
  const licensingCosts = calculateLicensingCosts(requirements, components);

  const totalMonthly = monthlyRackCost + monthlyFacilityCost + energyMonthly +
                      amortizedCostsByType.total + licensingCosts.monthly +
                      amortizedCostsByType.network;

  return {
    racksMonthly: monthlyRackCost,
    facilityMonthly: monthlyFacilityCost,
    energyMonthly,
    amortizedMonthly: amortizedCostsByType.total,
    licensingMonthly: licensingCosts.monthly,
    networkMonthly: amortizedCostsByType.network,
    totalMonthly
  };
};

/**
 * Estimate rack quantity needed based on components
 * This is a simplified estimation without full placement logic
 */
export const estimateRackQuantity = (
  components: InfrastructureComponent[],
  requirements: DesignRequirements
): { computeRacks: number; networkRacks: number; totalRacks: number } => {
  if (!components || components.length === 0) {
    return { computeRacks: 1, networkRacks: 0, totalRacks: 1 };
  }

  // Standard rack has 42U of space, but practical capacity is lower (typically 36U after overhead)
  const USABLE_RU_PER_RACK = 36;
  const dedicatedNetworkRacks = requirements.networkRequirements?.dedicatedNetworkCoreRacks || false;

  // Calculate total RU needed for compute/storage components
  let computeStorageRU = 0;
  let networkCoreRU = 0;

  components.forEach(component => {
    const quantity = component.quantity || 1;
    const ruSize = component.ruSize || 1;
    const totalRU = ruSize * quantity;

    // Network core components (spine, core switches) go to dedicated racks if enabled
    if (dedicatedNetworkRacks &&
        ['spineSwitch', 'coreSwitch', 'borderLeafSwitch'].includes(component.role || '')) {
      networkCoreRU += totalRU;
    } else {
      computeStorageRU += totalRU;
    }
  });

  // Calculate rack quantities with overhead
  const computeRacks = Math.max(1, Math.ceil(computeStorageRU / USABLE_RU_PER_RACK));
  const networkRacks = dedicatedNetworkRacks ? Math.max(0, Math.ceil(networkCoreRU / USABLE_RU_PER_RACK)) : 0;

  // Ensure at least 2 network racks if any network core components exist and dedicated racks are enabled
  const finalNetworkRacks = dedicatedNetworkRacks && networkCoreRU > 0 ? Math.max(2, networkRacks) : 0;

  return {
    computeRacks,
    networkRacks: finalNetworkRacks,
    totalRacks: computeRacks + finalNetworkRacks
  };
};

/**
 * Count infrastructure components by type
 */
export const countInfrastructure = (
  components: InfrastructureComponent[]
): {
  totalServers: number;
  computeNodes: number;
  storageNodes: number;
  hyperConvergedNodes: number;
  leafSwitches: number;
  spineSwitches: number;
  managementSwitches: number;
  totalSwitches: number;
} => {
  if (!components || components.length === 0) {
    return {
      totalServers: 0,
      computeNodes: 0,
      storageNodes: 0,
      hyperConvergedNodes: 0,
      leafSwitches: 0,
      spineSwitches: 0,
      managementSwitches: 0,
      totalSwitches: 0
    };
  }

  let totalServers = 0;
  let computeNodes = 0;
  let storageNodes = 0;
  let hyperConvergedNodes = 0;
  let leafSwitches = 0;
  let spineSwitches = 0;
  let managementSwitches = 0;

  components.forEach(component => {
    const quantity = component.quantity || 1;

    if (component.type === ComponentType.Server) {
      totalServers += quantity;

      if (component.role === 'computeNode' || component.role === 'gpuNode') {
        computeNodes += quantity;
      } else if (component.role === 'storageNode') {
        storageNodes += quantity;
      } else if (component.role === 'hyperConvergedNode') {
        hyperConvergedNodes += quantity;
      }
    } else if (component.type === ComponentType.Switch) {
      if (component.role === 'leafSwitch') {
        leafSwitches += quantity;
      } else if (component.role === 'spineSwitch' || component.role === 'coreSwitch') {
        spineSwitches += quantity;
      } else if (component.role === 'managementSwitch') {
        managementSwitches += quantity;
      }
    }
  });

  const totalSwitches = leafSwitches + spineSwitches + managementSwitches;

  return {
    totalServers,
    computeNodes,
    storageNodes,
    hyperConvergedNodes,
    leafSwitches,
    spineSwitches,
    managementSwitches,
    totalSwitches
  };
};

/**
 * Calculate complete cost analysis for a design
 * This is the main function that combines all cost calculations
 */
export const calculateCompleteCostAnalysis = (
  components: InfrastructureComponent[],
  requirements: DesignRequirements,
  rackQuantity: number,
  facilityCosts?: { totalMonthlyCost: number; costPerRack: number } | null
): CostCalculationResult => {
  // Calculate licensing
  const licensingCosts = calculateLicensingCosts(requirements, components);

  // Calculate capital costs
  const capitalCost = calculateCapitalCost(components, licensingCosts.oneTime);
  const capitalCostsByCategory = calculateCapitalCostByCategory(components);

  // Calculate power consumption
  const operationalLoadPercentage = requirements.physicalConstraints?.operationalLoadPercentage ?? 50;
  const powerConsumption = calculatePowerConsumption(components, operationalLoadPercentage);

  // Calculate operational costs
  const operationalCosts = calculateOperationalCosts(
    requirements,
    components,
    rackQuantity,
    powerConsumption.operationalPower,
    facilityCosts
  );

  // Calculate amortization breakdown
  const computeLifespan = requirements.computeRequirements?.deviceLifespanYears || 3;
  const storageLifespan = requirements.storageRequirements?.deviceLifespanYears || 3;
  const networkLifespan = requirements.networkRequirements?.deviceLifespanYears || 3;
  const amortizedCostsByType = calculateAmortizedCostsByType(
    components,
    computeLifespan,
    storageLifespan,
    networkLifespan
  );

  return {
    capitalCost,
    computeCapitalCost: capitalCostsByCategory.compute,
    storageCapitalCost: capitalCostsByCategory.storage,
    networkCapitalCost: capitalCostsByCategory.network,
    monthlyOperationalCost: operationalCosts.totalMonthly,
    monthlyFacilityCost: operationalCosts.facilityMonthly,
    monthlyEnergyCost: operationalCosts.energyMonthly,
    monthlyAmortizedCost: operationalCosts.amortizedMonthly,
    monthlyLicensingCost: operationalCosts.licensingMonthly,
    computeAmortized: amortizedCostsByType.compute,
    storageAmortized: amortizedCostsByType.storage,
    networkAmortized: amortizedCostsByType.network,
    oneTimeLicensingCost: licensingCosts.oneTime
  };
};
