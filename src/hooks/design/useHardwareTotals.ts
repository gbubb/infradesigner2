
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';
import { StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/types/infrastructure';

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
    
    console.log('Calculating hardware totals from components:', activeDesign.components.length);
    
    // First separate compute cluster nodes from other nodes
    const computeClusterNodes = activeDesign.components.filter(component => 
      (component.role === 'computeNode' || component.role === 'gpuNode') && 
      component.type === ComponentType.Server &&
      (component as any).clusterInfo
    );
    
    // Calculate compute cluster totals separately
    computeClusterNodes.forEach(component => {
      const quantity = component.quantity || 1;
      
      // Calculate vCPUs - use consistent naming and log details
      let coresPerServer = 0;
      let overcommitRatio = 1;
      
      // Expanded property check patterns for CPU cores
      if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
        coresPerServer = (component.cpuSockets || 0) * (component.cpuCoresPerSocket || 0);
        console.log(`Compute Server ${component.name} has ${component.cpuSockets} sockets × ${component.cpuCoresPerSocket} cores = ${coresPerServer} cores`);
      } else if ('cpuCount' in component && 'coreCount' in component) {
        coresPerServer = (component.cpuCount || 0) * (component.coreCount || 0);
        console.log(`Compute Server ${component.name} has ${component.cpuCount} CPUs × ${component.coreCount} cores = ${coresPerServer} cores`);
      } else if ('cores' in component) {
        coresPerServer = component.cores || 0;
        console.log(`Compute Server ${component.name} has ${coresPerServer} cores (from cores property)`);
      } else if ('totalCores' in component) {
        coresPerServer = component.totalCores || 0;
        console.log(`Compute Server ${component.name} has ${coresPerServer} cores (from totalCores property)`);
      }
      
      // Get overcommit ratio from individual compute clusters if available
      if ((component as any).clusterInfo) {
        const clusterId = (component as any).clusterInfo.clusterId;
        const matchingCluster = requirements.computeRequirements.computeClusters.find(c => c.id === clusterId);
        overcommitRatio = matchingCluster?.overcommitRatio || 1;
        
        console.log(`${component.role} in cluster ${(component as any).clusterInfo.clusterName}, coresPerServer: ${coresPerServer}, overcommit: ${overcommitRatio}, total vCPUs: ${coresPerServer * quantity * overcommitRatio}`);
      }
      
      totalVCPUs += coresPerServer * quantity * overcommitRatio;
      
      // SIMPLIFIED MEMORY CALCULATION - Use memoryCapacity as the primary source of truth
      let componentMemoryGB = 0;
      
      // First check for memoryCapacity which is our primary field from the UI
      if ('memoryCapacity' in component && component.memoryCapacity > 0) {
        componentMemoryGB = component.memoryCapacity;
        console.log(`Compute Server ${component.name} has ${componentMemoryGB}GB of memory (memoryCapacity property)`);
      }
      // Then fall back to other possible memory fields only if necessary
      else if ('memoryGB' in component && component.memoryGB > 0) {
        componentMemoryGB = component.memoryGB;
        console.log(`Compute Server ${component.name} has ${componentMemoryGB}GB of memory (memoryGB property)`);
      }
      else if ('memoryTB' in component && (component as any).memoryTB > 0) {
        componentMemoryGB = (component as any).memoryTB * 1024;
        console.log(`Compute Server ${component.name} has ${(component as any).memoryTB}TB (${componentMemoryGB}GB) of memory (memoryTB property)`);
      }
      
      if (componentMemoryGB === 0) {
        console.warn(`Compute Server ${component.name} has no valid memory configuration!`);
      }
      
      computeMemoryGB += componentMemoryGB * quantity;
    });
    
    // Calculate storage capacity from storage clusters
    const storageClusters = requirements.storageRequirements.storageClusters || [];
    
    // Group storage nodes by cluster
    const storageNodesByCluster = activeDesign.components
      .filter(component => component.role === 'storageNode' && component.type === ComponentType.Server)
      .reduce((acc: Record<string, any[]>, node) => {
        if ((node as any).clusterInfo?.clusterId) {
          const clusterId = (node as any).clusterInfo.clusterId;
          if (!acc[clusterId]) acc[clusterId] = [];
          acc[clusterId].push(node);
        }
        return acc;
      }, {});
    
    // Calculate usable storage for each cluster
    Object.entries(storageNodesByCluster).forEach(([clusterId, nodes]) => {
      const cluster = storageClusters.find(c => c.id === clusterId);
      if (!cluster) return;
      
      const poolType = cluster.poolType || '3 Replica';
      const poolEfficiencyFactor = StoragePoolEfficiencyFactors[poolType] || (1/3);
      const maxFillFactor = (cluster.maxFillFactor || 80) / 100;
      
      let clusterRawCapacityTB = 0;
      
      nodes.forEach(node => {
        const quantity = node.quantity || 1;
        
        // Add attached disks capacity if available
        if ('attachedDisks' in node) {
          const disks = (node as any).attachedDisks || [];
          disks.forEach((disk: any) => {
            if (disk && 'capacityTB' in disk) {
              clusterRawCapacityTB += disk.capacityTB * (disk.quantity || 1) * quantity;
            }
          });
        }
      });
      
      // Calculate usable capacity using pool type efficiency factor
      const usableCapacityTB = clusterRawCapacityTB * poolEfficiencyFactor;
      const usableCapacityTiB = usableCapacityTB * TB_TO_TIB_FACTOR;
      
      // Add to total storage (we use usable capacity, not including fill factor)
      totalStorageTB += usableCapacityTiB;
      
      console.log(`Storage cluster ${cluster.name}: Raw capacity: ${clusterRawCapacityTB} TB, Usable: ${usableCapacityTiB.toFixed(2)} TiB (using pool efficiency ${poolEfficiencyFactor})`);
    });
    
    // Calculate other memory (non-compute cluster memory) for totals
    let otherMemoryGB = 0;
    activeDesign.components
      .filter(component => 
        !(component.role === 'computeNode' || component.role === 'gpuNode') &&
        component.type === ComponentType.Server
      )
      .forEach(component => {
        const quantity = component.quantity || 1;
        let componentMemoryGB = 0;
        
        if ('memoryCapacity' in component && component.memoryCapacity > 0) {
          componentMemoryGB = component.memoryCapacity;
        } else if ('memoryGB' in component && component.memoryGB > 0) {
          componentMemoryGB = component.memoryGB;
        } else if ('memoryTB' in component && (component as any).memoryTB > 0) {
          componentMemoryGB = (component as any).memoryTB * 1024;
        }
        
        otherMemoryGB += componentMemoryGB * quantity;
      });
    
    totalMemoryGB = computeMemoryGB + otherMemoryGB;
    
    const totalMemoryTB = totalMemoryGB / 1024;
    const computeMemoryTB = computeMemoryGB / 1024;
    
    console.log('Final hardware totals calculated:', {
      totalVCPUs,  // Only includes compute cluster vCPUs
      totalMemoryTB,
      computeMemoryTB,
      totalStorageTB  // Usable storage in TiB
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
