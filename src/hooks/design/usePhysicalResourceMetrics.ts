
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';

export const usePhysicalResourceMetrics = () => {
  const { activeDesign } = useDesignStore();
  
  return useMemo(() => {
    if (!activeDesign?.components) {
      return {
        totalRackUnits: 0,
        totalPower: 0,
        totalServers: 0,
        totalAvailableRU: 0,
        totalAvailablePower: 0,
        totalRackQuantity: 0,
        networkRackUnits: 0,
        networkPower: 0
      };
    }
    
    const computeStorageRacks = activeDesign.requirements?.physicalConstraints?.computeStorageRackQuantity || 0;
    const networkCoreRacks = activeDesign.requirements?.networkRequirements?.dedicatedNetworkCoreRacks ? 2 : 0;
    const totalRackQuantity = computeStorageRacks + networkCoreRacks;
    
    const ruPerRack = activeDesign.requirements?.physicalConstraints?.rackUnitsPerRack || 42;
    const powerPerRack = activeDesign.requirements?.physicalConstraints?.powerPerRackWatts || 0;
    
    const totalAvailableRU = totalRackQuantity * ruPerRack;
    const totalAvailablePower = totalRackQuantity * powerPerRack;
    
    // Calculate total power and rack units
    let totalPower = 0;
    let totalRackUnits = 0;
    let totalServers = 0;
    
    // Calculate network specific metrics
    let networkRackUnits = 0;
    let networkPower = 0;
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      // Add to total power
      totalPower += component.powerRequired * quantity;
      
      // Add to total rack units if applicable
      if ('rackUnitsConsumed' in component) {
        const rackUnits = (component as { rackUnitsConsumed?: number }).rackUnitsConsumed;
        if (rackUnits) {
          totalRackUnits += rackUnits * quantity;
        }
      } else if ('ruSize' in component && component.ruSize) {
        totalRackUnits += component.ruSize * quantity;
      }
      
      // Count servers
      if (component.type === ComponentType.Server) {
        totalServers += quantity;
      }
      
      // Calculate network specific metrics
      if (component.type === ComponentType.Switch || 
          component.type === ComponentType.Router ||
          component.type === ComponentType.Firewall) {
        networkPower += component.powerRequired * quantity;
        if ('rackUnitsConsumed' in component) {
          const rackUnits = (component as { rackUnitsConsumed?: number }).rackUnitsConsumed;
          if (rackUnits) {
            networkRackUnits += rackUnits * quantity;
          }
        } else if ('ruSize' in component && component.ruSize) {
          networkRackUnits += component.ruSize * quantity;
        }
      }
    });
    
    return {
      totalRackUnits,
      totalPower,
      totalServers,
      totalAvailableRU,
      totalAvailablePower,
      totalRackQuantity,
      networkRackUnits,
      networkPower
    };
  }, [activeDesign]);
};
