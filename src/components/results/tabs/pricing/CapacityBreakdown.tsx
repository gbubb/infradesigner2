import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ClusterCapacity } from '@/services/pricing/pricingModelService';
import { Cpu, MemoryStick, Server, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface CapacityBreakdownProps {
  capacity: ClusterCapacity;
}

export const CapacityBreakdown: React.FC<CapacityBreakdownProps> = ({ capacity }) => {
  const [haDetailsOpen, setHaDetailsOpen] = useState(false);
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
          <div className="space-y-3">
            {/* vCPU Waterfall */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">vCPU Allocation</span>
                <span className="font-medium">{formatNumber(capacity.sellingvCPUs)} / {formatNumber(capacity.totalvCPUs)}</span>
              </div>
              <div className="relative h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                {/* Sellable capacity - green */}
                <div 
                  className="absolute inset-y-0 left-0 bg-green-500 flex items-center justify-center"
                  style={{ width: `${cpuUtilization}%` }}
                >
                  <span className="text-xs text-white font-medium px-1">
                    {cpuUtilization > 10 && `${formatNumber(capacity.sellingvCPUs)} sellable`}
                  </span>
                </div>
                
                {/* Reserved for target utilization - yellow */}
                <div 
                  className="absolute inset-y-0 bg-yellow-500 flex items-center justify-center"
                  style={{ 
                    left: `${cpuUtilization}%`,
                    width: `${(capacity.usablevCPUs / capacity.totalvCPUs * 100) - cpuUtilization}%` 
                  }}
                >
                  <span className="text-xs text-white font-medium px-1">
                    {((capacity.usablevCPUs / capacity.totalvCPUs * 100) - cpuUtilization) > 10 && 'Target Reserve'}
                  </span>
                </div>
                
                {/* HA + Virtualization overhead - red */}
                <div 
                  className="absolute inset-y-0 bg-red-500 flex items-center justify-center"
                  style={{ 
                    left: `${capacity.usablevCPUs / capacity.totalvCPUs * 100}%`,
                    width: `${100 - (capacity.usablevCPUs / capacity.totalvCPUs * 100)}%` 
                  }}
                >
                  <span className="text-xs text-white font-medium px-1">
                    {(100 - (capacity.usablevCPUs / capacity.totalvCPUs * 100)) > 10 && 'Overhead'}
                  </span>
                </div>
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
                <div 
                  className="absolute inset-y-0 left-0 bg-green-500 flex items-center justify-center"
                  style={{ width: `${memoryUtilization}%` }}
                >
                  <span className="text-xs text-white font-medium px-1">
                    {memoryUtilization > 10 && `${formatNumber(capacity.sellingMemoryGB)} GB sellable`}
                  </span>
                </div>
                
                {/* Reserved for target utilization - yellow */}
                <div 
                  className="absolute inset-y-0 bg-yellow-500 flex items-center justify-center"
                  style={{ 
                    left: `${memoryUtilization}%`,
                    width: `${(capacity.usableMemoryGB / capacity.totalMemoryGB * 100) - memoryUtilization}%` 
                  }}
                >
                  <span className="text-xs text-white font-medium px-1">
                    {((capacity.usableMemoryGB / capacity.totalMemoryGB * 100) - memoryUtilization) > 10 && 'Target Reserve'}
                  </span>
                </div>
                
                {/* HA + Virtualization overhead - red */}
                <div 
                  className="absolute inset-y-0 bg-red-500 flex items-center justify-center"
                  style={{ 
                    left: `${capacity.usableMemoryGB / capacity.totalMemoryGB * 100}%`,
                    width: `${100 - (capacity.usableMemoryGB / capacity.totalMemoryGB * 100)}%` 
                  }}
                >
                  <span className="text-xs text-white font-medium px-1">
                    {(100 - (capacity.usableMemoryGB / capacity.totalMemoryGB * 100)) > 10 && 'Overhead'}
                  </span>
                </div>
              </div>
            </div>
          </div>
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
                      {Math.ceil(capacity.totalPhysicalCores / 64)} nodes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Availability Zones:</span>
                    <span className="font-medium">3 zones (assumed)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Failure Tolerance:</span>
                    <span className="font-medium">1 host + 0 zones</span>
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
                    Formula: (Failed Zones × Hosts/Zone + Failed Hosts) ÷ Total Hosts
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <strong>Note:</strong> HA reservation is applied once during capacity calculation, reducing sellable resources and thereby increasing per-unit costs.
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