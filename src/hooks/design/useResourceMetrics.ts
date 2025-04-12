
import { usePhysicalResourceMetrics } from './usePhysicalResourceMetrics';
import { useNetworkPortsMetrics } from './useNetworkPortsMetrics';
import { useResourceUtilization } from './useResourceUtilization';

export const useResourceMetrics = () => {
  const physicalMetrics = usePhysicalResourceMetrics();
  const networkMetrics = useNetworkPortsMetrics();
  const resourceUtilization = useResourceUtilization();
  
  return {
    // Combine all metrics into a single object for backward compatibility
    ...physicalMetrics,
    ...networkMetrics,
    resourceUtilization,
  };
};
