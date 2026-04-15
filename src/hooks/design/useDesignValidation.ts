
import { useMemo } from 'react';
import { useResourceUtilization } from './useResourceUtilization';

export const useDesignValidation = () => {
  const resourceUtilization = useResourceUtilization();
  
  // Check for implausible scenarios
  const designErrors = useMemo(() => {
    const errors: Array<{ id: string; title: string; description: string }> = [];
    
    if (!resourceUtilization) {
      return errors;
    }
    
    if (resourceUtilization.spaceUtilization && resourceUtilization.spaceUtilization.percentage > 100) {
      errors.push({
        id: 'ru-exceeded',
        title: 'Rack Space Exceeded',
        description: `The design requires ${resourceUtilization.spaceUtilization.used} RU total, but only ${resourceUtilization.spaceUtilization.total} RU are available.`
      });
    }
    
    if (resourceUtilization.powerUtilization && resourceUtilization.powerUtilization.percentage > 100) {
      errors.push({
        id: 'power-exceeded',
        title: 'Power Capacity Exceeded',
        description: `The design requires ${resourceUtilization.powerUtilization.used.toLocaleString()} Watts total, but only ${resourceUtilization.powerUtilization.total.toLocaleString()} Watts are available.`
      });
    }
    
    if (resourceUtilization.leafNetworkUtilization && 
        ((resourceUtilization.leafNetworkUtilization.percentage > 100) || 
        (resourceUtilization.leafNetworkUtilization.used > 0 && resourceUtilization.leafNetworkUtilization.total === 0))) {
      errors.push({
        id: 'leaf-network-exceeded',
        title: 'Leaf Network Port Capacity Exceeded',
        description: `The design requires ${resourceUtilization.leafNetworkUtilization.used} leaf network ports, but only ${resourceUtilization.leafNetworkUtilization.total} ports are available.`
      });
    }
    
    if (resourceUtilization.mgmtNetworkUtilization && 
        ((resourceUtilization.mgmtNetworkUtilization.percentage > 100) || 
        (resourceUtilization.mgmtNetworkUtilization.used > 0 && resourceUtilization.mgmtNetworkUtilization.total === 0))) {
      errors.push({
        id: 'mgmt-network-exceeded',
        title: 'Management Network Port Capacity Exceeded',
        description: `The design requires ${resourceUtilization.mgmtNetworkUtilization.used} management network ports, but only ${resourceUtilization.mgmtNetworkUtilization.total} ports are available.`
      });
    }
    
    // Add check for storage network utilization if it exists
    if (resourceUtilization.storageNetworkUtilization && 
        ((resourceUtilization.storageNetworkUtilization.percentage > 100) || 
        (resourceUtilization.storageNetworkUtilization.used > 0 && resourceUtilization.storageNetworkUtilization.total === 0))) {
      errors.push({
        id: 'storage-network-exceeded',
        title: 'Storage Network Port Capacity Exceeded',
        description: `The design requires ${resourceUtilization.storageNetworkUtilization.used} storage network ports, but only ${resourceUtilization.storageNetworkUtilization.total} ports are available.`
      });
    }
    
    return errors;
  }, [resourceUtilization]);

  return {
    designErrors
  };
};
