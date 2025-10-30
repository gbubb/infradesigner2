import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ClusterCapacity } from '@/services/pricing/pricingModelService';
import { Cpu, MemoryStick, Server, AlertCircle, Info, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDesignStore } from '@/store';

interface CapacityBreakdownProps {
  capacity: ClusterCapacity;
}

export const CapacityBreakdown: React.FC<CapacityBreakdownProps> = ({ capacity }) => {
  const [haDetailsOpen, setHaDetailsOpen] = useState(false);
  const activeDesign = useDesignStore((state) => state.activeDesign);

  // Debug logging
  console.log('[CapacityBreakdown] Received capacity:', {
    isHyperConverged: capacity.isHyperConverged,
    storageOverheadCores: capacity.storageOverheadCores,
    storageOverheadMemoryGB: capacity.storageOverheadMemoryGB,
    totalDisksInCluster: capacity.totalDisksInCluster,
    cpuCoresPerDisk: capacity.cpuCoresPerDisk,
    memoryGBPerDisk: capacity.memoryGBPerDisk
  });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
  };

  const formatCompactNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const formatMemory = (gb: number) => {
    if (gb >= 1024) {
      return `${(gb / 1024).toFixed(1)} TiB`;
    }
    return `${gb} GB`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const cpuUtilization = capacity.totalvCPUs > 0 
    ? (capacity.sellingvCPUs / capacity.totalvCPUs) * 100 
    : 0;

  const memoryUtilization = capacity.totalMemoryGB > 0
    ? (capacity.sellingMemoryGB / capacity.totalMemoryGB) * 100
    : 0;
  
  // Calculate percentages for each segment
  // Storage overhead is calculated as a percentage of total physical capacity
  const storageOverheadPercent = capacity.isHyperConverged && capacity.storageOverheadCores
    ? (capacity.storageOverheadCores / capacity.totalPhysicalCores) * 100
    : 0;

  // Adjust other percentages to account for storage overhead
  const availableForCompute = 100 - storageOverheadPercent;

  const cpuHAPercent = capacity.haReservation * availableForCompute;
  const cpuVirtPercent = capacity.virtualizationOverhead * availableForCompute;
  const cpuReservePercent = (1 - capacity.targetUtilization) * (availableForCompute - cpuHAPercent - cpuVirtPercent);
  const cpuSellablePercent = availableForCompute - cpuHAPercent - cpuVirtPercent - cpuReservePercent;

  const memHAPercent = capacity.haReservation * availableForCompute;
  const memVirtPercent = capacity.virtualizationOverhead * availableForCompute;
  const memReservePercent = (1 - capacity.targetUtilization) * (availableForCompute - memHAPercent - memVirtPercent);
  const memSellablePercent = availableForCompute - memHAPercent - memVirtPercent - memReservePercent;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cluster Capacity Breakdown</CardTitle>
        <CardDescription>
          Understanding how cluster capacity is allocated and priced
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compact Resource Summary with Hover Details */}
        <TooltipProvider>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {/* Physical Resources */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 bg-muted/50 rounded-lg cursor-help hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Server className="h-3 w-3" />
                    <span>Physical</span>
                  </div>
                  <div className="font-semibold flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-muted-foreground" />
                      <span>{formatCompactNumber(capacity.totalPhysicalCores)}</span>
                    </div>
                    <span className="text-muted-foreground">/</span>
                    <div className="flex items-center gap-1">
                      <MemoryStick className="h-3 w-3 text-muted-foreground" />
                      <span>{formatMemory(capacity.totalPhysicalMemoryGB)}</span>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">Physical Resources</p>
                  <div className="space-y-1 text-sm">
                    <p>Cores: {formatNumber(capacity.totalPhysicalCores)}</p>
                    <p>Memory: {formatNumber(capacity.totalPhysicalMemoryGB)} GB</p>
                    <p>Nodes: {capacity.totalPhysicalNodes}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Base hardware capacity before virtualization</p>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Virtual Resources */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 bg-muted/50 rounded-lg cursor-help hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Cpu className="h-3 w-3" />
                    <span>Virtual</span>
                  </div>
                  <div className="font-semibold flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-muted-foreground" />
                      <span>{formatCompactNumber(capacity.totalvCPUs)} vCPUs</span>
                    </div>
                    <span className="text-muted-foreground">/</span>
                    <div className="flex items-center gap-1">
                      <MemoryStick className="h-3 w-3 text-muted-foreground" />
                      <span>{formatMemory(capacity.totalMemoryGB)}</span>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">Virtual Resources</p>
                  <div className="space-y-1 text-sm">
                    <p>vCPUs: {formatNumber(capacity.totalvCPUs)}</p>
                    <p>Memory: {formatNumber(capacity.totalMemoryGB)} GB</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    After oversubscription ratios:
                    <br />• CPU: {(capacity.totalvCPUs / capacity.totalPhysicalCores).toFixed(1)}:1
                    <br />• Memory: {(capacity.totalMemoryGB / capacity.totalPhysicalMemoryGB).toFixed(1)}:1
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Sellable Resources */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg cursor-help hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mb-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Sellable</span>
                  </div>
                  <div className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span>{formatCompactNumber(Math.round(capacity.sellingvCPUs))} vCPUs</span>
                    </div>
                    <span className="text-green-600/60 dark:text-green-400/60">/</span>
                    <div className="flex items-center gap-1">
                      <MemoryStick className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span>{formatMemory(Math.round(capacity.sellingMemoryGB))}</span>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">Sellable Capacity</p>
                  <div className="space-y-1 text-sm">
                    <p>vCPUs: {formatNumber(Math.round(capacity.sellingvCPUs))}</p>
                    <p>Memory: {formatNumber(Math.round(capacity.sellingMemoryGB))} GB</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    After deductions:
                    <br />• HA Reserve: {(capacity.haReservation * 100).toFixed(1)}%
                    <br />• Virtualization: {(capacity.virtualizationOverhead * 100).toFixed(1)}%
                    <br />• Target Util: {(capacity.targetUtilization * 100).toFixed(0)}%
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Capacity Waterfall */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Cluster Capacity Allocation
          </h4>
          <TooltipProvider>
            <div className="space-y-4">
              {/* Unified Cluster Waterfall */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Resource Allocation</span>
                  <span className="font-medium">
                    {formatNumber(Math.round(capacity.sellingvCPUs))} vCPUs | {formatNumber(Math.round(capacity.sellingMemoryGB))} GB RAM
                  </span>
                </div>
                <div className="relative h-14 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  {/* Sellable capacity - green */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="absolute inset-y-0 left-0 bg-green-600 dark:bg-green-500 flex flex-col items-center justify-center cursor-help"
                        style={{ width: `${cpuSellablePercent}%` }}
                      >
                        <span className="text-xs text-white font-semibold px-1">
                          {cpuSellablePercent > 15 && 'Sellable Capacity'}
                        </span>
                        {cpuSellablePercent > 20 && (
                          <span className="text-xs text-white/80 px-1">
                            {cpuSellablePercent.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">Sellable Capacity</p>
                        <p className="text-sm">CPU: {formatNumber(Math.round(capacity.sellingvCPUs))} vCPUs</p>
                        <p className="text-sm">Memory: {formatNumber(Math.round(capacity.sellingMemoryGB))} GB</p>
                        <p className="text-xs text-muted-foreground mt-1">Available for VM allocation at target utilization</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Reserved for target utilization - lighter green */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="absolute inset-y-0 bg-green-400 dark:bg-green-600 flex items-center justify-center cursor-help"
                        style={{ 
                          left: `${cpuSellablePercent}%`,
                          width: `${cpuReservePercent}%` 
                        }}
                      >
                        <span className="text-xs text-white font-medium px-1">
                          {cpuReservePercent > 8 && 'Reserve'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">Reserve Capacity</p>
                        <p className="text-sm">CPU: {formatNumber((capacity.usablevCPUs - capacity.sellingvCPUs))} vCPUs</p>
                        <p className="text-sm">Memory: {formatNumber((capacity.usableMemoryGB - capacity.sellingMemoryGB))} GB</p>
                        <p className="text-xs text-muted-foreground mt-1">Operational buffer for burst & growth</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Virtualization overhead - blue */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="absolute inset-y-0 bg-blue-600 dark:bg-blue-500 flex items-center justify-center cursor-help"
                        style={{ 
                          left: `${cpuSellablePercent + cpuReservePercent}%`,
                          width: `${cpuVirtPercent}%` 
                        }}
                      >
                        <span className="text-xs text-white font-medium px-1">
                          {cpuVirtPercent > 3 && 'Virt'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">Virtualization Overhead</p>
                        <p className="text-sm">CPU: {formatNumber(capacity.totalvCPUs * capacity.virtualizationOverhead)} vCPUs</p>
                        <p className="text-sm">Memory: {formatNumber(capacity.totalMemoryGB * capacity.virtualizationOverhead)} GB</p>
                        <p className="text-xs text-muted-foreground mt-1">Reserved for hypervisor operations</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* HA reservation - orange */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute inset-y-0 bg-orange-600 dark:bg-orange-500 flex items-center justify-center cursor-help"
                        style={{
                          left: `${cpuSellablePercent + cpuReservePercent + cpuVirtPercent}%`,
                          width: `${cpuHAPercent}%`
                        }}
                      >
                        <span className="text-xs text-white font-medium px-1">
                          {cpuHAPercent > 3 && 'HA'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">HA Reservation</p>
                        <p className="text-sm">CPU: {formatNumber(capacity.totalvCPUs * capacity.haReservation)} vCPUs</p>
                        <p className="text-sm">Memory: {formatNumber(capacity.totalMemoryGB * capacity.haReservation)} GB</p>
                        <p className="text-xs text-muted-foreground mt-1">Reserved for failure tolerance</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  {/* Storage overhead - purple (hyper-converged only) */}
                  {capacity.isHyperConverged && storageOverheadPercent > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="absolute inset-y-0 bg-purple-600 dark:bg-purple-500 flex items-center justify-center cursor-help"
                          style={{
                            left: `${cpuSellablePercent + cpuReservePercent + cpuVirtPercent + cpuHAPercent}%`,
                            width: `${storageOverheadPercent}%`
                          }}
                        >
                          <span className="text-xs text-white font-medium px-1">
                            {storageOverheadPercent > 3 && 'Storage'}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">Storage Service Overhead</p>
                          <p className="text-sm">CPU: {formatNumber(capacity.storageOverheadCores || 0)} cores</p>
                          <p className="text-sm">Memory: {formatNumber(capacity.storageOverheadMemoryGB || 0)} GB</p>
                          <p className="text-sm">Disks: {capacity.totalDisksInCluster || 0}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Resources reserved for storage services
                            <br />• {capacity.cpuCoresPerDisk || 4} cores/disk
                            <br />• {capacity.memoryGBPerDisk || 2} GB RAM/disk
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              
              {/* Waterfall Legend */}
              <div className={`grid ${capacity.isHyperConverged ? 'grid-cols-5' : 'grid-cols-4'} gap-2 mt-3 text-xs`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded"></div>
                  <span className="text-muted-foreground">Sellable ({cpuSellablePercent.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 dark:bg-green-600 rounded"></div>
                  <span className="text-muted-foreground">Reserve ({cpuReservePercent.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 dark:bg-blue-500 rounded"></div>
                  <span className="text-muted-foreground">Virtualization ({cpuVirtPercent.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-600 dark:bg-orange-500 rounded"></div>
                  <span className="text-muted-foreground">HA ({cpuHAPercent.toFixed(0)}%)</span>
                </div>
                {capacity.isHyperConverged && storageOverheadPercent > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-600 dark:bg-purple-500 rounded"></div>
                    <span className="text-muted-foreground">Storage ({storageOverheadPercent.toFixed(0)}%)</span>
                  </div>
                )}
              </div>
            </div>
          </TooltipProvider>
        </div>

        {/* Overhead Breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-3">Overhead Components</h4>
          <div className={`grid ${capacity.isHyperConverged ? 'grid-cols-4' : 'grid-cols-3'} gap-3 text-sm`}>
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
              <div className="flex items-center justify-between">
                <div className="text-orange-600 dark:text-orange-400 font-medium">
                  HA Reservation
                </div>
                <Collapsible open={haDetailsOpen} onOpenChange={setHaDetailsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      {haDetailsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </div>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {formatPercentage(capacity.haReservation)}
              </div>
              <div className="text-xs text-muted-foreground">
                Reserved for failure tolerance
              </div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="text-blue-600 dark:text-blue-400 font-medium">
                Virtualization
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatPercentage(capacity.virtualizationOverhead)}
              </div>
              <div className="text-xs text-muted-foreground">
                Hypervisor overhead
              </div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <div className="text-green-600 dark:text-green-400 font-medium">
                Target Utilization
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatPercentage(capacity.targetUtilization)}
              </div>
              <div className="text-xs text-muted-foreground">
                Operational buffer
              </div>
            </div>
            {capacity.isHyperConverged && capacity.storageOverheadCores && capacity.storageOverheadCores > 0 && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                <div className="text-purple-600 dark:text-purple-400 font-medium">
                  Storage Overhead
                </div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {formatPercentage(storageOverheadPercent / 100)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {capacity.totalDisksInCluster} disks × {capacity.cpuCoresPerDisk}c/{capacity.memoryGBPerDisk}GB
                </div>
              </div>
            )}
          </div>
          
          {/* HA Reservation Breakdown */}
          <Collapsible open={haDetailsOpen} onOpenChange={setHaDetailsOpen}>
            <CollapsibleContent>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3">
                <h5 className="text-sm font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  HA Reservation Calculation
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Physical Hosts:</span>
                    <span className="font-medium">
                      {capacity.totalPhysicalNodes} nodes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Availability Zones:</span>
                    <span className="font-medium">
                      {(() => {
                        const azs = activeDesign?.requirements?.physicalConstraints?.availabilityZones || [];
                        const azCount = azs.length || activeDesign?.requirements?.physicalConstraints?.totalAvailabilityZones || 1;
                        return `${azCount} zone${azCount > 1 ? 's' : ''}`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AZ Redundancy Setting:</span>
                    <span className="font-medium">
                      {(() => {
                        // Get all compute clusters' redundancy settings
                        const clusters = activeDesign?.requirements?.computeRequirements?.computeClusters || [];
                        const redundancies = clusters.map(c => c.availabilityZoneRedundancy).filter(Boolean);
                        if (redundancies.length === 0) return 'N+0';
                        // Find the highest redundancy requirement
                        const maxRedundancy = redundancies.reduce((max, curr) => {
                          const currMatch = curr.match(/N\+(\d+)/);
                          const maxMatch = max.match(/N\+(\d+)/);
                          if (currMatch && maxMatch) {
                            return parseInt(currMatch[1]) > parseInt(maxMatch[1]) ? curr : max;
                          }
                          return max;
                        }, redundancies[0]);
                        return maxRedundancy;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Failure Tolerance:</span>
                    <span className="font-medium">
                      {(() => {
                        const clusters = activeDesign?.requirements?.computeRequirements?.computeClusters || [];
                        let azFailures = 0;
                        clusters.forEach(cluster => {
                          if (cluster.availabilityZoneRedundancy) {
                            const match = cluster.availabilityZoneRedundancy.match(/N\+(\d+)/);
                            if (match) {
                              azFailures = Math.max(azFailures, parseInt(match[1], 10));
                            }
                          }
                        });
                        return `${azFailures} AZ${azFailures !== 1 ? 's' : ''} + 1 host`;
                      })()}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reserved Capacity:</span>
                      <span className="font-medium">
                        {(capacity.haReservation * 100).toFixed(1)}% of resources
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Formula: (AZ Failures × Hosts/Zone + 1 Additional Host) ÷ Total Hosts
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <strong>Note:</strong> HA reservation reduces sellable capacity to ensure the cluster can withstand the specified failures. The reservation is calculated based on the cluster's AZ redundancy setting (N+0, N+1, N+2) plus always 1 additional host for node-level redundancy.
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
};