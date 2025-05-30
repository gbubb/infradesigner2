import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { useDesignStore } from '@/store/designStore';
import { useCostAnalysis } from '@/hooks/design/useCostAnalysis';
import { ComponentType } from '@/types/infrastructure';
import { ClusterConsumptionControls } from './ClusterConsumptionControls';
import { ClusterAnalysisCard } from './ClusterAnalysisCard';
import { OperationalCostAlignmentCard, OverallSummaryCard } from './ModelSummaryCards';

export const ModelPanel: React.FC = () => {
  const { requirements } = useDesignStore();
  const { 
    hasValidDesign, 
    storageClustersMetrics, 
    actualHardwareTotals 
  } = useDesignCalculations();

  // Get operational costs from cost analysis to ensure alignment with Results
  const { operationalCosts } = useCostAnalysis();
  
  // Get active design for component costs
  const activeDesign = useDesignStore(state => state.activeDesign);

  // Get pricing data from requirements
  const computePricing = requirements.pricingRequirements?.computePricing || [];
  const storagePricing = requirements.pricingRequirements?.storagePricing || [];

  // Initialize state for consumption sliders - one per cluster
  const [clusterConsumption, setClusterConsumption] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    computePricing.forEach(cluster => {
      initial[cluster.clusterId] = 50; // Default to 50%
    });
    storagePricing.forEach(cluster => {
      initial[cluster.clusterId] = 50; // Default to 50%
    });
    return initial;
  });

  // Update consumption for a specific cluster
  const updateClusterConsumption = (clusterId: string, consumption: number) => {
    setClusterConsumption(prev => ({
      ...prev,
      [clusterId]: consumption
    }));
  };

  // Calculate device counts per cluster for network cost apportionment
  const clusterDeviceCounts = useMemo(() => {
    const { activeDesign } = useDesignStore.getState();
    if (!activeDesign?.components) return {};

    const deviceCounts: Record<string, number> = {};
    
    // Get compute cluster requirements to map device counts
    const computeClusters = requirements.computeRequirements?.computeClusters || [];
    const storageClusters = requirements.storageRequirements?.storageClusters || [];

    // Count servers per cluster based on requirements
    computeClusters.forEach(cluster => {
      // Calculate nodes needed for this cluster based on vCPU and memory requirements
      const servers = activeDesign.components.filter(
        component => component.type === ComponentType.Server && 
        component.role === 'computeNode'
      );
      
      // For simplicity, distribute compute nodes evenly across compute clusters
      // In a real implementation, this would be based on actual cluster assignments
      const totalComputeNodes = servers.reduce((sum, server) => sum + (server.quantity || 1), 0);
      deviceCounts[cluster.id] = Math.ceil(totalComputeNodes / computeClusters.length);
    });

    storageClusters.forEach(cluster => {
      // Count storage nodes for each storage cluster
      const storageNodes = activeDesign.components.filter(
        component => component.type === ComponentType.Server && 
        component.role === 'storageNode'
      );
      
      // For simplicity, distribute storage nodes evenly across storage clusters
      const totalStorageNodes = storageNodes.reduce((sum, server) => sum + (server.quantity || 1), 0);
      deviceCounts[cluster.id] = Math.ceil(totalStorageNodes / storageClusters.length);
    });

    return deviceCounts;
  }, [requirements]);

  // Calculate total device count for proportional network cost allocation
  const totalDeviceCount = useMemo(() => {
    return Object.values(clusterDeviceCounts).reduce((sum, count) => sum + count, 0);
  }, [clusterDeviceCounts]);

  // Calculate network cost apportionment per cluster
  const networkCostApportionment = useMemo(() => {
    const networkCost = operationalCosts.amortizedMonthly; // This includes network costs
    const apportionment: Record<string, number> = {};
    
    Object.entries(clusterDeviceCounts).forEach(([clusterId, deviceCount]) => {
      if (totalDeviceCount > 0) {
        apportionment[clusterId] = (networkCost * (deviceCount / totalDeviceCount));
      } else {
        apportionment[clusterId] = 0;
      }
    });
    
    return apportionment;
  }, [clusterDeviceCounts, totalDeviceCount, operationalCosts.amortizedMonthly]);

  // Calculate cluster-level analysis
  const clusterAnalysis = useMemo(() => {
    const analysis: Record<string, any> = {};
    
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

    // Calculate total storage devices for proportional cost allocation
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
      
      // Calculate proportional costs
      const networkCostShare = operationalCosts.networkMonthly * (deviceCount / totalDeviceCount);
      const rackCostShare = operationalCosts.racksMonthly * (clusterRU / totalRU);
      const energyCostShare = operationalCosts.energyMonthly * (clusterPower / totalPower);
      const licensingCostShare = operationalCosts.licensingMonthly * (deviceCount / totalDeviceCount);
      
      // Get the full amortized cost for this specific cluster
      const clusterAmortizedCost = operationalCosts.amortizedMonthly * (deviceCount / totalDeviceCount);
      
      // Calculate compute-specific hardware costs for this cluster
      const computeDevices = activeDesign?.components.filter(
        component => component.type === ComponentType.Server && 
        component.role === 'computeNode' &&
        (component as any).clusterInfo?.clusterId === cluster.clusterId
      ) || [];
      
      const computeHardwareCost = computeDevices.reduce((total, device) => {
        return total + (device.cost * (device.quantity || 1));
      }, 0);
      
      // Calculate monthly amortized compute hardware cost
      const computeLifespan = activeDesign?.requirements?.computeRequirements?.deviceLifespanYears || 3;
      const computeAmortizedCost = computeHardwareCost / (computeLifespan * 12);
      
      const totalClusterCost = computeAmortizedCost + networkCostShare + rackCostShare + energyCostShare + licensingCostShare;
      
      // Calculate revenue based on VM consumption
      const averageVMVCPUs = requirements.computeRequirements?.averageVMVCPUs || 4;
      const averageVMMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 8;
      const totalVCPUs = actualHardwareTotals.totalVCPUs / computePricing.length;
      const totalMemoryGB = (actualHardwareTotals.totalComputeMemoryTB * 1024) / computePricing.length;
      const vmsByCPU = Math.floor(totalVCPUs / averageVMVCPUs);
      const vmsByMemory = Math.floor(totalMemoryGB / averageVMMemoryGB);
      const maxVMs = Math.min(vmsByCPU, vmsByMemory);
      const currentVMs = Math.floor(consumption * maxVMs / 100);
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
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
      };
    });
    
    // Analyze storage clusters
    storagePricing.forEach(cluster => {
      const consumption = clusterConsumption[cluster.clusterId] || 50;
      
      // Calculate storage-specific hardware costs for this cluster
      const storageDevices = activeDesign?.components.filter(
        component => (component.type === ComponentType.Disk || 
          (component.type === ComponentType.Server && component.role === 'storageNode')) &&
          (component as any).clusterInfo?.clusterId === cluster.clusterId
      ) || [];
      
      const storageHardwareCost = storageDevices.reduce((total, device) => {
        return total + (device.cost * (device.quantity || 1));
      }, 0);
      
      // Calculate actual device count for this cluster
      const actualDeviceCount = storageDevices.reduce((sum, device) => sum + (device.quantity || 1), 0);
      
      // Calculate RU and power based on actual devices
      const clusterRU = actualDeviceCount * (cluster.rackUnits || 1);
      const clusterPower = actualDeviceCount * (cluster.powerWatts || 500);
      
      // Calculate proportional costs for shared infrastructure using actual device count
      const networkCostShare = operationalCosts.networkMonthly * (actualDeviceCount / totalDeviceCount);
      const rackCostShare = operationalCosts.racksMonthly * (clusterRU / totalRU);
      const energyCostShare = operationalCosts.energyMonthly * (clusterPower / totalPower);
      const licensingCostShare = operationalCosts.licensingMonthly * (actualDeviceCount / totalDeviceCount);
      
      // Calculate monthly amortized storage hardware cost
      const storageLifespan = activeDesign?.requirements?.storageRequirements?.deviceLifespanYears || 3;
      const storageAmortizedCost = storageHardwareCost / (storageLifespan * 12);
      
      const totalClusterCost = storageAmortizedCost + networkCostShare + rackCostShare + energyCostShare + licensingCostShare;
      
      // Calculate revenue based on storage consumption
      const clusterMetrics = storageClustersMetrics.find(m => m.id === cluster.clusterId);
      const usableStorageTiB = clusterMetrics?.usableCapacityTiB || 0;
      const currentStorageTiB = consumption * usableStorageTiB / 100;
      const revenue = cluster.pricePerMonth * currentStorageTiB * 1024; // Convert TiB to GiB for pricing
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
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
      };
    });
    
    return analysis;
  }, [clusterConsumption, clusterDeviceCounts, computePricing, storagePricing, operationalCosts, requirements, actualHardwareTotals, storageClustersMetrics]);

  // Calculate overall totals
  const overallAnalysis = useMemo(() => {
    const totalRevenue = Object.values(clusterAnalysis).reduce((sum: number, cluster: any) => sum + cluster.revenue, 0);
    const totalCosts = Object.values(clusterAnalysis).reduce((sum: number, cluster: any) => sum + cluster.costs.total, 0);
    const totalProfit = totalRevenue - totalCosts;
    
    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    };
  }, [clusterAnalysis]);

  if (!hasValidDesign) {
    return (
      <div className="w-full p-6">
        <h2 className="text-2xl font-semibold mb-6">Revenue Model</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              No valid design found. Please create a design first in the Design panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Revenue Model</h2>
      
      {/* Total Operational Cost Alignment Check */}
      <OperationalCostAlignmentCard 
        resultsTotal={operationalCosts.totalMonthly}
        modelTotal={overallAnalysis.totalCosts}
      />

      {/* Cluster Consumption Controls */}
      <ClusterConsumptionControls
        computePricing={computePricing}
        storagePricing={storagePricing}
        clusterConsumption={clusterConsumption}
        clusterDeviceCounts={clusterDeviceCounts}
        updateClusterConsumption={updateClusterConsumption}
        storageClustersMetrics={storageClustersMetrics}
      />

      {/* Per-Cluster Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Outcome</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(clusterAnalysis).map(([clusterId, analysis]) => (
              <ClusterAnalysisCard
                key={clusterId}
                clusterId={clusterId}
                analysis={analysis}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overall Summary */}
      <OverallSummaryCard
        totalRevenue={overallAnalysis.totalRevenue}
        totalCosts={overallAnalysis.totalCosts}
        totalProfit={overallAnalysis.totalProfit}
        profitMargin={overallAnalysis.profitMargin}
      />
    </div>
  );
};
