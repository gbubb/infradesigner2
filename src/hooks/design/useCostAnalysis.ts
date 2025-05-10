import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useHardwareTotals } from './useHardwareTotals';
import { usePowerCalculations } from './usePowerCalculations';
import { ComponentType } from '@/types/infrastructure';

export const useCostAnalysis = () => {
  // Use primitive selector for better stability
  const activeDesign = useDesignStore(state => state.activeDesign);
  const { actualHardwareTotals } = useHardwareTotals();
  const { energyCosts } = usePowerCalculations();
  
  // Get rack quantity
  const rackQuantity = useMemo(() => {
    return activeDesign?.requirements?.physicalConstraints?.computeStorageRackQuantity || 1;
  }, [activeDesign?.requirements?.physicalConstraints?.computeStorageRackQuantity]);
  
  // Get rack cost per month
  const rackCostPerMonth = useMemo(() => {
    return activeDesign?.requirements?.physicalConstraints?.useColoRacks 
      ? (activeDesign?.requirements?.physicalConstraints?.rackCostPerMonthEuros || 2000)
      : 0;
  }, [
    activeDesign?.requirements?.physicalConstraints?.useColoRacks, 
    activeDesign?.requirements?.physicalConstraints?.rackCostPerMonthEuros
  ]);
  
  // Calculate total capital cost
  const capitalCost = useMemo(() => {
    if (!activeDesign?.components || activeDesign.components.length === 0) return 0;
    // Each component in activeDesign.components is now an individual instance with quantity 1
    // Its cost is the unit cost.
    return activeDesign.components.reduce((total, component) => {
      return total + component.cost; // component.quantity is 1 for each instance
    }, 0);
  }, [activeDesign?.components]);

  // Recalculate cost per vCPU using only compute and non-storage components
  const costPerVCPU = useMemo(() => {
    if (!actualHardwareTotals.totalVCPUs || actualHardwareTotals.totalVCPUs === 0) return 0;
    const computeCapitalCost = activeDesign?.components?.reduce((total, component) => {
      if (component.role !== 'storageNode' && component.type !== ComponentType.Disk) {
        // component.quantity is 1 for each instance
        return total + component.cost;
      }
      return total;
    }, 0) || 0;
    return computeCapitalCost / actualHardwareTotals.totalVCPUs;
  }, [actualHardwareTotals.totalVCPUs, activeDesign?.components]);
  
  // Calculate amortized monthly costs by component type
  const amortizedCostsByType = useMemo(() => {
    if (!activeDesign?.components || activeDesign.components.length === 0) {
      return { compute: 0, storage: 0, network: 0, total: 0 };
    }
    const computeLifespan = activeDesign.requirements?.computeRequirements?.deviceLifespanYears || 3;
    const storageLifespan = activeDesign.requirements?.storageRequirements?.deviceLifespanYears || 3;
    const networkLifespan = activeDesign.requirements?.networkRequirements?.deviceLifespanYears || 3;
    let computeTotal = 0;
    let storageTotal = 0;
    let networkTotal = 0;

    activeDesign.components.forEach(component => {
      // component.quantity is 1 for each instance
      const componentCost = component.cost;
      if (component.role === 'storageNode' || component.type === ComponentType.Disk) {
        storageTotal += componentCost;
      } else if (component.type === ComponentType.Server || component.type === ComponentType.GPU) {
        computeTotal += componentCost;
      } else if (component.type === ComponentType.Switch || component.type === ComponentType.Router || component.type === ComponentType.Firewall) {
        networkTotal += componentCost;
      }
    });

    const monthsInYear = 12;
    const computeAmortized = computeTotal / (computeLifespan * monthsInYear);
    const storageAmortized = storageTotal / (storageLifespan * monthsInYear);
    const networkAmortized = networkTotal / (networkLifespan * monthsInYear);
    const totalAmortized = computeAmortized + storageAmortized + networkAmortized;
    return { compute: computeAmortized, storage: storageAmortized, network: networkAmortized, total: totalAmortized };
  }, [activeDesign?.components, activeDesign?.requirements]); // Simplified dependency array
  
  // Compute operational costs
  const operationalCosts = useMemo(() => {
    const totalRackQuantityValue = (activeDesign?.requirements?.physicalConstraints?.computeStorageRackQuantity || 1) + 
      (activeDesign?.requirements?.networkRequirements?.dedicatedNetworkCoreRacks ? 2 : 0);
    const rackCostPerMonthValue = activeDesign?.requirements?.physicalConstraints?.useColoRacks 
      ? (activeDesign?.requirements?.physicalConstraints?.rackCostPerMonthEuros || 2000)
      : 0;
      
    const rackMonthly = rackCostPerMonthValue * totalRackQuantityValue;
    const energyMonthly = energyCosts.monthlyEnergyCost;
    const amortizedMonthly = amortizedCostsByType.total;
    const totalMonthly = rackMonthly + energyMonthly + amortizedMonthly;
    return { racksMonthly: rackMonthly, energyMonthly, amortizedMonthly, totalMonthly };
  }, [energyCosts.monthlyEnergyCost, amortizedCostsByType.total, activeDesign?.requirements]); // Simplified dependency array
  
  // Calculate TCO for 12 months (operational costs only)
  const totalCostOfOwnership = useMemo(() => {
    return operationalCosts.totalMonthly * 12;
  }, [operationalCosts.totalMonthly]);
  
  // Calculate cost per TB - use storage-related costs divided by usable TB
  const costPerTB = useMemo(() => {
    if (!actualHardwareTotals.totalStorageTB || actualHardwareTotals.totalStorageTB === 0) return 0;
    const storageCapitalCost = activeDesign?.components?.reduce((total, component) => {
      if (component.role === 'storageNode' || component.type === ComponentType.Disk) {
        // component.quantity is 1 for each instance
        return total + component.cost;
      }
      return total;
    }, 0) || 0;
    return storageCapitalCost / actualHardwareTotals.totalStorageTB;
  }, [actualHardwareTotals.totalStorageTB, activeDesign?.components]);

  return {
    capitalCost,
    operationalCosts,
    totalCostOfOwnership,
    costPerVCPU,
    costPerTB,
    amortizedCostsByType
  };
};
