
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';

export const useResourceMetrics = () => {
  const { activeDesign, requirements } = useDesignStore();
  
  const resourceMetrics = useMemo(() => {
    if (!activeDesign?.components) {
      return {
        totalRackUnits: 0,
        totalPower: 0,
        minimumPower: 0,
        operationalPower: 0,
        totalServers: 0,
        totalLeafSwitches: 0,
        totalMgmtSwitches: 0,
        leafPortsUsed: 0,
        leafPortsAvailable: 0,
        mgmtPortsUsed: 0,
        mgmtPortsAvailable: 0,
        totalAvailableRU: 0,
        totalAvailablePower: 0,
        totalRackQuantity: 0,
        monthlyEnergyCost: 0,
        dailyEnergyCost: 0,
        monthlyColoCost: 0
      };
    }
    
    const computeStorageRacks = requirements.physicalConstraints.computeStorageRackQuantity || 0;
    const networkCoreRacks = requirements.networkRequirements.dedicatedNetworkCoreRacks ? 2 : 0;
    const totalRackQuantity = computeStorageRacks + networkCoreRacks;
    
    const ruPerRack = requirements.physicalConstraints.rackUnitsPerRack || 42;
    const powerPerRack = requirements.physicalConstraints.powerPerRackWatts || 0;
    
    const totalAvailableRU = totalRackQuantity * ruPerRack;
    const totalAvailablePower = totalRackQuantity * powerPerRack;
    
    let totalServers = 0;
    let totalLeafSwitches = 0;
    let totalMgmtSwitches = 0;
    let leafPortsUsed = 0;
    let leafPortsAvailable = 0;
    let mgmtPortsUsed = 0;
    let mgmtPortsAvailable = 0;
    
    const ipmiNetwork = requirements.networkRequirements.ipmiNetwork || 'Management converged';
    
    // Calculate power metrics
    let totalMaxPower = 0;
    let totalMinPower = 0;
    let totalOperationalPower = 0;
    
    // Get operational load percentage (1-100)
    const operationalLoadPercent = requirements.physicalConstraints.operationalCosts?.operationalLoad || 50;
    const operationalLoadFraction = operationalLoadPercent / 100;
    
    // Energy cost calculations
    const energyPricePerKwh = requirements.physicalConstraints.operationalCosts?.energyPricePerKwh || 0.25;
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      // Calculate power metrics
      const maxPower = component.powerRequired * quantity;
      totalMaxPower += maxPower;
      
      // Minimum power is 1/3 of maximum power
      const minPower = maxPower / 3;
      totalMinPower += minPower;
      
      // Operational power = min power + (operational load * remaining 2/3 power)
      const remainingPower = maxPower - minPower;
      const operationalPower = minPower + (operationalLoadFraction * remainingPower);
      totalOperationalPower += operationalPower;
      
      // Add to total rack units if applicable
      if ('rackUnitsConsumed' in component) {
        totalRackUnits += (component as any).rackUnitsConsumed * quantity;
      }
      
      if (component.type === ComponentType.Server) {
        totalServers += quantity;
        
        // Calculate leaf ports used by servers
        if ('portsConsumedQuantity' in component) {
          leafPortsUsed += (component as any).portsConsumedQuantity * quantity;
          console.log(`Server ${component.name} using ${(component as any).portsConsumedQuantity} leaf ports per unit, ${(component as any).portsConsumedQuantity * quantity} total`);
        } else {
          // Default to 2 ports per server if not specified
          leafPortsUsed += 2 * quantity;
          console.log(`Server ${component.name} using default 2 leaf ports per unit, ${2 * quantity} total`);
        }
        
        // Calculate management ports used by servers - always at least 1 for IPMI/management
        if (requirements.networkRequirements.managementNetwork === 'Dual Home') {
          mgmtPortsUsed += 2 * quantity;
          console.log(`Server ${component.name} using 2 mgmt ports (Dual Home) per unit, ${2 * quantity} total`);
        } else {
          mgmtPortsUsed += 1 * quantity;
          console.log(`Server ${component.name} using 1 mgmt port per unit, ${1 * quantity} total`);
        }
        
        // Add another management port if we have a separate IPMI network
        if (ipmiNetwork === 'Dedicated IPMI switch') {
          mgmtPortsUsed += 1 * quantity;
          console.log(`Server ${component.name} using 1 additional IPMI port per unit, ${1 * quantity} total (dedicated IPMI)`);
        }
      } else if (component.type === ComponentType.Switch) {
        if (component.role === 'managementSwitch') {
          totalMgmtSwitches += quantity;
          
          // Calculate available management ports
          if ('portsProvidedQuantity' in component && component.portsProvidedQuantity) {
            mgmtPortsAvailable += component.portsProvidedQuantity * quantity;
            console.log(`Management switch ${component.name}: ${component.portsProvidedQuantity} ports × ${quantity} units = ${component.portsProvidedQuantity * quantity} mgmt ports available`);
          } else if ('portCount' in component && component.portCount) {
            mgmtPortsAvailable += component.portCount * quantity;
            console.log(`Management switch ${component.name}: ${component.portCount} ports × ${quantity} units = ${component.portCount * quantity} mgmt ports available`);
          }
        } else if (component.role === 'computeSwitch' || component.role === 'storageSwitch' || component.role === 'borderLeafSwitch' || component.role === 'leafSwitch') {
          totalLeafSwitches += quantity;
          
          // Calculate available leaf ports
          if ('portsProvidedQuantity' in component && component.portsProvidedQuantity) {
            leafPortsAvailable += component.portsProvidedQuantity * quantity;
            console.log(`Leaf switch ${component.name}: ${component.portsProvidedQuantity} ports × ${quantity} units = ${component.portsProvidedQuantity * quantity} leaf ports available`);
          } else if ('portCount' in component && component.portCount) {
            leafPortsAvailable += component.portCount * quantity;
            console.log(`Leaf switch ${component.name}: ${component.portCount} ports × ${quantity} units = ${component.portCount * quantity} leaf ports available`);
          }
        }
      }
    });
    
    // Calculate energy costs
    const operationalPowerKw = totalOperationalPower / 1000; // Convert watts to kilowatts
    const dailyEnergyCost = operationalPowerKw * 24 * energyPricePerKwh;
    const monthlyEnergyCost = dailyEnergyCost * 30; // Assuming 30 days per month
    
    // Calculate colocation costs if enabled
    let monthlyColoCost = 0;
    if (requirements.physicalConstraints.operationalCosts?.coloRacks) {
      const rackCostPerMonth = requirements.physicalConstraints.operationalCosts.rackCostPerMonth || 0;
      monthlyColoCost = totalRackQuantity * rackCostPerMonth;
    }
    
    console.log(`Total resource metrics calculated: 
      Leaf ports - Used: ${leafPortsUsed}, Available: ${leafPortsAvailable}
      Mgmt ports - Used: ${mgmtPortsUsed}, Available: ${mgmtPortsAvailable}
      Power - Min: ${totalMinPower}W, Operational: ${totalOperationalPower}W, Max: ${totalMaxPower}W
      Energy costs - Daily: €${dailyEnergyCost.toFixed(2)}, Monthly: €${monthlyEnergyCost.toFixed(2)}
      Colocation costs - Monthly: €${monthlyColoCost.toFixed(2)}`);
    
    return {
      totalRackUnits,
      totalPower: totalMaxPower,
      minimumPower: totalMinPower,
      operationalPower: totalOperationalPower,
      totalServers,
      totalLeafSwitches,
      totalMgmtSwitches,
      leafPortsUsed,
      leafPortsAvailable,
      mgmtPortsUsed,
      mgmtPortsAvailable,
      totalAvailableRU,
      totalAvailablePower,
      totalRackQuantity,
      monthlyEnergyCost,
      dailyEnergyCost,
      monthlyColoCost
    };
  }, [activeDesign, requirements]);
  
  // Calculate resource utilization percentages
  const resourceUtilization = useMemo(() => {
    const {
      totalPower, 
      totalRackUnits, 
      leafPortsUsed, 
      leafPortsAvailable,
      mgmtPortsUsed,
      mgmtPortsAvailable,
      totalAvailableRU,
      totalAvailablePower
    } = resourceMetrics;
    
    return {
      powerUtilization: {
        percentage: totalAvailablePower > 0 ? (totalPower / totalAvailablePower) * 100 : 0,
        used: totalPower,
        total: totalAvailablePower
      },
      spaceUtilization: {
        percentage: totalAvailableRU > 0 ? (totalRackUnits / totalAvailableRU) * 100 : 0,
        used: totalRackUnits,
        total: totalAvailableRU
      },
      leafNetworkUtilization: {
        percentage: leafPortsAvailable > 0 ? (leafPortsUsed / leafPortsAvailable) * 100 : (leafPortsUsed > 0 ? 100 : 0),
        used: leafPortsUsed,
        total: leafPortsAvailable
      },
      mgmtNetworkUtilization: {
        percentage: mgmtPortsAvailable > 0 ? (mgmtPortsUsed / mgmtPortsAvailable) * 100 : (mgmtPortsUsed > 0 ? 100 : 0),
        used: mgmtPortsUsed,
        total: mgmtPortsAvailable
      }
    };
  }, [resourceMetrics]);

  return {
    resourceMetrics,
    resourceUtilization
  };
};
