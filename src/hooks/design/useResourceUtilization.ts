
import { useMemo } from 'react';
import { usePhysicalResourceMetrics } from './usePhysicalResourceMetrics';
import { useNetworkPortsMetrics } from './useNetworkPortsMetrics';

// Define an explicit interface for the resource utilization return type
export interface ResourceUtilization {
  powerUtilization: {
    percentage: number;
    used: number;
    total: number;
  };
  spaceUtilization: {
    percentage: number;
    used: number;
    total: number;
  };
  leafNetworkUtilization: {
    percentage: number;
    used: number;
    total: number;
  };
  mgmtNetworkUtilization: {
    percentage: number;
    used: number;
    total: number;
  };
  storageNetworkUtilization?: {
    percentage: number;
    used: number;
    total: number;
  };
}

export const useResourceUtilization = (): ResourceUtilization => {
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
    
    const result: ResourceUtilization = {
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
      result.storageNetworkUtilization = {
        percentage: storagePortsAvailable > 0 ? (storagePortsUsed / storagePortsAvailable) * 100 : (storagePortsUsed > 0 ? 100 : 0),
        used: storagePortsUsed,
        total: storagePortsAvailable
      };
    }
    
    return result;
  }, [physicalMetrics, networkMetrics]);
};
