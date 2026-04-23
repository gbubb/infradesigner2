import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AverageVMCostBreakdown } from './AverageVMCostBreakdown';
import { StorageCostBreakdown } from './StorageCostBreakdown';
import { InfoIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ResourceSummaryProps {
  totalVCPUs: number;
  totalComputeMemoryTB: number;
  totalStorageTB: number;
  totalRackQuantity: number;
  totalRackUnits: number;
  totalPower: number;
  powerPerRack: number;
}

interface KeyMetricsProps {
  totalCapitalCost: number;
  costPerVCPU: number;
  costTBMemory: number;
  monthlyCostPerAverageVM: number;
  averageVMVCPUs: number;
  averageVMMemoryGB: number;
  totalVCPUs: number;
  totalMemoryTB: number;
  monthlyCost: number;
  quantityOfAverageVMs: number;
  storageAmortizedCost?: number;
  storageClusterCosts?: Array<{
    id: string;
    name: string;
    usableCapacityTiB: number;
    monthlyStorageCostPerTiB: number;
    isHyperConverged?: boolean;
    totalNodeCost?: number;
    totalStorageCost?: number;
    poolType?: string;
    nodeCount?: number;
    totalRawCapacityTB?: number;
  }>;
  amortisationPeriodMonths?: number;
  usableVCPUs?: number;
  usableMemoryTB?: number;
  redundancyConfig?: string;
  totalComputeNodes?: number;
  totalAvailabilityZones?: number;
  redundantVCPUs?: number;
  redundantMemoryGB?: number;
  redundantNodes?: number;
  clusterBreakdown?: Array<{
    name: string;
    maxVMs: number;
    costPerVM: number;
  }>;
  costToConnect?: number;
  networkInfrastructureCost?: number;
  connectedDeviceCount?: number;
}

export const ResourceSummaryCard: React.FC<ResourceSummaryProps> = ({
  totalVCPUs,
  totalComputeMemoryTB,
  totalStorageTB,
  totalRackQuantity,
  totalRackUnits,
  totalPower,
  powerPerRack
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Compute:</span>
            <span className="font-medium">{Math.round(totalVCPUs)} vCPUs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Compute Memory:</span>
            <span className="font-medium">{totalComputeMemoryTB.toFixed(2)} TB memory</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Usable Storage:</span>
            <span className="font-medium">{totalStorageTB.toFixed(2)} TiB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Rack Quantity:</span>
            <span className="font-medium">{totalRackQuantity}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Rack Units:</span>
            <span className="font-medium">{totalRackUnits} RU</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Power:</span>
            <span className="font-medium">
              {totalPower >= 10000 ? 
                `${(totalPower / 1000).toFixed(2)} kW` : 
                `${totalPower.toLocaleString()} W`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Power per Rack:</span>
            <span className="font-medium">
              {powerPerRack >= 10000 ?
                `${(powerPerRack / 1000).toFixed(2)} kW` :
                `${powerPerRack.toLocaleString(undefined, { maximumFractionDigits: 0 })} W`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const KeyMetricsCard: React.FC<KeyMetricsProps> = ({
  totalCapitalCost: _totalCapitalCost,
  costPerVCPU: _costPerVCPU,
  costTBMemory: _costTBMemory,
  monthlyCostPerAverageVM,
  averageVMVCPUs,
  averageVMMemoryGB,
  totalVCPUs,
  totalMemoryTB,
  monthlyCost,
  quantityOfAverageVMs,
  storageAmortizedCost = 0,
  storageClusterCosts = [],
  amortisationPeriodMonths = 36,
  usableVCPUs,
  usableMemoryTB,
  redundancyConfig,
  totalComputeNodes,
  totalAvailabilityZones,
  redundantVCPUs,
  redundantMemoryGB,
  redundantNodes,
  clusterBreakdown,
  costToConnect,
  networkInfrastructureCost,
  connectedDeviceCount
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Key Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Monthly cost for an average VM</p>
              <p className="text-xs text-muted-foreground">
                Based on {averageVMVCPUs} vCPU and {averageVMMemoryGB} GiB RAM
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                ${monthlyCostPerAverageVM.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <AverageVMCostBreakdown
                totalVCPUs={totalVCPUs}
                totalMemoryTB={totalMemoryTB}
                averageVMVCPUs={averageVMVCPUs}
                averageVMMemoryGB={averageVMMemoryGB}
                monthlyCost={monthlyCost}
                quantityOfAverageVMs={quantityOfAverageVMs}
                monthlyCostPerAverageVM={monthlyCostPerAverageVM}
                storageAmortizedCost={storageAmortizedCost}
                usableVCPUs={usableVCPUs}
                usableMemoryTB={usableMemoryTB}
                redundancyConfig={redundancyConfig}
                totalComputeNodes={totalComputeNodes}
                totalAvailabilityZones={totalAvailabilityZones}
                redundantVCPUs={redundantVCPUs}
                redundantMemoryGB={redundantMemoryGB}
                redundantNodes={redundantNodes}
                clusterBreakdown={clusterBreakdown}
              />
            </div>
          </div>
          
          {/* Cost to Connect metric */}
          {costToConnect !== undefined && costToConnect > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div>
                    <p className="text-sm font-medium">Cost to Connect</p>
                    <p className="text-xs text-muted-foreground">
                      Network infrastructure cost per connected device
                    </p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">Calculation:</p>
                          <p>Total Network Infrastructure Cost ÷ Connected Devices</p>
                          {networkInfrastructureCost !== undefined && connectedDeviceCount !== undefined && (
                            <>
                              <p className="text-xs text-muted-foreground mt-2">
                                ${networkInfrastructureCost.toLocaleString()} ÷ {connectedDeviceCount} devices
                              </p>
                              <p className="text-xs text-muted-foreground">
                                = ${costToConnect.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })} per device
                              </p>
                            </>
                          )}
                          <p className="text-xs text-muted-foreground mt-2 border-t pt-1">
                            Network infrastructure includes: switches, routers, firewalls, cables, patch panels, cassettes, and transceivers
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Connected devices: all servers (compute, storage, hyper-converged, infrastructure)
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-lg font-bold">
                  ${costToConnect.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Storage cluster cost metrics */}
          {storageClusterCosts && storageClusterCosts.length > 0 && (
            <>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Monthly cost per usable TiB of storage</p>
                <div className="space-y-2">
                  {storageClusterCosts.map(cluster => (
                    <div key={cluster.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {cluster.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cluster.usableCapacityTiB.toFixed(1)} TiB usable capacity
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">
                          ${cluster.monthlyStorageCostPerTiB.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}/TiB
                        </span>
                        <StorageCostBreakdown
                          clusterName={cluster.name}
                          isHyperConverged={cluster.isHyperConverged || false}
                          totalNodeCost={cluster.totalNodeCost || 0}
                          totalStorageCost={cluster.totalStorageCost || 0}
                          usableCapacityTiB={cluster.usableCapacityTiB}
                          monthlyStorageCostPerTiB={cluster.monthlyStorageCostPerTiB}
                          amortisationPeriodMonths={amortisationPeriodMonths}
                          poolType={cluster.poolType}
                          nodeCount={cluster.nodeCount}
                          totalRawCapacityTB={cluster.totalRawCapacityTB}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
