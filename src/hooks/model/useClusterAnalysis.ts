import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';
import { ClusterAnalysis, StorageClusterMetrics } from '@/types/model-types';
import { ComponentWithPlacement } from '@/types/service-types';
import { ClusterPricing } from '@/types/infrastructure';
import { DesignRequirements } from '@/types/infrastructure/requirements-types';

interface UseClusterAnalysisProps {
  clusterConsumption: Record<string, number>;
  clusterDeviceCounts: Record<string, number>;
  computePricing: ClusterPricing[];
  storagePricing: ClusterPricing[];
  operationalCosts: {
    amortizedMonthly: number;
    networkMonthly: number;
    racksMonthly: number;
    energyMonthly: number;
    licensingMonthly: number;
    totalMonthly: number;
  };
  amortizedCostsByType: {
    compute: number;
    storage: number;
    network: number;
    total: number;
  };
  requirements: DesignRequirements;
  actualHardwareTotals: {
    totalVCPUs: number;
    totalComputeMemoryTB: number;
  };
  storageClustersMetrics: StorageClusterMetrics[];
  storageOverallocationRatios: Record<string, number>;
}

/**
 * Custom hook for calculating cluster-level analysis
 */
export function useClusterAnalysis({
  clusterConsumption,
  clusterDeviceCounts,
  computePricing,
  storagePricing,
  operationalCosts,
  amortizedCostsByType,
  requirements,
  actualHardwareTotals: _actualHardwareTotals,
  storageClustersMetrics,
  storageOverallocationRatios
}: UseClusterAnalysisProps) {
  const activeDesign = useDesignStore(state => state.activeDesign);

  // Calculate cluster-level analysis
  const clusterAnalysis = useMemo(() => {
    const analysis: Record<string, ClusterAnalysis> = {};
    
    // Calculate total device count, RU, and power for proportional cost allocation
    const totalDeviceCount = Object.values(clusterDeviceCounts).reduce((sum, count) => sum + count, 0);
    const totalRU = Object.entries(clusterDeviceCounts).reduce((sum, [clusterId, count]) => {
      const cluster = [...computePricing, ...storagePricing].find(c => c.clusterId === clusterId);
      return sum + (count * (cluster?.rackUnits || 1)); // Default to 1 RU if not specified
    }, 0);
    const totalPower = Object.entries(clusterDeviceCounts).reduce((sum, [clusterId, count]) => {
      const cluster = [...computePricing, ...storagePricing].find(c => c.clusterId === clusterId);
      return sum + (count * (cluster?.powerWatts || 500)); // Default to 500W if not specified
    }, 0);

    // Calculate total compute and storage devices for proportional cost allocation
    const totalComputeDevices = activeDesign?.components.filter(
      component => component.type === ComponentType.Server &&
        (component.role === 'computeNode' || component.role === 'gpuNode' || component.role === 'hyperConvergedNode')
    ).reduce((sum, component) => sum + (component.quantity || 1), 0) || 0;

    const totalStorageDevices = activeDesign?.components.filter(
      component => (component.type === ComponentType.Disk ||
        (component.type === ComponentType.Server && component.role === 'storageNode'))
    ).reduce((sum, component) => sum + (component.quantity || 1), 0) || 0;

    // Analyze compute clusters
    computePricing.forEach(cluster => {
      const consumption = clusterConsumption[cluster.clusterId] || 50;
      const deviceCount = clusterDeviceCounts[cluster.clusterId] || 0;
      const clusterRU = deviceCount * (cluster.rackUnits || 1);
      const clusterPower = deviceCount * (cluster.powerWatts || 500);

      // Calculate proportional costs with safe division
      const networkCostShare = totalDeviceCount > 0
        ? operationalCosts.networkMonthly * (deviceCount / totalDeviceCount)
        : 0;
      const rackCostShare = totalRU > 0
        ? operationalCosts.racksMonthly * (clusterRU / totalRU)
        : 0;
      const energyCostShare = totalPower > 0
        ? operationalCosts.energyMonthly * (clusterPower / totalPower)
        : 0;
      const licensingCostShare = totalDeviceCount > 0
        ? operationalCosts.licensingMonthly * (deviceCount / totalDeviceCount)
        : 0;

      // Get compute devices for this cluster (for VM calculation and cost breakdown)
      const computeDevices = activeDesign?.components.filter(
        component => component.type === ComponentType.Server &&
        (component.role === 'computeNode' || component.role === 'gpuNode' || component.role === 'hyperConvergedNode') &&
        (component as ComponentWithPlacement).clusterInfo?.clusterId === cluster.clusterId
      ) || [];

      const clusterComputeDeviceCount = computeDevices.reduce((sum, device) => sum + (device.quantity || 1), 0);

      // Use proportional share of compute amortized costs from Results page calculation
      const computeAmortizedCost = totalComputeDevices > 0
        ? amortizedCostsByType.compute * (clusterComputeDeviceCount / totalComputeDevices)
        : 0;

      // For cost breakdown, calculate the hardware cost for reference
      const computeHardwareCost = computeDevices.reduce((total, device) => {
        return total + (device.cost * (device.quantity || 1));
      }, 0);
      const computeLifespan = activeDesign?.requirements?.computeRequirements?.deviceLifespanYears || 3;

      const totalClusterCost = computeAmortizedCost + networkCostShare + rackCostShare + energyCostShare + licensingCostShare;

      // Calculate revenue based on VM consumption for THIS cluster
      const averageVMVCPUs = requirements.computeRequirements?.averageVMVCPUs || 4;
      const averageVMMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 8;

      // Calculate actual vCPUs and memory for this specific cluster
      const clusterVCPUs = computeDevices.reduce((total, device: InfrastructureComponent) => {
        // CPU calculation: cpuSockets * cpuCoresPerSocket
        const cpuSockets = device.cpuSockets || 0;
        const cpuCoresPerSocket = device.cpuCoresPerSocket || 0;
        const vCPUsPerDevice = cpuSockets * cpuCoresPerSocket * (device.quantity || 1);
        return total + vCPUsPerDevice;
      }, 0);

      const clusterMemoryGB = computeDevices.reduce((total, device: InfrastructureComponent) => {
        // Memory is stored in memoryCapacity field (in GB)
        const memoryGB = (device.memoryCapacity || 0) * (device.quantity || 1);
        return total + memoryGB;
      }, 0);

      const vmsByCPU = clusterVCPUs > 0 ? Math.floor(clusterVCPUs / averageVMVCPUs) : 0;
      const vmsByMemory = clusterMemoryGB > 0 ? Math.floor(clusterMemoryGB / averageVMMemoryGB) : 0;
      const maxVMs = Math.min(vmsByCPU, vmsByMemory);
      const currentVMs = Math.floor(consumption * maxVMs / 100);

      // Debug logging for VM calculation
      if (maxVMs === 0 && computeDevices.length > 0) {
        console.log(`[useClusterAnalysis] VM calculation for cluster "${cluster.clusterName}":`, {
          deviceCount: computeDevices.length,
          clusterVCPUs,
          clusterMemoryGB,
          averageVMVCPUs,
          averageVMMemoryGB,
          vmsByCPU,
          vmsByMemory,
          maxVMs,
          sampleDevice: computeDevices[0]
        });
      }

      const revenue = cluster.pricePerMonth * currentVMs;
      const profit = revenue - totalClusterCost;
      
      analysis[cluster.clusterId] = {
        name: cluster.clusterName,
        type: 'compute',
        consumption,
        deviceCount,
        costs: {
          compute: computeAmortizedCost,
          network: networkCostShare,
          rack: rackCostShare,
          energy: energyCostShare,
          licensing: licensingCostShare,
          total: totalClusterCost
        },
        costBreakdown: {
          compute: {
            hardwareCost: computeHardwareCost,
            deviceCount: deviceCount,
            amortizationPeriod: computeLifespan
          },
          network: {
            totalCost: operationalCosts.networkMonthly,
            deviceShare: deviceCount,
            totalDevices: totalDeviceCount
          },
          rack: {
            totalCost: operationalCosts.racksMonthly,
            ruShare: clusterRU,
            totalRU: totalRU
          },
          energy: {
            totalCost: operationalCosts.energyMonthly,
            powerShare: clusterPower,
            totalPower: totalPower
          },
          licensing: {
            totalCost: operationalCosts.licensingMonthly,
            deviceShare: deviceCount,
            totalDevices: totalDeviceCount
          }
        },
        revenue,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
        costPerUnit: currentVMs > 0 ? totalClusterCost / currentVMs : 0,
        pricePerUnit: cluster.pricePerMonth,
        currentUnits: currentVMs,
        maxUnits: maxVMs
      };
    });
    
    // Analyze storage clusters
    storagePricing.forEach(cluster => {
      const consumption = clusterConsumption[cluster.clusterId] || 50;
      const overallocationRatio = storageOverallocationRatios[cluster.clusterId] || 1.0;
      
      // Get storage devices for this cluster
      const storageDevices = activeDesign?.components.filter(
        component => (component.type === ComponentType.Disk ||
          (component.type === ComponentType.Server && component.role === 'storageNode')) &&
          (component as ComponentWithPlacement).clusterInfo?.clusterId === cluster.clusterId
      ) || [];

      // Calculate actual device count for this cluster
      const actualDeviceCount = storageDevices.reduce((sum, device) => sum + (device.quantity || 1), 0);

      // Calculate RU and power based on actual devices
      const clusterRU = actualDeviceCount * (cluster.rackUnits || 1);
      const clusterPower = actualDeviceCount * (cluster.powerWatts || 500);

      // Calculate proportional costs for shared infrastructure using actual device count with safe division
      const networkCostShare = totalDeviceCount > 0
        ? operationalCosts.networkMonthly * (actualDeviceCount / totalDeviceCount)
        : 0;
      const rackCostShare = totalRU > 0
        ? operationalCosts.racksMonthly * (clusterRU / totalRU)
        : 0;
      const energyCostShare = totalPower > 0
        ? operationalCosts.energyMonthly * (clusterPower / totalPower)
        : 0;
      const licensingCostShare = totalDeviceCount > 0
        ? operationalCosts.licensingMonthly * (actualDeviceCount / totalDeviceCount)
        : 0;

      // Use proportional share of storage amortized costs from Results page calculation
      const storageAmortizedCost = totalStorageDevices > 0
        ? amortizedCostsByType.storage * (actualDeviceCount / totalStorageDevices)
        : 0;

      // For cost breakdown, calculate the hardware cost for reference
      const storageHardwareCost = storageDevices.reduce((total, device) => {
        return total + (device.cost * (device.quantity || 1));
      }, 0);
      const storageLifespan = activeDesign?.requirements?.storageRequirements?.deviceLifespanYears || 3;

      const totalClusterCost = storageAmortizedCost + networkCostShare + rackCostShare + energyCostShare + licensingCostShare;
      
      // Calculate revenue based on storage consumption with overallocation
      const clusterMetrics = storageClustersMetrics.find(m => m.id === cluster.clusterId);
      const usableStorageTiB = clusterMetrics?.usableCapacityTiB || 0;
      const currentStorageTiB = consumption * usableStorageTiB / 100;
      const overallocatedStorageTiB = currentStorageTiB * overallocationRatio;
      const revenue = cluster.pricePerMonth * overallocatedStorageTiB * 1024; // Convert TiB to GiB for pricing
      const profit = revenue - totalClusterCost;
      
      analysis[cluster.clusterId] = {
        name: cluster.clusterName,
        type: 'storage',
        consumption,
        deviceCount: actualDeviceCount,
        costs: {
          storage: storageAmortizedCost,
          network: networkCostShare,
          rack: rackCostShare,
          energy: energyCostShare,
          licensing: licensingCostShare,
          total: totalClusterCost
        },
        costBreakdown: {
          storage: {
            hardwareCost: storageHardwareCost,
            deviceCount: actualDeviceCount,
            amortizationPeriod: storageLifespan
          },
          network: {
            totalCost: operationalCosts.networkMonthly,
            deviceShare: actualDeviceCount,
            totalDevices: totalDeviceCount
          },
          rack: {
            totalCost: operationalCosts.racksMonthly,
            ruShare: clusterRU,
            totalRU: totalRU
          },
          energy: {
            totalCost: operationalCosts.energyMonthly,
            powerShare: clusterPower,
            totalPower: totalPower
          },
          licensing: {
            totalCost: operationalCosts.licensingMonthly,
            deviceShare: actualDeviceCount,
            totalDevices: totalDeviceCount
          }
        },
        revenue,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
        costPerUnit: overallocatedStorageTiB > 0 ? totalClusterCost / overallocatedStorageTiB : 0,
        pricePerUnit: cluster.pricePerMonth * 1024, // Convert to per TiB
        currentUnits: overallocatedStorageTiB,
        maxUnits: usableStorageTiB
      };
    });
    
    return analysis;
  }, [clusterConsumption, clusterDeviceCounts, computePricing, storagePricing, operationalCosts, amortizedCostsByType, requirements, storageClustersMetrics, storageOverallocationRatios, activeDesign?.components, activeDesign?.requirements?.computeRequirements?.deviceLifespanYears, activeDesign?.requirements?.storageRequirements?.deviceLifespanYears]);

  // Calculate overall totals
  const overallAnalysis = useMemo(() => {
    const totalRevenue = Object.values(clusterAnalysis).reduce((sum: number, cluster: ClusterAnalysis) => sum + cluster.revenue, 0);
    const totalCosts = Object.values(clusterAnalysis).reduce((sum: number, cluster: ClusterAnalysis) => sum + cluster.costs.total, 0);
    const totalProfit = totalRevenue - totalCosts;
    
    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    };
  }, [clusterAnalysis]);

  return {
    clusterAnalysis,
    overallAnalysis
  };
}