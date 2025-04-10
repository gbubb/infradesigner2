
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { PowerUsage } from '@/types/infrastructure';

export const usePowerCalculations = () => {
  const { activeDesign } = useDesignStore();
  
  // Extract operational load percentage from requirements
  const operationalLoadPercentage = useMemo(() => {
    return activeDesign?.requirements?.physicalConstraints?.operationalLoadPercentage ?? 50;
  }, [activeDesign?.requirements?.physicalConstraints?.operationalLoadPercentage]);

  // Calculate power usage for the entire design
  const powerUsage = useMemo(() => {
    if (!activeDesign?.components || activeDesign.components.length === 0) {
      return { minimumPower: 0, operationalPower: 0, maximumPower: 0 };
    }
    
    // Calculate power for all components
    let totalMaximumPower = 0;
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      const power = component.powerRequired || 0;
      
      totalMaximumPower += power * quantity;
    });
    
    // Calculate minimum power (1/3 of maximum)
    const totalMinimumPower = totalMaximumPower / 3;
    
    // Calculate operational power: minimum power + (operational load % * remaining power)
    const remainingPower = totalMaximumPower - totalMinimumPower;
    const loadFactor = operationalLoadPercentage / 100;
    const operationalComponent = remainingPower * loadFactor;
    
    const totalOperationalPower = totalMinimumPower + operationalComponent;
    
    return {
      minimumPower: Math.round(totalMinimumPower),
      operationalPower: Math.round(totalOperationalPower),
      maximumPower: Math.round(totalMaximumPower)
    };
  }, [activeDesign?.components, operationalLoadPercentage]);
  
  // Calculate energy costs based on operational power
  const energyCosts = useMemo(() => {
    const electricityPrice = activeDesign?.requirements?.physicalConstraints?.electricityPricePerKwh ?? 0.25;
    const operationalPowerKw = powerUsage.operationalPower / 1000; // Convert W to kW
    
    const hourlyEnergyCost = operationalPowerKw * electricityPrice;
    const dailyEnergyCost = hourlyEnergyCost * 24;
    const monthlyEnergyCost = dailyEnergyCost * 30; // Approximate month
    const yearlyEnergyCost = dailyEnergyCost * 365;
    
    return {
      hourlyEnergyCost,
      dailyEnergyCost,
      monthlyEnergyCost,
      yearlyEnergyCost
    };
  }, [powerUsage.operationalPower, activeDesign?.requirements?.physicalConstraints?.electricityPricePerKwh]);
  
  return {
    powerUsage,
    energyCosts
  };
};
