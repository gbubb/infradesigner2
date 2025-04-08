
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { DesignRequirements } from '@/types/infrastructure';

export const useResourceMetrics = () => {
  const { activeDesign } = useDesignStore();
  
  // Calculate resource metrics
  const resourceMetrics = useMemo(() => {
    // Initialize metrics
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
        powerUtilization: 0,
        spaceUtilization: 0,
        leafNetworkUtilization: 0,
        mgmtNetworkUtilization: 0
      }
    };
    
    // Return default metrics if no active design
    if (!activeDesign || !activeDesign.components || activeDesign.components.length === 0) {
      return metrics;
    }
    
    // Initialize requirements with proper type checking
    const requirements: DesignRequirements = activeDesign.requirements || {} as DesignRequirements;
    
    // Set default values for physical constraints if not defined
    const physicalConstraints = requirements.physicalConstraints || {};
    const rackUnitsPerRack = physicalConstraints.rackUnitsPerRack || 42;
    
    // Get operational costs with proper null checks
    const operationalCosts = physicalConstraints.operationalCosts || {
      coloRacks: false,
      energyPricePerKwh: 0.25,
      operationalLoad: 50
    };
    
    // Get colo rack settings
    const coloRacks = operationalCosts?.coloRacks || false;
    const rackCostPerMonth = operationalCosts?.rackCostPerMonth || 0;
    const operationalLoad = operationalCosts?.operationalLoad || 50;
    
    // Energy cost calculations
    const energyPricePerKwh = operationalCosts?.energyPricePerKwh || 0.25;
    
    let totalRackUnitsUsed = 0;
    
    // Get device lifespans (years) with proper null checks
    const computeRequirements = requirements.computeRequirements || {};
    const storageRequirements = requirements.storageRequirements || {};
    const networkRequirements = requirements.networkRequirements || {};
    
    const computeLifespan = computeRequirements?.deviceLifespanYears || 3;
    const storageLifespan = storageRequirements?.deviceLifespanYears || 3;
    const networkLifespan = networkRequirements?.deviceLifespanYears || 3;
    
    // Track component costs by category for amortization
    let totalComputeCost = 0;
    let totalStorageCost = 0;
    let totalNetworkCost = 0;
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      const componentCost = component.cost * quantity;
      
      // Add to rack units count
      if ('rackUnitsConsumed' in component) {
        metrics.totalRackUnits += (component.rackUnitsConsumed || 0) * quantity;
        totalRackUnitsUsed += (component.rackUnitsConsumed || 0) * quantity;
      }
      
      // Power calculations
      const maxPower = component.powerRequired * quantity;
      const minPower = maxPower / 3;
      const opLoad = operationalLoad / 100;
      const operPower = minPower + ((maxPower - minPower) * opLoad);
      
      metrics.totalPower += maxPower;
      metrics.minimumPower += minPower;
      metrics.operationalPower += operPower;
      
      // Categorize components for amortization
      if (component.type === 'Server') {
        metrics.totalServers += quantity;
        
        // Track compute costs for amortization
        if (component.role !== 'storageNode') {
          totalComputeCost += componentCost;
        } else {
          totalStorageCost += componentCost;
        }
      } else if (component.type === 'Switch') {
        if (component.role === 'leafSwitch') {
          metrics.totalLeafSwitches += quantity;
        } else if (component.role === 'managementSwitch') {
          metrics.totalMgmtSwitches += quantity;
        }
        
        totalNetworkCost += componentCost;
      } else if (component.type === 'Disk') {
        totalStorageCost += componentCost;
      } else if (component.type === 'Firewall') {
        totalNetworkCost += componentCost;
      }
    });
    
    // Calculate required racks based on rack units
    metrics.totalRackQuantity = Math.ceil(metrics.totalRackUnits / rackUnitsPerRack);
    
    // Calculate energy costs
    // Operational power is in watts, convert to kW for cost calculation
    const operationalPowerKW = metrics.operationalPower / 1000;
    
    // Daily cost = power in kW * 24 hours * cost per kWh
    metrics.dailyEnergyCost = operationalPowerKW * 24 * energyPricePerKwh;
    
    // Monthly cost = daily cost * 30 days (approx)
    metrics.monthlyEnergyCost = metrics.dailyEnergyCost * 30;
    
    // Calculate colocation costs if enabled
    if (coloRacks) {
      metrics.monthlyColoCost = metrics.totalRackQuantity * rackCostPerMonth;
    }
    
    // Calculate amortized costs (converting years to months)
    metrics.monthlyAmortizedComputeCost = totalComputeCost / (computeLifespan * 12);
    metrics.monthlyAmortizedStorageCost = totalStorageCost / (storageLifespan * 12);
    metrics.monthlyAmortizedNetworkCost = totalNetworkCost / (networkLifespan * 12);
    metrics.totalMonthlyAmortizedCost = 
      metrics.monthlyAmortizedComputeCost +
      metrics.monthlyAmortizedStorageCost +
      metrics.monthlyAmortizedNetworkCost;
    
    // Calculate percentages for utilization
    // Power utilization (as % of maximum)
    if (metrics.totalPower > 0) {
      metrics.utilization.powerUtilization = (metrics.operationalPower / metrics.totalPower) * 100;
    }
    
    // Space utilization
    const maxRackUnits = metrics.totalRackQuantity * rackUnitsPerRack;
    if (maxRackUnits > 0) {
      metrics.utilization.spaceUtilization = (totalRackUnitsUsed / maxRackUnits) * 100;
    }
    
    // Network utilization (this part could be enhanced with actual network usage data)
    // For now use simple approximations
    const maxLeafPorts = metrics.totalLeafSwitches * 48; // Assuming 48 ports per leaf switch
    const usedLeafPorts = metrics.totalServers * 2; // Assuming dual-homing
    
    if (maxLeafPorts > 0) {
      metrics.utilization.leafNetworkUtilization = Math.min((usedLeafPorts / maxLeafPorts) * 100, 100);
    }
    
    const maxMgmtPorts = metrics.totalMgmtSwitches * 48; // Assuming 48 ports per management switch
    const usedMgmtPorts = metrics.totalServers; // Assuming single management connection
    
    if (maxMgmtPorts > 0) {
      metrics.utilization.mgmtNetworkUtilization = Math.min((usedMgmtPorts / maxMgmtPorts) * 100, 100);
    }
    
    return metrics;
  }, [activeDesign]);
  
  // Extract utilization to avoid TypeScript error
  const { utilization, ...metrics } = resourceMetrics;
  
  return { resourceMetrics: metrics, resourceUtilization: utilization };
};
