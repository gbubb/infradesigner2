
import { usePhysicalResourceMetrics } from './usePhysicalResourceMetrics';
import { useNetworkPortsMetrics } from './useNetworkPortsMetrics';
import { useResourceUtilization } from './useResourceUtilization';

export const useResourceMetrics = () => {
  // Get data from physical resource metrics
  const physicalMetrics = usePhysicalResourceMetrics();
  
  // Get data from network ports metrics
  const networkMetrics = useNetworkPortsMetrics();
  
  // Get resource utilization data
  const resourceUtilization = useResourceUtilization();
  
  // Create a properly structured return object
  const result = {
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

  return result;
};
