
import { useState, useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';
import { StoragePoolEfficiencyFactors, TB_TO_TIB_FACTOR } from '@/store/slices/requirements/constants';

/**
 * A wrapper for hardware totals calculation that uses useEffect instead of useMemo
 * to avoid the React hook dependency issues.
 */
export const useHardwareTotalsWrapper = () => {
  // State for the calculated totals
  const [actualHardwareTotals, setActualHardwareTotals] = useState({
    totalVCPUs: 0,
    totalMemoryTB: 0,
    totalComputeMemoryTB: 0,
    totalStorageTB: 0
  });

  // Get store data
  const store = useDesignStore();
  const designId = store?.activeDesign?.id;

  // Calculate hardware totals using useEffect instead of useMemo
  useEffect(() => {
    try {
      const activeDesign = store?.activeDesign;
      const requirements = store?.requirements;

      // Ensure we have valid input
      if (!activeDesign?.components || !Array.isArray(activeDesign.components) || activeDesign.components.length === 0) {
        console.log("No valid components found in hardware totals calculation");
        return;
      }

      let totalVCPUs = 0;
      let totalMemoryGB = 0;
      let computeMemoryGB = 0;
      let totalStorageTB = 0;
      
      console.log('Hardware totals wrapper - calculating for design:', activeDesign.name);
      console.log('Calculating hardware totals from components:', activeDesign.components.length);
      
      // First separate compute cluster nodes from other nodes
      const computeClusterNodes = activeDesign.components.filter(component => 
        (component.role === 'computeNode' || component.role === 'gpuNode') && 
        component.type === ComponentType.Server
      );
      
      console.log(`Found ${computeClusterNodes.length} compute cluster nodes`);
      
      // Calculate compute cluster totals separately
      computeClusterNodes.forEach(component => {
        const quantity = component.quantity || 1;
        
        // Calculate vCPUs - use consistent naming and log details
        let coresPerServer = 0;
        // Initialize overcommitRatio variable just once
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
        
        // Get global overcommit ratio if it exists in the requirements
        // We need to access this more safely
        const globalOvercommitRatio = 
          requirements?.computeRequirements?.computeClusters?.length > 0 
            ? requirements.computeRequirements.computeClusters[0]?.overcommitRatio || 1 
            : 1;
        
        if (globalOvercommitRatio !== 1) {
          overcommitRatio = globalOvercommitRatio;
          console.log(`Using global overcommit ratio: ${overcommitRatio}`);
        }
        
        // Try to get cluster-specific overcommit ratio if component is part of a cluster
        if (component.clusterInfo && requirements?.computeRequirements?.computeClusters) {
          const clusterId = component.clusterInfo.clusterId;
          const matchingCluster = requirements.computeRequirements.computeClusters.find(c => c.id === clusterId);
          if (matchingCluster && matchingCluster.overcommitRatio) {
            overcommitRatio = matchingCluster.overcommitRatio;
          }
        }
        
        const serverVCPUs = coresPerServer * overcommitRatio;
        const totalServerVCPUs = serverVCPUs * quantity;
        totalVCPUs += totalServerVCPUs;
        
        console.log(`Server ${component.name} has ${serverVCPUs} vCPUs per server × ${quantity} servers = ${totalServerVCPUs} total vCPUs (overcommit: ${overcommitRatio})`);
        
        // Memory calculation
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
        else if ('memoryTB' in component && component.memoryTB > 0) {
          componentMemoryGB = component.memoryTB * 1024;
          console.log(`Compute Server ${component.name} has ${component.memoryTB}TB (${componentMemoryGB}GB) of memory (memoryTB property)`);
        }
        
        const totalServerMemoryGB = componentMemoryGB * quantity;
        computeMemoryGB += totalServerMemoryGB;
        console.log(`Server ${component.name} has ${componentMemoryGB}GB per server × ${quantity} servers = ${totalServerMemoryGB}GB total memory`);
      });
      
      // Calculate storage capacity from storage clusters
      const storageClusters = requirements?.storageRequirements?.storageClusters || [];
      
      // Group storage nodes by cluster
      const storageNodesByCluster = activeDesign.components
        .filter(component => component.role === 'storageNode' && component.type === ComponentType.Server)
        .reduce((acc, node) => {
          if (node.clusterInfo?.clusterId) {
            const clusterId = node.clusterInfo.clusterId;
            if (!acc[clusterId]) acc[clusterId] = [];
            acc[clusterId].push(node);
          }
          return acc;
        }, {} as Record<string, any[]>); // Type annotation added to prevent TS error
      
      // Calculate usable storage for each cluster
      Object.entries(storageNodesByCluster).forEach(([clusterId, nodes]) => {
        const cluster = storageClusters.find(c => c.id === clusterId);
        if (!cluster) return;
        
        const poolType = cluster.poolType || '3 Replica';
        const poolEfficiencyFactor = StoragePoolEfficiencyFactors[poolType] || (1/3);
        
        let clusterRawCapacityTB = 0;
        
        nodes.forEach(node => {
          const quantity = node.quantity || 1;
          
          // Add attached disks capacity if available
          if ('attachedDisks' in node && Array.isArray(node.attachedDisks)) {
            node.attachedDisks.forEach(disk => {
              if (disk && typeof disk.capacityTB === 'number') {
                const diskQuantity = disk.quantity || 1;
                clusterRawCapacityTB += disk.capacityTB * diskQuantity * quantity;
              }
            });
          }
        });
        
        // Calculate usable capacity using pool type efficiency factor
        const usableCapacityTB = clusterRawCapacityTB * poolEfficiencyFactor;
        const usableCapacityTiB = usableCapacityTB * TB_TO_TIB_FACTOR;
        
        // Add to total storage (we use usable capacity, not including fill factor)
        totalStorageTB += usableCapacityTiB;
        
        console.log(`Storage cluster ${cluster.name}: Raw capacity: ${clusterRawCapacityTB.toFixed(2)} TB, Usable: ${usableCapacityTiB.toFixed(2)} TiB (using pool efficiency ${poolEfficiencyFactor})`);
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
          } else if ('memoryTB' in component && component.memoryTB > 0) {
            componentMemoryGB = component.memoryTB * 1024;
          }
          
          otherMemoryGB += componentMemoryGB * quantity;
        });
      
      totalMemoryGB = computeMemoryGB + otherMemoryGB;
      
      const totalMemoryTB = totalMemoryGB / 1024;
      const computeMemoryTB = computeMemoryGB / 1024;
      
      console.log('Final hardware totals calculated:', {
        totalVCPUs,
        totalMemoryTB,
        computeMemoryTB,
        totalStorageTB
      });
      
      // Set the calculated totals
      setActualHardwareTotals({
        totalVCPUs,
        totalMemoryTB,
        totalComputeMemoryTB: computeMemoryTB,
        totalStorageTB
      });
    } catch (error) {
      console.error('Error calculating hardware totals:', error);
    }
  }, [designId, store]); // Only depend on the designId, not the entire objects

  return {
    actualHardwareTotals
  };
};
