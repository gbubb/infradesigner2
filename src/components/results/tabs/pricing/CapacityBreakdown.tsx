import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ClusterCapacity } from '@/services/pricing/pricingModelService';
import { Cpu, MemoryStick, Server, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
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
  
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
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
  const cpuHAPercent = capacity.haReservation * 100;
  const cpuVirtPercent = capacity.virtualizationOverhead * 100;
  const cpuReservePercent = (1 - capacity.targetUtilization) * (100 - cpuHAPercent - cpuVirtPercent);
  const cpuSellablePercent = 100 - cpuHAPercent - cpuVirtPercent - cpuReservePercent;
  
  const memHAPercent = capacity.haReservation * 100;
  const memVirtPercent = capacity.virtualizationOverhead * 100;
  const memReservePercent = (1 - capacity.targetUtilization) * (100 - memHAPercent - memVirtPercent);
  const memSellablePercent = 100 - memHAPercent - memVirtPercent - memReservePercent;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cluster Capacity Breakdown</CardTitle>
        <CardDescription>
          Understanding how cluster capacity is allocated and priced
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Physical Resources */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Server className="h-4 w-4" />
            Physical Resources
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">Physical Cores</span>
              <span className="font-medium">{formatNumber(capacity.totalPhysicalCores)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">Physical Memory</span>
              <span className="font-medium">{formatNumber(capacity.totalPhysicalMemoryGB)} GB</span>
            </div>
          </div>
        </div>

        {/* Virtual Resources (after oversubscription) */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Virtual Resources (with oversubscription)
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">Total vCPUs</span>
              <span className="font-medium">{formatNumber(capacity.totalvCPUs)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">Total Memory</span>
              <span className="font-medium">{formatNumber(capacity.totalMemoryGB)} GB</span>
            </div>
          </div>
        </div>

        {/* Capacity Waterfall */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Capacity Allocation Waterfall
          </h4>
          <TooltipProvider>
            <div className="space-y-3">
              {/* vCPU Waterfall */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">vCPU Allocation</span>
                  <span className="font-medium">{formatNumber(capacity.sellingvCPUs)} / {formatNumber(capacity.totalvCPUs)}</span>
                </div>
                <div className="relative h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  {/* Sellable capacity - green (matching Overhead Components) */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="absolute inset-y-0 left-0 bg-green-600 dark:bg-green-500 flex items-center justify-center cursor-help"
                        style={{ width: `${cpuSellablePercent}%` }}
                      >
                        <span className="text-xs text-white font-medium px-1">
                          {cpuSellablePercent > 10 && 'Sellable'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">Sellable Capacity</p>
                        <p>{formatNumber(capacity.sellingvCPUs)} vCPUs ({cpuSellablePercent.toFixed(1)}%)</p>
                        <p className="text-xs text-muted-foreground">Available for VM allocation</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Reserved for target utilization - green (lighter, matching Target Utilization box) */}
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
                          {cpuReservePercent > 10 && 'Reserve'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">Reserve Capacity</p>
                        <p>{formatNumber((capacity.usablevCPUs - capacity.sellingvCPUs))} vCPUs ({cpuReservePercent.toFixed(1)}%)</p>
                        <p className="text-xs text-muted-foreground">Operational buffer for burst & growth</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Virtualization overhead - blue (matching Virtualization box) */}
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
                          {cpuVirtPercent > 5 && 'Virt'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">Virtualization Overhead</p>
                        <p>{formatNumber(capacity.totalvCPUs * capacity.virtualizationOverhead)} vCPUs ({cpuVirtPercent.toFixed(1)}%)</p>
                        <p className="text-xs text-muted-foreground">Reserved for hypervisor operations</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* HA reservation - orange (matching HA Reservation box) */}
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
                          {cpuHAPercent > 5 && 'HA'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">HA Reservation</p>
                        <p>{formatNumber(capacity.totalvCPUs * capacity.haReservation)} vCPUs ({cpuHAPercent.toFixed(1)}%)</p>
                        <p className="text-xs text-muted-foreground">Reserved for failure tolerance</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              {/* Memory Waterfall */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Memory Allocation</span>
                  <span className="font-medium">{formatNumber(capacity.sellingMemoryGB)} / {formatNumber(capacity.totalMemoryGB)} GB</span>
                </div>
                <div className="relative h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  {/* Sellable capacity - green */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="absolute inset-y-0 left-0 bg-green-600 dark:bg-green-500 flex items-center justify-center cursor-help"
                        style={{ width: `${memSellablePercent}%` }}
                      >
                        <span className="text-xs text-white font-medium px-1">
                          {memSellablePercent > 10 && 'Sellable'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">Sellable Memory</p>
                        <p>{formatNumber(capacity.sellingMemoryGB)} GB ({memSellablePercent.toFixed(1)}%)</p>
                        <p className="text-xs text-muted-foreground">Available for VM allocation</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Reserved for target utilization - green (lighter) */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="absolute inset-y-0 bg-green-400 dark:bg-green-600 flex items-center justify-center cursor-help"
                        style={{ 
                          left: `${memSellablePercent}%`,
                          width: `${memReservePercent}%` 
                        }}
                      >
                        <span className="text-xs text-white font-medium px-1">
                          {memReservePercent > 10 && 'Reserve'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">Reserve Memory</p>
                        <p>{formatNumber((capacity.usableMemoryGB - capacity.sellingMemoryGB))} GB ({memReservePercent.toFixed(1)}%)</p>
                        <p className="text-xs text-muted-foreground">Operational buffer for burst & growth</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Virtualization overhead - blue */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="absolute inset-y-0 bg-blue-600 dark:bg-blue-500 flex items-center justify-center cursor-help"
                        style={{ 
                          left: `${memSellablePercent + memReservePercent}%`,
                          width: `${memVirtPercent}%` 
                        }}
                      >
                        <span className="text-xs text-white font-medium px-1">
                          {memVirtPercent > 5 && 'Virt'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">Virtualization Overhead</p>
                        <p>{formatNumber(capacity.totalMemoryGB * capacity.virtualizationOverhead)} GB ({memVirtPercent.toFixed(1)}%)</p>
                        <p className="text-xs text-muted-foreground">Reserved for hypervisor operations</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* HA reservation - orange */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="absolute inset-y-0 bg-orange-600 dark:bg-orange-500 flex items-center justify-center cursor-help"
                        style={{ 
                          left: `${memSellablePercent + memReservePercent + memVirtPercent}%`,
                          width: `${memHAPercent}%` 
                        }}
                      >
                        <span className="text-xs text-white font-medium px-1">
                          {memHAPercent > 5 && 'HA'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">HA Reservation</p>
                        <p>{formatNumber(capacity.totalMemoryGB * capacity.haReservation)} GB ({memHAPercent.toFixed(1)}%)</p>
                        <p className="text-xs text-muted-foreground">Reserved for failure tolerance</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </TooltipProvider>
        </div>

        {/* Overhead Breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-3">Overhead Components</h4>
          <div className="grid grid-cols-3 gap-3 text-sm">
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