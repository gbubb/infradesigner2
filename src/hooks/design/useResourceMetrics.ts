
import { usePhysicalResourceMetrics } from './usePhysicalResourceMetrics';
import { useNetworkPortsMetrics } from './useNetworkPortsMetrics';
import { useResourceUtilization } from './useResourceUtilization';

export const useResourceMetrics = () => {
  const physicalMetrics = usePhysicalResourceMetrics();
  const networkMetrics = useNetworkPortsMetrics();
  const resourceUtilization = useResourceUtilization();
  
  return {
    // Physical resource metrics
    totalPower: physicalMetrics.totalPower,
    totalRackUnits: physicalMetrics.totalRackUnits,
    totalServers: physicalMetrics.totalServers,
    totalRackQuantity: physicalMetrics.totalRackQuantity,
    totalAvailableRU: physicalMetrics.totalAvailableRU,
    totalAvailablePower: physicalMetrics.totalAvailablePower,
    
    // Network metrics
    totalLeafSwitches: networkMetrics.totalLeafSwitches,
    totalMgmtSwitches: networkMetrics.totalMgmtSwitches,
    leafPortsUsed: networkMetrics.leafPortsUsed,
    leafPortsAvailable: networkMetrics.leafPortsAvailable,
    mgmtPortsUsed: networkMetrics.mgmtPortsUsed,
    mgmtPortsAvailable: networkMetrics.mgmtPortsAvailable,
    storagePortsUsed: networkMetrics.storagePortsUsed,
    storagePortsAvailable: networkMetrics.storagePortsAvailable,
    hasDedicatedStorageNetwork: networkMetrics.hasDedicatedStorageNetwork,
    
    // Resource utilization data
    resourceUtilization,
  };
};
