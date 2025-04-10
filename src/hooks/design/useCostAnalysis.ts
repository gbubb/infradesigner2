
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
    return activeDesign.components.reduce((total, component) => {
      const quantity = component.quantity || 1;
      return total + (component.cost * quantity);
    }, 0);
  }, [activeDesign?.components]);
  
  // Calculate amortized monthly costs by component type
  const amortizedCostsByType = useMemo(() => {
    if (!activeDesign?.components || activeDesign.components.length === 0) {
      return {
        compute: 0,
        storage: 0,
        network: 0,
        total: 0
      };
    }
    
    // Get device lifespans (in years)
    const computeLifespan = activeDesign.requirements?.computeRequirements?.deviceLifespanYears || 3;
    const storageLifespan = activeDesign.requirements?.storageRequirements?.deviceLifespanYears || 3;
    const networkLifespan = activeDesign.requirements?.networkRequirements?.deviceLifespanYears || 3;
    
    // Group components by type and calculate amortized monthly cost
    let computeTotal = 0;
    let storageTotal = 0;
    let networkTotal = 0;
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      const componentCost = component.cost * quantity;
      
      // Determine component category and lifespan
      let lifespan = 3; // Default
      
      if (component.type === ComponentType.Server || component.type === ComponentType.GPU) {
        computeTotal += componentCost;
        lifespan = computeLifespan;
      } else if (component.type === ComponentType.Disk) {
        storageTotal += componentCost;
        lifespan = storageLifespan;
      } else if (component.type === ComponentType.Switch || component.type === ComponentType.Router || component.type === ComponentType.Firewall) {
        networkTotal += componentCost;
        lifespan = networkLifespan;
      }
    });
    
    // Calculate monthly amortized cost for each category
    const monthsInYear = 12;
    const computeAmortized = computeTotal / (computeLifespan * monthsInYear);
    const storageAmortized = storageTotal / (storageLifespan * monthsInYear);
    const networkAmortized = networkTotal / (networkLifespan * monthsInYear);
    const totalAmortized = computeAmortized + storageAmortized + networkAmortized;
    
    return {
      compute: computeAmortized,
      storage: storageAmortized,
      network: networkAmortized,
      total: totalAmortized
    };
  }, [
    activeDesign?.components, 
    activeDesign?.requirements?.computeRequirements?.deviceLifespanYears,
    activeDesign?.requirements?.storageRequirements?.deviceLifespanYears,
    activeDesign?.requirements?.networkRequirements?.deviceLifespanYears
  ]);
  
  // Compute operational costs
  const operationalCosts = useMemo(() => {
    const rackMonthly = rackCostPerMonth * rackQuantity;
    const energyMonthly = energyCosts.monthlyEnergyCost;
    const amortizedMonthly = amortizedCostsByType.total;
    const totalMonthly = rackMonthly + energyMonthly + amortizedMonthly;
    
    return {
      racksMonthly: rackMonthly,
      energyMonthly,
      amortizedMonthly,
      totalMonthly
    };
  }, [rackCostPerMonth, rackQuantity, energyCosts.monthlyEnergyCost, amortizedCostsByType.total]);
  
  // Calculate TCO (Total Cost of Ownership) for 1 year
  const totalCostOfOwnership = useMemo(() => {
    return capitalCost + (operationalCosts.totalMonthly * 12);
  }, [capitalCost, operationalCosts.totalMonthly]);
  
  // Cost metrics
  const costPerVCPU = useMemo(() => {
    if (!actualHardwareTotals.totalVCPUs || actualHardwareTotals.totalVCPUs === 0 || !capitalCost) return 0;
    
    // Calculate compute-related capital costs
    const computeCapitalCost = activeDesign?.components?.reduce((total, component) => {
      if (component.type === ComponentType.Server || component.type === ComponentType.GPU) {
        const quantity = component.quantity || 1;
        return total + (component.cost * quantity);
      }
      return total;
    }, 0) || 0;
    
    return computeCapitalCost / actualHardwareTotals.totalVCPUs;
  }, [actualHardwareTotals.totalVCPUs, activeDesign?.components, capitalCost]);
  
  const costPerTB = useMemo(() => {
    if (!actualHardwareTotals.totalStorageTB || actualHardwareTotals.totalStorageTB === 0) return 0;
    
    // Calculate storage-related capital costs
    const storageCapitalCost = activeDesign?.components?.reduce((total, component) => {
      if (component.type === ComponentType.Disk || (component.type === ComponentType.Server && component.role === 'storageNode')) {
        const quantity = component.quantity || 1;
        return total + (component.cost * quantity);
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
