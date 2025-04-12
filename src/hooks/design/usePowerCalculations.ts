
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { PowerUsage } from '@/types/infrastructure';
import { usePhysicalResourceMetrics } from '@/hooks/design/usePhysicalResourceMetrics';

export const usePowerCalculations = () => {
  const { activeDesign } = useDesignStore();
  const physicalMetrics = usePhysicalResourceMetrics();
  
  // Extract operational load percentage from requirements
  const operationalLoadPercentage = useMemo(() => {
    return activeDesign?.requirements?.physicalConstraints?.operationalLoadPercentage ?? 50;
  }, [activeDesign?.requirements?.physicalConstraints?.operationalLoadPercentage]);

  // Determine if we have dedicated network racks
  const hasDedicatedNetworkRacks = useMemo(() => {
    return Boolean(activeDesign?.requirements?.networkRequirements?.dedicatedNetworkCoreRacks);
  }, [activeDesign?.requirements?.networkRequirements?.dedicatedNetworkCoreRacks]);

  // Determine if we have dedicated storage network 
  const hasDedicatedStorageNetwork = useMemo(() => {
    return Boolean(activeDesign?.requirements?.networkRequirements?.dedicatedStorageNetwork);
  }, [activeDesign?.requirements?.networkRequirements?.dedicatedStorageNetwork]);
  
  // Calculate power usage for the entire design
  const powerUsage = useMemo(() => {
    if (!activeDesign?.components || activeDesign.components.length === 0) {
      return { minimumPower: 0, operationalPower: 0, maximumPower: 0 };
    }
    
    // Calculate maximum power for all components
    let totalMaximumPower = 0;
    let networkRackMaximumPower = 0;
    let computeRackMaximumPower = 0;
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      const power = component.powerRequired || 0;
      const componentPower = power * quantity;
      
      // Separate network components if needed
      if (hasDedicatedNetworkRacks && 
          ['spineSwitch', 'coreSwitch', 'borderLeafSwitch']
          .includes(component.role || '')) {
        networkRackMaximumPower += componentPower;
      } else {
        computeRackMaximumPower += componentPower;
      }
      
      totalMaximumPower += componentPower;
    });
    
    // Calculate minimum power (1/3 of maximum)
    const totalMinimumPower = totalMaximumPower / 3;
    const networkRackMinimumPower = networkRackMaximumPower / 3;
    const computeRackMinimumPower = computeRackMaximumPower / 3;
    
    // Calculate operational power: minimum power + (operational load % * remaining power)
    const remainingPower = totalMaximumPower - totalMinimumPower;
    const networkRackRemainingPower = networkRackMaximumPower - networkRackMinimumPower;
    const computeRackRemainingPower = computeRackMaximumPower - computeRackMinimumPower;
    
    const loadFactor = operationalLoadPercentage / 100;
    
    const totalOperationalComponent = remainingPower * loadFactor;
    const networkRackOperationalComponent = networkRackRemainingPower * loadFactor;
    const computeRackOperationalComponent = computeRackRemainingPower * loadFactor;
    
    const totalOperationalPower = totalMinimumPower + totalOperationalComponent;
    const networkRackOperationalPower = networkRackMinimumPower + networkRackOperationalComponent;
    const computeRackOperationalPower = computeRackMinimumPower + computeRackOperationalComponent;
    
    // Calculate available power based on rack type - FIX: Use the correct rack quantities
    const powerPerRack = activeDesign?.requirements?.physicalConstraints?.powerPerRackWatts || 0;
    const computeRackQuantity = activeDesign?.requirements?.physicalConstraints?.computeStorageRackQuantity || 1;
    const networkRackQuantity = hasDedicatedNetworkRacks ? 2 : 0; // Network racks are always a pair

    const totalAvailablePower = powerPerRack * (computeRackQuantity + networkRackQuantity);
    const computeAvailablePower = powerPerRack * computeRackQuantity;
    const networkAvailablePower = powerPerRack * networkRackQuantity;
    
    // If we have separate network racks, provide both sets of power metrics
    if (hasDedicatedNetworkRacks) {
      return {
        minimumPower: Math.round(totalMinimumPower),
        operationalPower: Math.round(totalOperationalPower),
        maximumPower: Math.round(totalMaximumPower),
        totalAvailablePower: Math.round(totalAvailablePower),
        networkRack: {
          minimumPower: Math.round(networkRackMinimumPower),
          operationalPower: Math.round(networkRackOperationalPower),
          maximumPower: Math.round(networkRackMaximumPower),
          availablePower: Math.round(networkAvailablePower),
        },
        computeRack: {
          minimumPower: Math.round(computeRackMinimumPower),
          operationalPower: Math.round(computeRackOperationalPower),
          maximumPower: Math.round(computeRackMaximumPower),
          availablePower: Math.round(computeAvailablePower),
        }
      };
    }
    
    // Otherwise return the combined metrics
    return {
      minimumPower: Math.round(totalMinimumPower),
      operationalPower: Math.round(totalOperationalPower),
      maximumPower: Math.round(totalMaximumPower),
      totalAvailablePower: Math.round(totalAvailablePower)
    };
  }, [activeDesign?.components, operationalLoadPercentage, hasDedicatedNetworkRacks, activeDesign?.requirements?.physicalConstraints]);
  
  // Calculate energy costs based on operational power
  const energyCosts = useMemo(() => {
    const electricityPrice = activeDesign?.requirements?.physicalConstraints?.electricityPricePerKwh ?? 0.25;
    const operationalPowerKw = powerUsage.operationalPower / 1000; // Convert W to kW
    
    const hourlyEnergyCost = operationalPowerKw * electricityPrice;
    const dailyEnergyCost = hourlyEnergyCost * 24;
    const monthlyEnergyCost = dailyEnergyCost * 30; // Approximate month
    const yearlyEnergyCost = dailyEnergyCost * 365;
    
    // If we have dedicated network racks, calculate their energy costs separately
    if ('networkRack' in powerUsage) {
      const networkOperationalPowerKw = (powerUsage as any).networkRack.operationalPower / 1000;
      const computeOperationalPowerKw = (powerUsage as any).computeRack.operationalPower / 1000;
      
      return {
        hourlyEnergyCost,
        dailyEnergyCost,
        monthlyEnergyCost,
        yearlyEnergyCost,
        networkRack: {
          hourlyEnergyCost: networkOperationalPowerKw * electricityPrice,
          dailyEnergyCost: networkOperationalPowerKw * electricityPrice * 24,
          monthlyEnergyCost: networkOperationalPowerKw * electricityPrice * 24 * 30,
          yearlyEnergyCost: networkOperationalPowerKw * electricityPrice * 24 * 365,
        },
        computeRack: {
          hourlyEnergyCost: computeOperationalPowerKw * electricityPrice,
          dailyEnergyCost: computeOperationalPowerKw * electricityPrice * 24,
          monthlyEnergyCost: computeOperationalPowerKw * electricityPrice * 24 * 30,
          yearlyEnergyCost: computeOperationalPowerKw * electricityPrice * 24 * 365,
        }
      };
    }
    
    // Otherwise return the combined costs
    return {
      hourlyEnergyCost,
      dailyEnergyCost,
      monthlyEnergyCost,
      yearlyEnergyCost
    };
  }, [powerUsage, activeDesign?.requirements?.physicalConstraints?.electricityPricePerKwh]);
  
  // Return the calculated values
  return {
    powerUsage,
    energyCosts,
    hasDedicatedNetworkRacks,
    hasDedicatedStorageNetwork
  };
};
