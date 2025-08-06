import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useHardwareTotals } from './useHardwareTotals';
import { usePowerCalculations } from './usePowerCalculations';
import { useRackLayout } from './useRackLayout';
import { useStorageClustersWrapper } from './useStorageClustersWrapper';
import { ComponentType } from '@/types/infrastructure';
import { DatacenterCostCalculator } from '@/services/datacenter/DatacenterCostCalculator';

export const useCostAnalysis = () => {
  // Use primitive selector for better stability
  const activeDesign = useDesignStore(state => state.activeDesign);
  const { actualHardwareTotals } = useHardwareTotals();
  const { energyCosts } = usePowerCalculations();
  const { racks } = useRackLayout();
  const { storageClustersMetrics } = useStorageClustersWrapper();
  
  // Get facility data
  const getFacilityById = useDesignStore(state => state.getFacilityById);
  const facilityType = activeDesign?.requirements?.physicalConstraints?.facilityType || 'none';
  const selectedFacilityId = activeDesign?.requirements?.physicalConstraints?.selectedFacilityId;
  const selectedFacility = selectedFacilityId ? getFacilityById(selectedFacilityId) : null;
  
  // Get rack quantity
  const rackQuantity = useMemo(() => {
    return activeDesign?.requirements?.physicalConstraints?.computeStorageRackQuantity || 1;
  }, [activeDesign?.requirements?.physicalConstraints?.computeStorageRackQuantity]);
  
  // Calculate facility costs if owned datacenter is selected
  const facilityCosts = useMemo(() => {
    if (facilityType !== 'owned' || !selectedFacility || !racks) {
      return null;
    }
    
    const calculator = new DatacenterCostCalculator(selectedFacility, racks);
    return calculator.calculateFacilityCosts();
  }, [facilityType, selectedFacility, racks]);
  
  // Get rack cost per month (colocation or facility-based)
  const rackCostPerMonth = useMemo(() => {
    if (facilityType === 'colocation') {
      return activeDesign?.requirements?.physicalConstraints?.rackCostPerMonthEuros || 2000;
    } else if (facilityType === 'owned' && facilityCosts) {
      return facilityCosts.costPerRack;
    }
    return 0;
  }, [
    facilityType,
    activeDesign?.requirements?.physicalConstraints?.rackCostPerMonthEuros,
    facilityCosts
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

    // For hyper-converged scenarios, use the storage cluster metrics that include 
    // proportional server costs attributed to storage
    const totalStorageCost = storageClustersMetrics.reduce((total, cluster) => {
      if (cluster.isHyperConverged && cluster.totalStorageCost) {
        return total + cluster.totalStorageCost;
      } else {
        return total + cluster.totalNodeCost;
      }
    }, 0);

    // If we have storage clusters with calculated costs, use those
    if (totalStorageCost > 0) {
      storageTotal = totalStorageCost;
      
      // For compute total, exclude components that are part of storage clusters
      activeDesign.components.forEach(component => {
        const componentCost = component.cost;
        const isStorageComponent = component.role === 'storageNode' || 
                                  component.role === 'hyperConvergedNode' || 
                                  component.type === ComponentType.Disk;
        
        if (!isStorageComponent) {
          if (component.type === ComponentType.Server || component.type === ComponentType.GPU) {
            computeTotal += componentCost;
          } else if (component.type === ComponentType.Switch || component.type === ComponentType.Router || component.type === ComponentType.Firewall) {
            networkTotal += componentCost;
          }
        }
      });
    } else {
      // Fallback to component-level calculation
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
    }

    const monthsInYear = 12;
    const computeAmortized = computeTotal / (computeLifespan * monthsInYear);
    const storageAmortized = storageTotal / (storageLifespan * monthsInYear);
    const networkAmortized = networkTotal / (networkLifespan * monthsInYear);
    const totalAmortized = computeAmortized + storageAmortized + networkAmortized;
    return { compute: computeAmortized, storage: storageAmortized, network: networkAmortized, total: totalAmortized };
  }, [activeDesign?.components, activeDesign?.requirements, storageClustersMetrics]);
  
  // Compute operational costs (including licensing)
  const operationalCosts = useMemo(() => {
    const totalRackQuantityValue = (activeDesign?.requirements?.physicalConstraints?.computeStorageRackQuantity || 1) + 
      (activeDesign?.requirements?.networkRequirements?.dedicatedNetworkCoreRacks ? 2 : 0);
    
    let rackMonthly = 0;
    let facilityMonthly = 0;
    
    if (facilityType === 'colocation') {
      const rackCostPerMonthValue = activeDesign?.requirements?.physicalConstraints?.rackCostPerMonthEuros || 2000;
      rackMonthly = rackCostPerMonthValue * totalRackQuantityValue;
    } else if (facilityType === 'owned' && facilityCosts) {
      // For owned facilities, use the total monthly facility cost
      facilityMonthly = facilityCosts.totalMonthlyCost;
    }
    
    const energyMonthly = facilityType === 'owned' ? 0 : energyCosts.monthlyEnergyCost; // Energy included in facility costs
    const amortizedMonthly = amortizedCostsByType.total;
    const licensingMonthly = licensingCosts.monthly;
    const networkMonthly = amortizedCostsByType.network;
    const totalMonthly = rackMonthly + facilityMonthly + energyMonthly + amortizedMonthly + licensingMonthly + networkMonthly;
    
    return { 
      racksMonthly: rackMonthly,
      facilityMonthly: facilityMonthly,
      energyMonthly, 
      amortizedMonthly, 
      licensingMonthly,
      networkMonthly,
      totalMonthly 
    };
  }, [
    energyCosts.monthlyEnergyCost, 
    amortizedCostsByType, 
    licensingCosts.monthly, 
    activeDesign?.requirements,
    facilityType,
    facilityCosts
  ]);
  
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
    licensingCosts,
    facilityCosts,
    facilityType
  };
};
