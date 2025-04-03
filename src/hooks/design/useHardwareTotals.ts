
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';

export const useHardwareTotals = () => {
  const { activeDesign, requirements, componentRoles } = useDesignStore();
  
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
    
    console.log('Calculating hardware totals from components:', activeDesign.components.length);
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      if (component.type === ComponentType.Server) {
        // Calculate vCPUs - use consistent naming and log details
        let coresPerServer = 0;
        let overcommitRatio = 1;
        
        // Expanded property check patterns for CPU cores
        if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
          coresPerServer = (component.cpuSockets || 0) * (component.cpuCoresPerSocket || 0);
          console.log(`Server ${component.name} has ${component.cpuSockets} sockets × ${component.cpuCoresPerSocket} cores = ${coresPerServer} cores`);
        } else if ('cpuCount' in component && 'coreCount' in component) {
          coresPerServer = (component.cpuCount || 0) * (component.coreCount || 0);
          console.log(`Server ${component.name} has ${component.cpuCount} CPUs × ${component.coreCount} cores = ${coresPerServer} cores`);
        } else if ('cores' in component) {
          coresPerServer = component.cores || 0;
          console.log(`Server ${component.name} has ${coresPerServer} cores (from cores property)`);
        } else if ('totalCores' in component) {
          coresPerServer = component.totalCores || 0;
          console.log(`Server ${component.name} has ${coresPerServer} cores (from totalCores property)`);
        }
        
        // Get overcommit ratio from individual compute clusters if available
        if ((component.role === 'computeNode' || component.role === 'gpuNode') && (component as any).clusterInfo) {
          const clusterId = (component as any).clusterInfo.clusterId;
          const matchingCluster = requirements.computeRequirements.computeClusters.find(c => c.id === clusterId);
          overcommitRatio = matchingCluster?.overcommitRatio || 1;
          
          console.log(`${component.role} in cluster ${(component as any).clusterInfo.clusterName}, coresPerServer: ${coresPerServer}, overcommit: ${overcommitRatio}, total vCPUs: ${coresPerServer * quantity * overcommitRatio}`);
        }
        
        totalVCPUs += coresPerServer * quantity * overcommitRatio;
        
        // Calculate memory - use consistent naming and log details
        let componentMemoryGB = 0;
        
        // Expanded property check patterns for memory
        if ('memoryGB' in component && component.memoryGB > 0) {
          componentMemoryGB = component.memoryGB;
          console.log(`Server ${component.name} has ${componentMemoryGB}GB of memory (memoryGB property)`);
        } else if ('memoryCapacity' in component && (component as any).memoryCapacity > 0) {
          componentMemoryGB = (component as any).memoryCapacity;
          console.log(`Server ${component.name} has ${componentMemoryGB}GB of memory (memoryCapacity property)`);
        } else if ('memory' in component && (component as any).memory > 0) {
          componentMemoryGB = (component as any).memory;
          console.log(`Server ${component.name} has ${componentMemoryGB}GB of memory (memory property)`);
        } else if ('totalMemoryGB' in component && (component as any).totalMemoryGB > 0) {
          componentMemoryGB = (component as any).totalMemoryGB;
          console.log(`Server ${component.name} has ${componentMemoryGB}GB of memory (totalMemoryGB property)`);
        } else if ('memoryTB' in component && (component as any).memoryTB > 0) {
          componentMemoryGB = (component as any).memoryTB * 1024;
          console.log(`Server ${component.name} has ${(component as any).memoryTB}TB (${componentMemoryGB}GB) of memory (memoryTB property)`);
        }
        
        totalMemoryGB += componentMemoryGB * quantity;
        
        if (component.role === 'computeNode' || component.role === 'gpuNode') {
          computeMemoryGB += componentMemoryGB * quantity;
        }
        
        if (component.role === 'storageNode' && 'storageCapacityTB' in component) {
          totalStorageTB += (component.storageCapacityTB || 0) * quantity;
        }
      }
    });
    
    const totalMemoryTB = totalMemoryGB / 1024;
    const computeMemoryTB = computeMemoryGB / 1024;
    
    console.log('Final hardware totals calculated:', {
      totalVCPUs,
      totalMemoryTB,
      computeMemoryTB,
      totalStorageTB
    });
    
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
