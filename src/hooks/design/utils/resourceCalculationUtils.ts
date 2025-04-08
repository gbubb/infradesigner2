
import { DesignRequirements, InfrastructureComponent } from '@/types/infrastructure';

// Cost calculation utilities
export const calculateAmortizedCosts = (
  computeCost: number, 
  storageCost: number, 
  networkCost: number, 
  computeLifespan: number, 
  storageLifespan: number, 
  networkLifespan: number
) => {
  return {
    monthlyAmortizedComputeCost: computeCost / (computeLifespan * 12),
    monthlyAmortizedStorageCost: storageCost / (storageLifespan * 12),
    monthlyAmortizedNetworkCost: networkCost / (networkLifespan * 12),
    totalMonthlyAmortizedCost: 
      (computeCost / (computeLifespan * 12)) + 
      (storageCost / (storageLifespan * 12)) + 
      (networkCost / (networkLifespan * 12))
  };
};

// Power and energy calculation utilities
export const calculatePowerMetrics = (
  components: InfrastructureComponent[],
  operationalLoad: number = 50
) => {
  let totalPower = 0;
  let minimumPower = 0;
  let operationalPower = 0;

  components.forEach(component => {
    const quantity = component.quantity || 1;
    const maxPower = component.powerRequired * quantity;
    const minPower = maxPower / 3;
    const opLoad = operationalLoad / 100;
    const opPower = minPower + ((maxPower - minPower) * opLoad);
    
    totalPower += maxPower;
    minimumPower += minPower;
    operationalPower += opPower;
  });

  return {
    totalPower,
    minimumPower,
    operationalPower
  };
};

// Energy cost calculation
export const calculateEnergyCosts = (
  operationalPowerKW: number, 
  energyPricePerKwh: number
) => {
  const dailyEnergyCost = operationalPowerKW * 24 * energyPricePerKwh;
  const monthlyEnergyCost = dailyEnergyCost * 30;
  
  return {
    dailyEnergyCost,
    monthlyEnergyCost
  };
};

// Utilization calculation utilities
export const calculateUtilizationMetrics = (
  operationalPower: number, 
  totalPower: number,
  totalRackUnitsUsed: number,
  maxRackUnits: number,
  totalServers: number,
  totalLeafSwitches: number,
  totalMgmtSwitches: number
) => {
  // Power utilization
  const powerUtilization = {
    percentage: totalPower > 0 ? (operationalPower / totalPower) * 100 : 0,
    used: operationalPower,
    total: totalPower
  };
  
  // Space utilization
  const spaceUtilization = {
    percentage: maxRackUnits > 0 ? (totalRackUnitsUsed / maxRackUnits) * 100 : 0,
    used: totalRackUnitsUsed,
    total: maxRackUnits
  };
  
  // Network utilization
  const maxLeafPorts = totalLeafSwitches * 48; // Assuming 48 ports per leaf switch
  const usedLeafPorts = totalServers * 2; // Assuming dual-homing
  
  const leafNetworkUtilization = {
    percentage: maxLeafPorts > 0 ? Math.min((usedLeafPorts / maxLeafPorts) * 100, 100) : 0,
    used: usedLeafPorts,
    total: maxLeafPorts
  };
  
  const maxMgmtPorts = totalMgmtSwitches * 48; // Assuming 48 ports per management switch
  const usedMgmtPorts = totalServers; // Assuming single management connection
  
  const mgmtNetworkUtilization = {
    percentage: maxMgmtPorts > 0 ? Math.min((usedMgmtPorts / maxMgmtPorts) * 100, 100) : 0,
    used: usedMgmtPorts,
    total: maxMgmtPorts
  };
  
  return {
    powerUtilization,
    spaceUtilization,
    leafNetworkUtilization,
    mgmtNetworkUtilization
  };
};

// Safely get device lifespans with default fallbacks
export const getDeviceLifespans = (requirements: DesignRequirements) => {
  // Make sure we have objects to work with to avoid undefined property access
  const computeReqs = requirements?.computeRequirements || {};
  const storageReqs = requirements?.storageRequirements || {};
  const networkReqs = requirements?.networkRequirements || {};
  
  return {
    // Use optional chaining and nullish coalescing to provide default values if properties are undefined
    computeLifespan: computeReqs?.deviceLifespanYears ?? 3,
    storageLifespan: storageReqs?.deviceLifespanYears ?? 3,
    networkLifespan: networkReqs?.deviceLifespanYears ?? 3
  };
};

// Get operational settings with safe defaults
export const getOperationalSettings = (requirements: DesignRequirements) => {
  const physicalConstraints = requirements?.physicalConstraints || {};
  const operationalCosts = physicalConstraints?.operationalCosts || {
    coloRacks: false,
    energyPricePerKwh: 0.25,
    operationalLoad: 50
  };
  
  return {
    rackUnitsPerRack: physicalConstraints?.rackUnitsPerRack || 42,
    coloRacks: operationalCosts?.coloRacks || false,
    rackCostPerMonth: operationalCosts?.rackCostPerMonth || 0,
    operationalLoad: operationalCosts?.operationalLoad || 50,
    energyPricePerKwh: operationalCosts?.energyPricePerKwh || 0.25
  };
};

// Count components by type and role
export const countComponentsByType = (components: InfrastructureComponent[]) => {
  let totalServers = 0;
  let totalLeafSwitches = 0;
  let totalMgmtSwitches = 0;
  let totalRackUnits = 0;
  
  components.forEach(component => {
    const quantity = component.quantity || 1;
    
    if ('rackUnitsConsumed' in component) {
      totalRackUnits += (component.rackUnitsConsumed || 0) * quantity;
    }
    
    if (component.type === 'Server') {
      totalServers += quantity;
    } else if (component.type === 'Switch') {
      if (component.role === 'leafSwitch') {
        totalLeafSwitches += quantity;
      } else if (component.role === 'managementSwitch') {
        totalMgmtSwitches += quantity;
      }
    }
  });
  
  return {
    totalServers,
    totalLeafSwitches,
    totalMgmtSwitches,
    totalRackUnits
  };
};
