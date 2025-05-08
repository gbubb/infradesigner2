
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

  // Calculate compute-only capital costs (for cost per vCPU)
  const computeCapitalCost = useMemo(() => {
    if (!activeDesign?.components || activeDesign.components.length === 0) return 0;
    
    return activeDesign.components.reduce((total, component) => {
      // Skip storage nodes and disks for compute capital cost calculation
      if (component.role === 'storageNode' || component.type === ComponentType.Disk) {
        return total;
      }
      const quantity = component.quantity || 1;
      return total + (component.cost * quantity);
    }, 0);
  }, [activeDesign?.components]);

  // Recalculate cost per vCPU using only compute nodes
  const costPerVCPU = useMemo(() => {
    if (!actualHardwareTotals.totalVCPUs || actualHardwareTotals.totalVCPUs === 0) return 0;
    
    // Use the compute-only capital cost for this calculation
    return computeCapitalCost / actualHardwareTotals.totalVCPUs;
  }, [actualHardwareTotals.totalVCPUs, computeCapitalCost]);
  
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
      
      // Determine which category this component belongs to
      if (component.role === 'storageNode' || component.type === ComponentType.Disk) {
        // Storage nodes and disks are part of storage costs
        storageTotal += componentCost;
      }
      else if (component.type === ComponentType.Server || component.type === ComponentType.GPU) {
        // All other servers and GPUs are compute costs
        computeTotal += componentCost;
      }
      else if (
        component.type === ComponentType.Switch || 
        component.type === ComponentType.Router || 
        component.type === ComponentType.Firewall
      ) {
        // Network equipment
        networkTotal += componentCost;
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
    const totalRackQuantity = rackQuantity + 
      (activeDesign?.requirements?.networkRequirements?.dedicatedNetworkCoreRacks ? 2 : 0);
      
    const rackMonthly = rackCostPerMonth * totalRackQuantity;
    const energyMonthly = energyCosts.monthlyEnergyCost;
    const amortizedMonthly = amortizedCostsByType.total;
    const totalMonthly = rackMonthly + energyMonthly + amortizedMonthly;
    
    return {
      racksMonthly: rackMonthly,
      energyMonthly,
      amortizedMonthly,
      totalMonthly
    };
  }, [rackCostPerMonth, rackQuantity, energyCosts.monthlyEnergyCost, amortizedCostsByType.total, activeDesign?.requirements?.networkRequirements?.dedicatedNetworkCoreRacks]);
  
  // Calculate TCO for 12 months (operational costs only)
  const totalCostOfOwnership = useMemo(() => {
    return operationalCosts.totalMonthly * 12;
  }, [operationalCosts.totalMonthly]);
  
  // Calculate storage-only capital costs (for cost per TB)
  const storageCapitalCost = useMemo(() => {
    if (!activeDesign?.components || activeDesign.components.length === 0) return 0;
    
    return activeDesign.components.reduce((total, component) => {
      if (component.role === 'storageNode' || component.type === ComponentType.Disk) {
        const quantity = component.quantity || 1;
        return total + (component.cost * quantity);
      }
      return total;
    }, 0);
  }, [activeDesign?.components]);
  
  // Calculate cost per TB - use storage-related costs divided by usable TB
  const costPerTB = useMemo(() => {
    if (!actualHardwareTotals.totalStorageTB || actualHardwareTotals.totalStorageTB === 0) return 0;
    
    // Use the storage-only capital cost for this calculation
    return storageCapitalCost / actualHardwareTotals.totalStorageTB;
  }, [actualHardwareTotals.totalStorageTB, storageCapitalCost]);

  return {
    capitalCost,
    computeCapitalCost,
    storageCapitalCost,
    operationalCosts,
    totalCostOfOwnership,
    costPerVCPU,
    costPerTB,
    amortizedCostsByType
  };
};
