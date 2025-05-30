import { TcoScenario, TcoResults } from '@/types/infrastructure/tco-types';
import { InfrastructureDesign, ComponentType } from '@/types/infrastructure';

export const calculateScenarioTco = (
  scenario: TcoScenario,
  activeDesign: InfrastructureDesign | null
): TcoResults | null => {
  if (!activeDesign?.components || activeDesign.components.length === 0) {
    return null;
  }

  const { parameters, baseRequirements } = scenario;
  
  // Apply scaling factors to requirements
  const scaledRequirements = {
    ...baseRequirements,
    computeRequirements: {
      ...baseRequirements.computeRequirements,
      computeClusters: baseRequirements.computeRequirements.computeClusters.map(cluster => ({
        ...cluster,
        totalVCPUs: Math.round(cluster.totalVCPUs * parameters.computeScale),
        totalMemoryTB: cluster.totalMemoryTB * parameters.computeScale
      }))
    },
    storageRequirements: {
      ...baseRequirements.storageRequirements,
      storageClusters: baseRequirements.storageRequirements.storageClusters.map(cluster => ({
        ...cluster,
        totalCapacityTB: cluster.totalCapacityTB * parameters.storageScale
      }))
    },
    physicalConstraints: {
      ...baseRequirements.physicalConstraints,
      totalAvailabilityZones: parameters.availabilityZones,
      computeStorageRackQuantity: parameters.rackQuantity
    }
  };

  // Calculate hardware costs
  const hardwareCosts = calculateHardwareCosts(activeDesign.components, parameters);
  
  // Calculate operational costs
  const operationalCosts = calculateOperationalCosts(
    activeDesign.components,
    scaledRequirements,
    parameters
  );

  // Calculate capacity metrics
  const capacityMetrics = calculateCapacityMetrics(
    activeDesign.components,
    scaledRequirements,
    parameters
  );

  // Calculate total monthly cost
  const totalMonthlyCost = 
    hardwareCosts.amortizedMonthly +
    operationalCosts.energy +
    operationalCosts.rack +
    operationalCosts.licensing +
    operationalCosts.network;

  // Calculate TCO per VM
  const tcoPerVM = capacityMetrics.vmCapacity > 0 
    ? totalMonthlyCost / (capacityMetrics.vmCapacity * (parameters.utilization / 100))
    : 0;

  // Calculate cost per TB
  const costPerTB = capacityMetrics.storageCapacity > 0
    ? totalMonthlyCost / (capacityMetrics.storageCapacity * (parameters.utilization / 100))
    : 0;

  return {
    totalMonthlyCost,
    tcoPerVM,
    costPerTB,
    vmCapacity: capacityMetrics.vmCapacity,
    storageCapacity: capacityMetrics.storageCapacity,
    costBreakdown: {
      hardware: hardwareCosts.amortizedMonthly,
      energy: operationalCosts.energy,
      rack: operationalCosts.rack,
      licensing: operationalCosts.licensing,
      network: operationalCosts.network
    },
    utilizationMetrics: {
      computeUtilization: parameters.utilization,
      storageUtilization: parameters.utilization
    }
  };
};

const calculateHardwareCosts = (
  components: any[],
  parameters: any
): { total: number; amortizedMonthly: number } => {
  let computeTotal = 0;
  let storageTotal = 0;
  let networkTotal = 0;

  components.forEach(component => {
    const componentCost = component.cost * (component.quantity || 1);
    
    if (component.role === 'storageNode' || component.type === ComponentType.Disk) {
      storageTotal += componentCost * parameters.storageScale;
    } else if (component.type === ComponentType.Server || component.type === ComponentType.GPU) {
      computeTotal += componentCost * parameters.computeScale;
    } else if (
      component.type === ComponentType.Switch || 
      component.type === ComponentType.Router || 
      component.type === ComponentType.Firewall
    ) {
      // Network costs scale with availability zones
      const networkScaling = Math.max(1, parameters.availabilityZones / 2);
      networkTotal += componentCost * networkScaling * parameters.networkRedundancy;
    }
  });

  const total = computeTotal + storageTotal + networkTotal;
  
  // Calculate amortized monthly cost based on device lifespans
  const computeAmortized = computeTotal / (parameters.deviceLifespan.compute * 12);
  const storageAmortized = storageTotal / (parameters.deviceLifespan.storage * 12);
  const networkAmortized = networkTotal / (parameters.deviceLifespan.network * 12);
  
  return {
    total,
    amortizedMonthly: computeAmortized + storageAmortized + networkAmortized
  };
};

