
import { useMemo } from 'react';
import { InfrastructureDesign, ComponentType } from '@/types/infrastructure';

export const useDesignComparison = (leftDesign: InfrastructureDesign, rightDesign: InfrastructureDesign) => {
  // Calculate all comparison metrics
  const comparisonMetrics = useMemo(() => {
    // Helper function to calculate metrics for a single design
    const calculateDesignMetrics = (design: InfrastructureDesign) => {
      if (!design?.components || design.components.length === 0) {
        return {
          totalCost: 0,
          totalVCPUs: 0,
          totalMemoryGB: 0,
          totalStorageTB: 0,
          costPerVCPU: 0,
          costPerStorageTB: 0,
          computeNodeCount: 0,
          storageNodeCount: 0,
          networkSwitchCount: 0,
          computeCost: 0,
          storageCost: 0,
          networkCost: 0,
          totalPower: 0,
          totalRackUnits: 0
        };
      }

      let totalCost = 0;
      let totalVCPUs = 0;
      let totalMemoryGB = 0;
      let totalStorageTB = 0;
      let computeNodeCount = 0;
      let storageNodeCount = 0;
      let networkSwitchCount = 0;
      let computeCost = 0;
      let storageCost = 0;
      let networkCost = 0;
      let totalPower = 0;
      let totalRackUnits = 0;

      design.components.forEach(component => {
        const quantity = component.quantity || 1;
        const componentCost = component.cost * quantity;
        totalCost += componentCost;
        totalPower += (component.powerRequired || 0) * quantity;
        
        if ('rackUnitsConsumed' in component) {
          totalRackUnits += (component.rackUnitsConsumed || 0) * quantity;
        }

        if (component.type === ComponentType.Server) {
          // Calculate vCPUs
          let coresPerServer = 0;
          
          // Use cpuSockets and cpuCoresPerSocket if available
          if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
            coresPerServer = (component.cpuSockets || 0) * (component.cpuCoresPerSocket || 0);
          } 
          // Fall back to cpuCount and coreCount
          else if ('cpuCount' in component && 'coreCount' in component) {
            coresPerServer = (component.cpuCount || 0) * (component.coreCount || 0);
          }

          // Get memory from memoryCapacity or fall back to memoryGB
          let memoryGB = 0;
          if ('memoryCapacity' in component && component.memoryCapacity > 0) {
            memoryGB = component.memoryCapacity;
          } else if ('memoryGB' in component) {
            memoryGB = component.memoryGB || 0;
          }

          totalMemoryGB += memoryGB * quantity;
          
          // Calculate costs and count by server role
          if (component.role === 'computeNode' || component.role === 'gpuNode' || component.role === 'controller') {
            totalVCPUs += coresPerServer * quantity;
            computeNodeCount += quantity;
            computeCost += componentCost;
          } else if (component.role === 'storageNode') {
            const storageCapacityTB = ('storageCapacityTB' in component) ? (component.storageCapacityTB || 0) : 0;
            totalStorageTB += storageCapacityTB * quantity;
            storageNodeCount += quantity;
            storageCost += componentCost;
          }
        } else if (component.type === ComponentType.Switch) {
          networkSwitchCount += quantity;
          networkCost += componentCost;
        }
      });

      return {
        totalCost,
        totalVCPUs,
        totalMemoryGB,
        totalStorageTB,
        costPerVCPU: totalVCPUs > 0 ? computeCost / totalVCPUs : 0,
        costPerStorageTB: totalStorageTB > 0 ? storageCost / totalStorageTB : 0,
        computeNodeCount,
        storageNodeCount,
        networkSwitchCount,
        computeCost,
        storageCost,
        networkCost,
        totalPower,
        totalRackUnits
      };
    };

    const leftMetrics = calculateDesignMetrics(leftDesign);
    const rightMetrics = calculateDesignMetrics(rightDesign);

    // Calculate percentage differences
    const calculateDifference = (left: number, right: number) => {
      if (left === 0 && right === 0) return 0;
      if (left === 0) return 100; // Right is infinitely more
      return ((right - left) / left) * 100;
    };

    // Create comparison object with differences
    const differences = {
      totalCost: calculateDifference(leftMetrics.totalCost, rightMetrics.totalCost),
      totalVCPUs: calculateDifference(leftMetrics.totalVCPUs, rightMetrics.totalVCPUs),
      totalMemoryGB: calculateDifference(leftMetrics.totalMemoryGB, rightMetrics.totalMemoryGB),
      totalStorageTB: calculateDifference(leftMetrics.totalStorageTB, rightMetrics.totalStorageTB),
      costPerVCPU: calculateDifference(leftMetrics.costPerVCPU, rightMetrics.costPerVCPU),
      costPerStorageTB: calculateDifference(leftMetrics.costPerStorageTB, rightMetrics.costPerStorageTB),
      computeNodeCount: calculateDifference(leftMetrics.computeNodeCount, rightMetrics.computeNodeCount),
      storageNodeCount: calculateDifference(leftMetrics.storageNodeCount, rightMetrics.storageNodeCount),
      networkSwitchCount: calculateDifference(leftMetrics.networkSwitchCount, rightMetrics.networkSwitchCount),
      computeCost: calculateDifference(leftMetrics.computeCost, rightMetrics.computeCost),
      storageCost: calculateDifference(leftMetrics.storageCost, rightMetrics.storageCost),
      networkCost: calculateDifference(leftMetrics.networkCost, rightMetrics.networkCost),
      totalPower: calculateDifference(leftMetrics.totalPower, rightMetrics.totalPower),
      totalRackUnits: calculateDifference(leftMetrics.totalRackUnits, rightMetrics.totalRackUnits)
    };

    return {
      left: leftMetrics,
      right: rightMetrics,
      differences
    };
  }, [leftDesign, rightDesign]);

  return comparisonMetrics;
};
