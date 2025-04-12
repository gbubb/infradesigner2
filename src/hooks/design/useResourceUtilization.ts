
import { useMemo } from 'react';
import { usePhysicalResourceMetrics } from './usePhysicalResourceMetrics';
import { useNetworkPortsMetrics } from './useNetworkPortsMetrics';

export const useResourceUtilization = () => {
  const physicalMetrics = usePhysicalResourceMetrics();
  const networkMetrics = useNetworkPortsMetrics();
  
  return useMemo(() => {
    const {
      totalPower, 
      totalRackUnits, 
      totalAvailableRU,
      totalAvailablePower
    } = physicalMetrics;
    
    const {
      leafPortsUsed, 
      leafPortsAvailable,
      storagePortsUsed,
      storagePortsAvailable,
      mgmtPortsUsed,
      mgmtPortsAvailable,
      hasDedicatedStorageNetwork
    } = networkMetrics;
    
    const result = {
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
    
    // Only add storage network utilization if dedicated storage network is enabled
    if (hasDedicatedStorageNetwork) {
      (result as any).storageNetworkUtilization = {
        percentage: storagePortsAvailable > 0 ? (storagePortsUsed / storagePortsAvailable) * 100 : (storagePortsUsed > 0 ? 100 : 0),
        used: storagePortsUsed,
        total: storagePortsAvailable
      };
    }
    
    return result;
  }, [physicalMetrics, networkMetrics]);
};