const calculateOperationalCosts = (
  components: any[],
  requirements: any,
  parameters: any
): { energy: number; rack: number; licensing: number; network: number } => {
  // Calculate power consumption
  let totalPower = 0;
  components.forEach(component => {
    const quantity = component.quantity || 1;
    const power = component.powerRequired || 0;
    
    if (component.role === 'storageNode' || component.type === ComponentType.Disk) {
      totalPower += power * quantity * parameters.storageScale;
    } else if (component.type === ComponentType.Server || component.type === ComponentType.GPU) {
      totalPower += power * quantity * parameters.computeScale;
    } else {
      totalPower += power * quantity;
    }
  });

  // Apply power efficiency factor
  totalPower = totalPower * parameters.powerEfficiency;
  
  // Calculate energy cost
  const electricityPrice = requirements.physicalConstraints?.electricityPricePerKwh || 0.1;
  const operationalLoad = (requirements.physicalConstraints?.operationalLoadPercentage || 50) / 100;
  const monthlyHours = 24 * 30;
  const energyCost = (totalPower / 1000) * electricityPrice * monthlyHours * operationalLoad;

  // Calculate rack cost
  const rackCostPerMonth = requirements.physicalConstraints?.useColoRacks 
    ? (requirements.physicalConstraints?.rackCostPerMonthEuros || 2000)
    : 0;
  const totalRacks = parameters.rackQuantity + 
    (requirements.networkRequirements?.dedicatedNetworkCoreRacks ? 2 : 0);
  const rackCost = rackCostPerMonth * totalRacks;

  // Calculate licensing cost
  const licensingCost = calculateLicensingCost(components, requirements, parameters);

  // Network operational costs (simplified)
  const networkCost = totalRacks * 100; // Base network cost per rack

  return {
    energy: energyCost,
    rack: rackCost,
    licensing: licensingCost,
    network: networkCost
  };
};

const calculateCapacityMetrics = (
  components: any[],
  requirements: any,
  parameters: any
): { vmCapacity: number; storageCapacity: number } => {
  // Calculate total vCPUs and memory
  let totalVCPUs = 0;
  let totalMemoryGB = 0;
  let totalStorageTB = 0;

  components.forEach(component => {
    const quantity = component.quantity || 1;
    
    if (component.type === ComponentType.Server && component.role === 'computeNode') {
      const server = component as any;
      totalVCPUs += (server.cpuCount * server.coresPerCPU * 2) * quantity * parameters.computeScale;
      totalMemoryGB += server.ramCapacityGB * quantity * parameters.computeScale;
    } else if (component.type === ComponentType.Disk || component.role === 'storageNode') {
      const disk = component as any;
      const capacityTB = (disk.capacityTB || disk.diskCapacityTB || 0);
      totalStorageTB += capacityTB * quantity * parameters.storageScale;
    }
  });

  // Calculate VM capacity based on average VM size
  const avgVMVCPUs = requirements.computeRequirements?.averageVMVCPUs || 4;
  const avgVMMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 8;
  
  const vmsByCPU = Math.floor(totalVCPUs / avgVMVCPUs);
  const vmsByMemory = Math.floor(totalMemoryGB / avgVMMemoryGB);
  const vmCapacity = Math.min(vmsByCPU, vmsByMemory);

  return {
    vmCapacity,
    storageCapacity: totalStorageTB
  };
};

const calculateLicensingCost = (
  components: any[],
  requirements: any,
  parameters: any
): number => {
  const licensingReqs = requirements.licensingRequirements;
  if (!licensingReqs) return 0;

  let monthlyCost = 0;

  // Support cost per node
  if (licensingReqs.supportCostPerNode) {
    const totalNodes = components.filter(c => c.type === ComponentType.Server).length;
    const scaledNodes = Math.round(totalNodes * 
      ((parameters.computeScale + parameters.storageScale) / 2));
    
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
    
    monthlyCost += monthlySupportCost * scaledNodes;
  }

  // Additional costs
  licensingReqs.additionalCosts?.forEach((cost: any) => {
    switch (cost.frequency) {
      case 'monthly':
        monthlyCost += cost.amount;
        break;
      case 'quarterly':
        monthlyCost += cost.amount / 3;
        break;
      case 'annually':
        monthlyCost += cost.amount / 12;
        break;
    }
  });

  return monthlyCost;
}; 