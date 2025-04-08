
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { DesignRequirements } from '@/types/infrastructure';
import { 
  calculateAmortizedCosts,
  calculatePowerMetrics,
  calculateEnergyCosts,
  calculateUtilizationMetrics,
  getDeviceLifespans,
  getOperationalSettings,
  countComponentsByType
} from './utils/resourceCalculationUtils';
import { useComponentCosts } from './utils/useComponentCosts';

export const useResourceMetrics = () => {
  const { activeDesign } = useDesignStore();
  
  // Calculate resource metrics
  const resourceMetrics = useMemo(() => {
    // Initialize metrics with default values
    const metrics = {
      totalServers: 0,
      totalLeafSwitches: 0,
      totalMgmtSwitches: 0,
      totalRackUnits: 0,
      totalPower: 0,
      minimumPower: 0,
      operationalPower: 0,
      totalMemoryGB: 0,
      totalComputeCores: 0,
      totalStorageCapacityTB: 0,
      totalRackQuantity: 0,
      dailyEnergyCost: 0,
      monthlyEnergyCost: 0,
      monthlyColoCost: 0,
      monthlyAmortizedComputeCost: 0,
      monthlyAmortizedStorageCost: 0,
      monthlyAmortizedNetworkCost: 0,
      totalMonthlyAmortizedCost: 0,
      utilization: {
        powerUtilization: {
          percentage: 0,
          used: 0,
          total: 0
        },
        spaceUtilization: {
          percentage: 0,
          used: 0,
          total: 0
        },
        leafNetworkUtilization: {
          percentage: 0,
          used: 0,
          total: 0
        },
        mgmtNetworkUtilization: {
          percentage: 0,
          used: 0,
          total: 0
        }
      }
    };
    
    // Return default metrics if no active design
    if (!activeDesign || !activeDesign.components || activeDesign.components.length === 0) {
      return metrics;
    }
    
    // Initialize requirements with proper type checking
    const requirements: DesignRequirements = activeDesign?.requirements || {} as DesignRequirements;
    
    // Get operational settings with safe defaults
    const { 
      rackUnitsPerRack, 
      coloRacks, 
      rackCostPerMonth, 
      operationalLoad, 
      energyPricePerKwh 
    } = getOperationalSettings(requirements);
    
    // Count components by type and role
    const {
      totalServers,
      totalLeafSwitches,
      totalMgmtSwitches,
      totalRackUnits
    } = countComponentsByType(activeDesign.components);
    
    // Set the counted values in our metrics object
    metrics.totalServers = totalServers;
    metrics.totalLeafSwitches = totalLeafSwitches;
    metrics.totalMgmtSwitches = totalMgmtSwitches;
    metrics.totalRackUnits = totalRackUnits;
    
    // Calculate the rack space utilization
    let totalRackUnitsUsed = totalRackUnits;
    
    // Get component costs by category
    const { totalComputeCost, totalStorageCost, totalNetworkCost } = 
      useComponentCosts(activeDesign.components);
    
    // Get device lifespans with safe defaults
    const { computeLifespan, storageLifespan, networkLifespan } = 
      getDeviceLifespans(requirements);
    
    // Calculate power metrics
    const powerMetrics = calculatePowerMetrics(activeDesign.components, operationalLoad);
    metrics.totalPower = powerMetrics.totalPower;
    metrics.minimumPower = powerMetrics.minimumPower;
    metrics.operationalPower = powerMetrics.operationalPower;
    
    // Calculate required racks based on rack units
    metrics.totalRackQuantity = Math.ceil(metrics.totalRackUnits / rackUnitsPerRack);
    
    // Calculate energy costs (operational power is in watts, convert to kW)
    const operationalPowerKW = metrics.operationalPower / 1000;
    const energyCosts = calculateEnergyCosts(operationalPowerKW, energyPricePerKwh);
    metrics.dailyEnergyCost = energyCosts.dailyEnergyCost;
    metrics.monthlyEnergyCost = energyCosts.monthlyEnergyCost;
    
    // Calculate colocation costs if enabled
    if (coloRacks) {
      metrics.monthlyColoCost = metrics.totalRackQuantity * rackCostPerMonth;
    }
    
    // Calculate amortized costs
    const amortizedCosts = calculateAmortizedCosts(
      totalComputeCost,
      totalStorageCost,
      totalNetworkCost,
      computeLifespan,
      storageLifespan,
      networkLifespan
    );
    
    metrics.monthlyAmortizedComputeCost = amortizedCosts.monthlyAmortizedComputeCost;
    metrics.monthlyAmortizedStorageCost = amortizedCosts.monthlyAmortizedStorageCost;
    metrics.monthlyAmortizedNetworkCost = amortizedCosts.monthlyAmortizedNetworkCost;
    metrics.totalMonthlyAmortizedCost = amortizedCosts.totalMonthlyAmortizedCost;
    
    // Calculate utilization metrics
    const maxRackUnits = metrics.totalRackQuantity * rackUnitsPerRack;
    
    const utilizationMetrics = calculateUtilizationMetrics(
      metrics.operationalPower,
      metrics.totalPower,
      totalRackUnitsUsed,
      maxRackUnits,
      totalServers,
      totalLeafSwitches,
      totalMgmtSwitches
    );
    
    metrics.utilization = utilizationMetrics;
    
    return metrics;
  }, [activeDesign]);
  
  return { resourceMetrics: resourceMetrics, resourceUtilization: resourceMetrics.utilization };
};
