
import { usePhysicalResourceMetrics } from './usePhysicalResourceMetrics';
import { useNetworkPortsMetrics } from './useNetworkPortsMetrics';
import { useResourceUtilization } from './useResourceUtilization';

export const useResourceMetrics = () => {
  const physicalMetrics = usePhysicalResourceMetrics();
  const networkMetrics = useNetworkPortsMetrics();
  const resourceUtilization = useResourceUtilization();
  
  return {
    // Physical resource metrics
    ...physicalMetrics,
    // Network metrics
    ...networkMetrics,
    // Resource utilization data
    resourceUtilization,
  };
};
