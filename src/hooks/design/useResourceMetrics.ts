
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';

export const useResourceMetrics = () => {
  const { activeDesign } = useDesignStore();
  
  const resourceMetrics = useMemo(() => {
    if (!activeDesign?.components) {
      return {
        totalRackUnits: 0,
        totalPower: 0,
        totalServers: 0,
        totalLeafSwitches: 0,
        totalStorageSwitches: 0,
        totalMgmtSwitches: 0,
        leafPortsUsed: 0,
        leafPortsAvailable: 0,
        storagePortsUsed: 0,
        storagePortsAvailable: 0,
        mgmtPortsUsed: 0,
        mgmtPortsAvailable: 0,
        totalAvailableRU: 0,
        totalAvailablePower: 0,
        totalRackQuantity: 0,
        computeRackUnits: 0,
        networkRackUnits: 0
      };
    }
    
    const computeStorageRacks = activeDesign.requirements?.physicalConstraints?.computeStorageRackQuantity || 0;
    const networkCoreRacks = activeDesign.requirements?.networkRequirements?.dedicatedNetworkCoreRacks ? 2 : 0;
    const totalRackQuantity = computeStorageRacks + networkCoreRacks;
    
    const ruPerRack = activeDesign.requirements?.physicalConstraints?.rackUnitsPerRack || 42;
    const powerPerRack = activeDesign.requirements?.physicalConstraints?.powerPerRackWatts || 0;
    
    const totalAvailableRU = totalRackQuantity * ruPerRack;
    const totalAvailablePower = totalRackQuantity * powerPerRack;
    
    // Calculate available RUs for compute vs network racks
    const computeRackRUs = computeStorageRacks * ruPerRack;
    const networkRackRUs = networkCoreRacks * ruPerRack;
    
    let totalServers = 0;
    let totalLeafSwitches = 0;
    let totalStorageSwitches = 0;
    let totalMgmtSwitches = 0;
    let leafPortsUsed = 0;
    let leafPortsAvailable = 0;
    let storagePortsUsed = 0;
    let storagePortsAvailable = 0;
    let mgmtPortsUsed = 0;
    let mgmtPortsAvailable = 0;
    
    // Check if dedicated storage network is enabled
    const hasDedicatedStorageNetwork = activeDesign.requirements?.networkRequirements?.dedicatedStorageNetwork || false;
    const ipmiNetwork = activeDesign.requirements?.networkRequirements?.ipmiNetwork || 'Management converged';
    const managementNetwork = activeDesign.requirements?.networkRequirements?.managementNetwork || 'Dual Home';
    const isConvergedManagement = managementNetwork === 'Converged Management Plane';
    const hasDedicatedNetworkRacks = Boolean(activeDesign.requirements?.networkRequirements?.dedicatedNetworkCoreRacks);
    
    // Calculate total power and rack units
    let totalPower = 0;
    let totalRackUnits = 0;
    let computeRackUnits = 0;
    let networkRackUnits = 0;
    
    // Track storage nodes for dedicated storage network calculation
    const storageNodes = [];
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      // Add to total power
      totalPower += component.powerRequired * quantity;
      
      // Add to total rack units if applicable
      if ('rackUnitsConsumed' in component) {
        const componentRU = (component as any).rackUnitsConsumed * quantity;
        totalRackUnits += componentRU;
        
        // Determine if this component is in compute/storage racks or network racks
        // Network switches and routers go in network racks if dedicated racks are enabled
        const isNetworkComponent = 
          hasDedicatedNetworkRacks && 
          (component.role === 'spineSwitch' || component.role === 'coreRouter');
        
        if (isNetworkComponent) {
          networkRackUnits += componentRU;
        } else {
          computeRackUnits += componentRU;
        }
      }
      
      if (component.type === ComponentType.Server) {
        totalServers += quantity;
        
        // Track storage nodes separately
        if (component.role === 'storageNode') {
          storageNodes.push(component);
        }
        
        // Calculate ports used by servers for leaf connections
        let serverLeafPortsUsed = 2; // Default if not specified
        if ('portsConsumedQuantity' in component && (component as any).portsConsumedQuantity > 0) {
          serverLeafPortsUsed = (component as any).portsConsumedQuantity;
        }
        
        // Allocate ports based on node type and network configuration
        if (hasDedicatedStorageNetwork && component.role === 'storageNode') {
          // If we have a dedicated storage network, storage nodes use the storage network
          storagePortsUsed += serverLeafPortsUsed * quantity;
        } else {
          // All other nodes use the leaf network
          leafPortsUsed += serverLeafPortsUsed * quantity;
        }
        
        // Calculate ports used by servers for management connections
        // Only add management ports if not using converged management
        if (!isConvergedManagement) {
          let serverMgmtPortsUsed = 1; // Default if not specified
          if (managementNetwork === 'Dual Home') {
            serverMgmtPortsUsed = 2;
          }
          
          mgmtPortsUsed += serverMgmtPortsUsed * quantity;
          
          // Add IPMI ports if needed
          if (ipmiNetwork === 'Management converged') {
            mgmtPortsUsed += quantity;
          }
        }
      } else if (component.type === ComponentType.Switch) {
        // Calculate switch ports
        let portCount = 0;
        
        // Try different properties for port counts
        if ('portsProvidedQuantity' in component && (component as any).portsProvidedQuantity > 0) {
          portCount = (component as any).portsProvidedQuantity;
        } else if ('portCount' in component && (component as any).portCount > 0) {
          portCount = (component as any).portCount;
        }
        
        // Add ports based on switch role
        if (component.role === 'managementSwitch') {
          totalMgmtSwitches += quantity;
          mgmtPortsAvailable += portCount * quantity;
        } else if (component.role === 'storageSwitch') {
          totalStorageSwitches += quantity;
          storagePortsAvailable += portCount * quantity;
        } else if (['computeSwitch', 'leafSwitch', 'borderLeafSwitch'].includes(component.role)) {
          totalLeafSwitches += quantity;
          leafPortsAvailable += portCount * quantity;
        }
      }
    });
    
    return {
      totalRackUnits,
      totalPower,
      totalServers,
      totalLeafSwitches,
      totalStorageSwitches,
      totalMgmtSwitches,
      leafPortsUsed,
      leafPortsAvailable,
      storagePortsUsed,
      storagePortsAvailable,
      mgmtPortsUsed,
      mgmtPortsAvailable,
      totalAvailableRU,
      totalAvailablePower,
      totalRackQuantity,
      hasDedicatedStorageNetwork,
      hasDedicatedNetworkRacks,
      computeRackUnits,
      networkRackUnits,
      computeRackRUs,
      networkRackRUs
    };
  }, [activeDesign]);
  
  // Calculate resource utilization percentages
  const resourceUtilization = useMemo(() => {
    const {
      totalPower, 
      totalRackUnits, 
      leafPortsUsed, 
      leafPortsAvailable,
      storagePortsUsed,
      storagePortsAvailable,
      mgmtPortsUsed,
      mgmtPortsAvailable,
      totalAvailableRU,
      totalAvailablePower,
      hasDedicatedStorageNetwork,
      computeRackUnits,
      networkRackUnits,
      computeRackRUs,
      networkRackRUs,
      hasDedicatedNetworkRacks
    } = resourceMetrics;
    
    const result: any = {
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
    
    // Add compute/network space utilization if dedicated network racks are enabled
    if (hasDedicatedNetworkRacks) {
      result.computeSpaceUtilization = {
        percentage: computeRackRUs > 0 ? (computeRackUnits / computeRackRUs) * 100 : 0,
        used: computeRackUnits,
        total: computeRackRUs
      };
      
      result.networkSpaceUtilization = {
        percentage: networkRackRUs > 0 ? (networkRackUnits / networkRackRUs) * 100 : 0,
        used: networkRackUnits,
        total: networkRackRUs
      };
    }
    
    // Only add storage network utilization if dedicated storage network is enabled
    if (hasDedicatedStorageNetwork) {
      result.storageNetworkUtilization = {
        percentage: storagePortsAvailable > 0 ? (storagePortsUsed / storagePortsAvailable) * 100 : (storagePortsUsed > 0 ? 100 : 0),
        used: storagePortsUsed,
        total: storagePortsAvailable
      };
    }
    
    return result;
  }, [resourceMetrics]);

  return {
    resourceMetrics,
    resourceUtilization
  };
};
