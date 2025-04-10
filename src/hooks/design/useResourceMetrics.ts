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

/**
 * Creates a default metrics object with all properties initialized to prevent undefined values
 */
const createDefaultMetrics = () => ({
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
  energyPricePerKwh: 0.25,
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
});

/**
 * Hook for calculating resource metrics from the active design
 * This implementation is hardened against undefined values and React hook dependency issues
 */
export const useResourceMetrics = () => {
  // Direct store access without destructuring to avoid potential undefined values
  const store = useDesignStore();
  const designId = store.activeDesign?.id; // Use this for dependencies
  
  // Calculate resource metrics with hardened approach to avoid hook dependency issues
  const resourceMetrics = useMemo(() => {
    // Always start with a fully initialized metrics object
    const metrics = createDefaultMetrics();
    
    // Get a safe reference to the active design and its components
    const activeDesign = store.activeDesign || {};
    const components = Array.isArray(activeDesign?.components) ? activeDesign.components : [];
    
    // Return default metrics if we don't have valid components
    if (!activeDesign.id || components.length === 0) {
      return metrics;
    }
    
    try {
      // Initialize requirements with proper type checking
      const requirements: DesignRequirements = activeDesign?.requirements || {} as DesignRequirements;
      
      // Get operational settings with safe defaults
      const { 
        rackUnitsPerRack = 42, 
        coloRacks = false, 
        rackCostPerMonth = 0, 
        operationalLoad = 0.7, 
        energyPricePerKwh = 0.25 
      } = getOperationalSettings(requirements);
      
      // Count components by type and role
      const {
        totalServers = 0,
        totalLeafSwitches = 0,
        totalMgmtSwitches = 0,
        totalRackUnits = 0
      } = countComponentsByType(components);
      
      // Set the counted values in our metrics object
      metrics.totalServers = totalServers;
      metrics.totalLeafSwitches = totalLeafSwitches;
      metrics.totalMgmtSwitches = totalMgmtSwitches;
      metrics.totalRackUnits = totalRackUnits;
      metrics.energyPricePerKwh = energyPricePerKwh;
      
      // Calculate the rack space utilization
      let totalRackUnitsUsed = totalRackUnits;
      
      // Get component costs by category
      const { totalComputeCost = 0, totalStorageCost = 0, totalNetworkCost = 0 } = 
        useComponentCosts(components);
      
      // Get device lifespans with safe defaults
      const { computeLifespan = 36, storageLifespan = 48, networkLifespan = 60 } = 
        getDeviceLifespans(requirements);
      
      // Calculate power metrics with safe defaults for undefined values
      const powerMetrics = calculatePowerMetrics(components, operationalLoad);
      metrics.totalPower = powerMetrics?.totalPower || 0;
      metrics.minimumPower = powerMetrics?.minimumPower || 0;
      metrics.operationalPower = powerMetrics?.operationalPower || 0;
      
      // Calculate required racks based on rack units
      metrics.totalRackQuantity = Math.ceil(metrics.totalRackUnits / rackUnitsPerRack);
      
      // Calculate energy costs (operational power is in watts, convert to kW)
      const operationalPowerKW = metrics.operationalPower / 1000;
      const energyCosts = calculateEnergyCosts(operationalPowerKW, energyPricePerKwh);
      metrics.dailyEnergyCost = energyCosts?.dailyEnergyCost || 0;
      metrics.monthlyEnergyCost = energyCosts?.monthlyEnergyCost || 0;
      
      // Calculate colocation costs if enabled
      if (coloRacks) {
        metrics.monthlyColoCost = metrics.totalRackQuantity * rackCostPerMonth;
      }
      
      // Calculate amortized costs with safe defaults
      const amortizedCosts = calculateAmortizedCosts(
        totalComputeCost,
        totalStorageCost,
        totalNetworkCost,
        computeLifespan,
        storageLifespan,
        networkLifespan
      );
      
      metrics.monthlyAmortizedComputeCost = amortizedCosts?.monthlyAmortizedComputeCost || 0;
      metrics.monthlyAmortizedStorageCost = amortizedCosts?.monthlyAmortizedStorageCost || 0;
      metrics.monthlyAmortizedNetworkCost = amortizedCosts?.monthlyAmortizedNetworkCost || 0;
      metrics.totalMonthlyAmortizedCost = amortizedCosts?.totalMonthlyAmortizedCost || 0;
      
      // Calculate utilization metrics
      const maxRackUnits = metrics.totalRackQuantity * rackUnitsPerRack;
      
      const utilizationMetrics = calculateUtilizationMetrics(
        metrics.operationalPower,
        metrics.totalPower || 1, // Prevent division by zero
        totalRackUnitsUsed,
        maxRackUnits || 1, // Prevent division by zero
        totalServers,
        totalLeafSwitches,
        totalMgmtSwitches
      );
      
      if (utilizationMetrics) {
        metrics.utilization = utilizationMetrics;
      }
    } catch (error) {
      console.error('Error calculating resource metrics:', error);
    }
    
    return metrics;
  }, [designId]); // Use primitive value as dependency
  
  return { 
    resourceMetrics, 
    resourceUtilization: resourceMetrics.utilization 
  };
};