import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';

export const useHardwareTotals = () => {
  const { activeDesign, requirements } = useDesignStore();
  
  // Calculate actual hardware totals (including redundancy)
  const actualHardwareTotals = useMemo(() => {
    const defaultTotals = {
      totalVCPUs: 0,
      totalMemoryTB: 0,
      totalComputeMemoryTB: 0,
      totalStorageTB: 0
    };

    if (!activeDesign?.components || !Array.isArray(activeDesign.components)) {
      return defaultTotals;
    }
    
    let totalVCPUs = 0;
    let totalMemoryGB = 0;
    let computeMemoryGB = 0;
    let totalStorageTB = 0;
    
    try {
      activeDesign.components.forEach(component => {
        if (!component) return; // Skip if component is undefined
        
        const quantity = component.quantity || 1;
        
        if (component.type === ComponentType.Server) {
          // Calculate vCPUs - use consistent naming and log details
          let coresPerServer = 0;
          let overcommitRatio = 1;
          
          // Expanded property check patterns for CPU cores with proper null checks
          if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
            coresPerServer = (component.cpuSockets || 0) * (component.cpuCoresPerSocket || 0);
          } else if ('cpuCount' in component && 'coreCount' in component) {
            coresPerServer = (component.cpuCount || 0) * (component.coreCount || 0);
          } else if ('cores' in component) {
            coresPerServer = component.cores || 0;
          } else if ('totalCores' in component) {
            coresPerServer = component.totalCores || 0;
          }
          
          // Get overcommit ratio from individual compute clusters if available
          if ((component.role === 'computeNode' || component.role === 'gpuNode') && 
              component && (component as any).clusterInfo) {
            const clusterId = (component as any).clusterInfo.clusterId;
            const matchingCluster = requirements?.computeRequirements?.computeClusters?.find(c => c.id === clusterId);
            overcommitRatio = matchingCluster?.overcommitRatio || 1;
          }
          
          totalVCPUs += coresPerServer * quantity * overcommitRatio;
          
          // SIMPLIFIED MEMORY CALCULATION - Use memoryCapacity as the primary source of truth
          let componentMemoryGB = 0;
          
          // First check for memoryCapacity which is our primary field from the UI
          if ('memoryCapacity' in component && component.memoryCapacity > 0) {
            componentMemoryGB = component.memoryCapacity;
          }
          // Then fall back to other possible memory fields only if necessary
          else if ('memoryGB' in component && component.memoryGB > 0) {
            componentMemoryGB = component.memoryGB;
          }
          else if ('memoryTB' in component && (component as any).memoryTB > 0) {
            componentMemoryGB = (component as any).memoryTB * 1024;
          }
          
          totalMemoryGB += componentMemoryGB * quantity;
          
          if (component.role === 'computeNode' || component.role === 'gpuNode' || component.role === 'controllerNode') {
            computeMemoryGB += componentMemoryGB * quantity;
          }
          
          if (component.role === 'storageNode' && 'storageCapacityTB' in component) {
            totalStorageTB += (component.storageCapacityTB || 0) * quantity;
          }
        }
      });
    } catch (error) {
      console.error('Error calculating hardware totals:', error);
    }
    
    const totalMemoryTB = totalMemoryGB / 1024;
    const computeMemoryTB = computeMemoryGB / 1024;
    
    return {
      totalVCPUs,
      totalMemoryTB,
      totalComputeMemoryTB: computeMemoryTB,
      totalStorageTB
    };
  }, [activeDesign, requirements]);

  return {
    actualHardwareTotals
  };
};