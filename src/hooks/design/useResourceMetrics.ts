
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
        totalServers: 0,
        totalLeafSwitches: 0,
        totalMgmtSwitches: 0,
        leafPortsUsed: 0,
        leafPortsAvailable: 0,
        mgmtPortsUsed: 0,
        mgmtPortsAvailable: 0,
        totalAvailableRU: 0,
        totalAvailablePower: 0,
        totalRackQuantity: 0
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
    
    // Calculate total power and rack units
    let totalPower = 0;
    let totalRackUnits = 0;
    
    // Debug counters
    const switchPortDetails = {};
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      // Add to total power
      totalPower += component.powerRequired * quantity;
      
      // Add to total rack units if applicable
      if ('rackUnitsConsumed' in component) {
        totalRackUnits += (component as any).rackUnitsConsumed * quantity;
      }
      
      if (component.type === ComponentType.Server) {
        totalServers += quantity;
        
        // Calculate ports used by servers for leaf connections
        let serverLeafPortsUsed = 2; // Default if not specified
        if ('portsConsumedQuantity' in component && (component as any).portsConsumedQuantity > 0) {
          serverLeafPortsUsed = (component as any).portsConsumedQuantity;
        }
        
        leafPortsUsed += serverLeafPortsUsed * quantity;
        
        // Calculate ports used by servers for management connections
        let serverMgmtPortsUsed = 1; // Default if not specified
        if (requirements.networkRequirements.managementNetwork === 'Dual Home') {
          serverMgmtPortsUsed = 2;
        }
        
        mgmtPortsUsed += serverMgmtPortsUsed * quantity;
        
        // Add IPMI ports if needed
        if (ipmiNetwork === 'Management converged') {
          mgmtPortsUsed += quantity;
        }
      } else if (component.type === ComponentType.Switch) {
        // Calculate switch ports
        let portCount = 0;
        
        // Try different properties for port counts with detailed logging
        if ('portsProvidedQuantity' in component && (component as any).portsProvidedQuantity > 0) {
          portCount = (component as any).portsProvidedQuantity;
          console.log(`Switch ${component.name} using portsProvidedQuantity: ${portCount}`);
        } else if ('portCount' in component && (component as any).portCount > 0) {
          portCount = (component as any).portCount;
          console.log(`Switch ${component.name} using portCount: ${portCount}`);
        } else {
          console.warn(`Switch ${component.name} has no valid port count property`);
        }
        
        // Track switch details for debugging
        if (!(component.role in switchPortDetails)) {
          switchPortDetails[component.role] = {
            count: 0,
            totalPorts: 0,
            switches: []
          };
        }
        
        switchPortDetails[component.role].count += quantity;
        switchPortDetails[component.role].totalPorts += portCount * quantity;
        switchPortDetails[component.role].switches.push({
          name: component.name, 
          quantity, 
          portsPerSwitch: portCount,
          totalPorts: portCount * quantity
        });
        
        // Add ports based on switch role
        if (component.role === 'managementSwitch') {
          totalMgmtSwitches += quantity;
          mgmtPortsAvailable += portCount * quantity;
        } else if (['computeSwitch', 'storageSwitch', 'borderLeafSwitch', 'leafSwitch'].includes(component.role)) {
          totalLeafSwitches += quantity;
          leafPortsAvailable += portCount * quantity;
        }
      }
    });
    
    // Log switch port details for debugging
    console.log('Switch port details:', switchPortDetails);
    console.log('Final ports calculation:', {
      leafSwitches: totalLeafSwitches,
      leafPortsAvailable,
      leafPortsUsed,
      mgmtSwitches: totalMgmtSwitches,
      mgmtPortsAvailable,
      mgmtPortsUsed
    });
    
    return {
      totalRackUnits,
      totalPower,
      totalServers,
      totalLeafSwitches,
      totalMgmtSwitches,
      leafPortsUsed,
      leafPortsAvailable,
      mgmtPortsUsed,
      mgmtPortsAvailable,
      totalAvailableRU,
      totalAvailablePower,
      totalRackQuantity
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
