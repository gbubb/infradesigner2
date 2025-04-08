import { useMemo } from 'react';
import { InfrastructureComponent } from '@/types/infrastructure';

export const useComponentCosts = (components: InfrastructureComponent[] | undefined) => {
  return useMemo(() => {
    // Initialize cost trackers
    let totalComputeCost = 0;
    let totalStorageCost = 0;
    let totalNetworkCost = 0;
    
    // Return default if no components
    if (!components || !Array.isArray(components) || components.length === 0) {
      return { totalComputeCost, totalStorageCost, totalNetworkCost };
    }
    
    components.forEach(component => {
      if (!component) return; // Skip undefined components
      
      const quantity = component.quantity || 1;
      const componentCost = (component.cost || 0) * quantity;
      
      // Categorize components for amortization
      if (component.type === 'Server') {
        // Track compute costs for amortization
        if (component.role !== 'storageNode') {
          totalComputeCost += componentCost;
        } else {
          totalStorageCost += componentCost;
        }
      } else if (component.type === 'Switch' || component.type === 'Router') {
        totalNetworkCost += componentCost;
      } else if (component.type === 'Disk') {
        totalStorageCost += componentCost;
      } else if (component.type === 'Firewall') {
        totalNetworkCost += componentCost;
      } else if (component.type === 'GPU') {
        // GPUs are considered part of compute costs
        totalComputeCost += componentCost;
      }
    });
    
    return {
      totalComputeCost,
      totalStorageCost,
      totalNetworkCost
    };
  }, [components]);
};