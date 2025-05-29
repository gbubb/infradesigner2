
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

  // Calculate licensing costs
  const licensingCosts = useMemo(() => {
    const licensingReqs = activeDesign?.requirements?.licensingRequirements;
    if (!licensingReqs) {
      return { oneTime: 0, monthly: 0 };
    }

    let oneTimeCosts = 0;
    let monthlyCosts = 0;

    // Support cost per node with frequency
    if (licensingReqs.supportCostPerNode) {
      const totalNodes = (activeDesign?.components || []).filter(
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

    return { oneTime: oneTimeCosts, monthly: monthlyCosts };
  }, [activeDesign?.requirements?.licensingRequirements, activeDesign?.components]);
  
  // Calculate total capital cost (including one-time licensing costs)
  const capitalCost = useMemo(() => {
    if (!activeDesign?.components || activeDesign.components.length === 0) return 0;
    
    const hardwareCost = activeDesign.components.reduce((total, component) => {
      return total + component.cost;
    }, 0);
    
    return hardwareCost + licensingCosts.oneTime;
  }, [activeDesign?.components, licensingCosts.oneTime]);

  // Recalculate cost per vCPU using only compute and non-storage components
  const costPerVCPU = useMemo(() => {
    if (!actualHardwareTotals.totalVCPUs || actualHardwareTotals.totalVCPUs === 0) return 0;
    const computeCapitalCost = activeDesign?.components?.reduce((total, component) => {
      if (component.role !== 'storageNode' && component.type !== ComponentType.Disk) {
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
  }, [activeDesign?.components, activeDesign?.requirements]);
  
  // Compute operational costs (including licensing)
  const operationalCosts = useMemo(() => {
    const totalRackQuantityValue = (activeDesign?.requirements?.physicalConstraints?.computeStorageRackQuantity || 1) + 
      (activeDesign?.requirements?.networkRequirements?.dedicatedNetworkCoreRacks ? 2 : 0);
    const rackCostPerMonthValue = activeDesign?.requirements?.physicalConstraints?.useColoRacks 
      ? (activeDesign?.requirements?.physicalConstraints?.rackCostPerMonthEuros || 2000)
      : 0;
      
    const rackMonthly = rackCostPerMonthValue * totalRackQuantityValue;
    const energyMonthly = energyCosts.monthlyEnergyCost;
    const amortizedMonthly = amortizedCostsByType.total;
    const licensingMonthly = licensingCosts.monthly;
    const totalMonthly = rackMonthly + energyMonthly + amortizedMonthly + licensingMonthly;
    
    return { 
      racksMonthly: rackMonthly, 
      energyMonthly, 
      amortizedMonthly, 
      licensingMonthly,
      totalMonthly 
    };
  }, [energyCosts.monthlyEnergyCost, amortizedCostsByType.total, licensingCosts.monthly, activeDesign?.requirements]);
  
  // Calculate TCO for 12 months (operational costs only)
  const totalCostOfOwnership = useMemo(() => {
    return operationalCosts.totalMonthly * 12;
  }, [operationalCosts.totalMonthly]);
  
  // Calculate cost per TB - use storage-related costs divided by usable TB
  const costPerTB = useMemo(() => {
    if (!actualHardwareTotals.totalStorageTB || actualHardwareTotals.totalStorageTB === 0) return 0;
    const storageCapitalCost = activeDesign?.components?.reduce((total, component) => {
      if (component.role === 'storageNode' || component.type === ComponentType.Disk) {
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
    amortizedCostsByType,
    licensingCosts
  };
};
