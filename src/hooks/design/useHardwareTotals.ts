
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';

export const useHardwareTotals = () => {
  const { activeDesign, requirements } = useDesignStore();
  
  // Calculate actual hardware totals (including redundancy)
  const actualHardwareTotals = useMemo(() => {
    if (!activeDesign?.components) {
      return {
        totalVCPUs: 0,
        totalMemoryTB: 0,
        totalComputeMemoryTB: 0,
        totalStorageTB: 0
      };
    }
    
    let totalVCPUs = 0;
    let totalMemoryGB = 0;
    let computeMemoryGB = 0;
    let totalStorageTB = 0;
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      if (component.type === ComponentType.Server) {
        // Calculate vCPUs - use consistent naming
        let coresPerServer = 0;
        let overcommitRatio = 1;
        
        // Handle different server property naming
        if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
          coresPerServer = (component as any).cpuSockets * (component as any).cpuCoresPerSocket;
        } else if ('cpuCount' in component && 'coreCount' in component) {
          coresPerServer = (component as any).cpuCount * (component as any).coreCount;
        }
        
        // Get overcommit ratio from individual compute clusters if available
        if ((component.role === 'computeNode' || component.role === 'gpuNode') && (component as any).clusterInfo) {
          const clusterId = (component as any).clusterInfo.clusterId;
          const matchingCluster = requirements.computeRequirements.computeClusters.find(c => c.id === clusterId);
          overcommitRatio = matchingCluster?.overcommitRatio || 1;
          
          console.log(`Compute node in cluster ${clusterId}, coresPerServer: ${coresPerServer}, overcommit: ${overcommitRatio}, total vCPUs: ${coresPerServer * quantity * overcommitRatio}`);
        }
        
        totalVCPUs += coresPerServer * quantity * overcommitRatio;
        
        // Calculate memory - use consistent naming
        let componentMemoryGB = 0;
        if ('memoryGB' in component) {
          componentMemoryGB = (component as any).memoryGB;
        } else if ('memoryCapacity' in component) {
          componentMemoryGB = (component as any).memoryCapacity;
        }
        
        totalMemoryGB += componentMemoryGB * quantity;
        
        if (component.role === 'computeNode' || component.role === 'gpuNode') {
          computeMemoryGB += componentMemoryGB * quantity;
        }
        
        if (component.role === 'storageNode' && 'storageCapacityTB' in component) {
          totalStorageTB += (component as any).storageCapacityTB * quantity;
        }
      }
    });
    
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
