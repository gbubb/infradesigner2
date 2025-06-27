import React from 'react';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TB_TO_TIB_FACTOR } from '@/store/slices/requirements/constants';

interface CostPerTiBBreakdownProps {
  clusterName: string;
  poolType: string;
  totalRawCapacityTB: number;
  usableCapacityTB: number;
  usableCapacityTiB: number;
  totalNodeCost: number;
  costPerTiB: number;
  nodeCount: number;
  isHyperConverged?: boolean;
  totalStorageCost?: number;
  totalDiskCost?: number;
  totalServerCost?: number;
  totalDisks?: number;
  storageAttributedServerCost?: number;
  totalCpuCores?: number;
  storageCpuCores?: number;
  cpuCoresPerDisk?: number;
  costBreakdown?: {
    nodes: Array<{
      name: string;
      quantity: number;
      serverCost: number;
      diskCost: number;
      diskCount: number;
      diskDetails: Array<{ name: string; capacityTB: number; quantity: number; cost: number }>;
    }>;
  };
}

export const CostPerTiBBreakdown: React.FC<CostPerTiBBreakdownProps> = ({
  clusterName,
  poolType,
  totalRawCapacityTB,
  usableCapacityTB,
  usableCapacityTiB,
  totalNodeCost,
  costPerTiB,
  nodeCount,
  isHyperConverged = false,
  totalStorageCost,
  totalDiskCost,
  totalServerCost,
  totalDisks,
  storageAttributedServerCost,
  totalCpuCores,
  storageCpuCores,
  cpuCoresPerDisk,
  costBreakdown
}) => {
  // Get pool efficiency factor based on pool type
  const getPoolEfficiencyFactor = (poolType: string): number => {
    switch (poolType) {
      case '2 Replica': return 1/2;
      case '3 Replica': return 1/3;
      case '4+2 EC': return 4/6;
      case '8+2 EC': return 8/10;
      case '14+4 EC': return 14/18;
      default: return 1/3;
    }
  };

  const poolEfficiencyFactor = getPoolEfficiencyFactor(poolType);
  const poolEfficiencyPercentage = (poolEfficiencyFactor * 100).toFixed(1);
  const costBasis = isHyperConverged && totalStorageCost ? totalStorageCost : totalNodeCost;
  
  // Calculate the pure server cost (excluding disks)
  const serverCostWithoutDisks = (totalServerCost || 0) - (totalDiskCost || 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-4 w-4 ml-1 inline-flex align-middle"
          type="button"
        >
          <Calculator className="h-3 w-3" />
          <span className="sr-only">View cost per TiB calculation</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] max-h-[600px] overflow-y-auto" align="start">
        <div className="space-y-3">
          <div className="font-semibold text-sm">Cost per TiB Calculation - {clusterName}</div>
          
          <Card className="p-3 bg-slate-50 space-y-2">
            <div className="text-xs space-y-1">
              <div className="font-medium">1. Raw Storage Capacity</div>
              <div className="pl-3 text-muted-foreground">
                Total Raw Capacity: {totalRawCapacityTB.toFixed(2)} TB
              </div>
              {costBreakdown && costBreakdown.nodes.length > 0 && (
                <div className="pl-3 mt-1 space-y-1">
                  <div className="text-[10px] font-medium text-muted-foreground">Breakdown by node:</div>
                  {costBreakdown.nodes.map((node, idx) => (
                    <div key={idx} className="pl-3 text-[10px] text-muted-foreground">
                      • {node.name} x{node.quantity}:
                      {node.diskDetails.map((disk, diskIdx) => (
                        <div key={diskIdx} className="pl-3">
                          - {disk.quantity}x {disk.name} = {(disk.capacityTB * disk.quantity).toFixed(2)} TB
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="my-2" />

            <div className="text-xs space-y-1">
              <div className="font-medium">2. Usable Capacity Calculation</div>
              <div className="pl-3 text-muted-foreground">
                Pool Type: {poolType}
              </div>
              <div className="pl-3 text-muted-foreground">
                Pool Efficiency: {poolEfficiencyPercentage}%
              </div>
              <div className="pl-3 text-muted-foreground">
                Usable Capacity (TB): {totalRawCapacityTB.toFixed(2)} × {poolEfficiencyFactor.toFixed(3)} = {usableCapacityTB.toFixed(2)} TB
              </div>
              <div className="pl-3 text-muted-foreground">
                Usable Capacity (TiB): {usableCapacityTB.toFixed(2)} × {TB_TO_TIB_FACTOR} = {usableCapacityTiB.toFixed(2)} TiB
              </div>
            </div>

            <Separator className="my-2" />

            <div className="text-xs space-y-1">
              <div className="font-medium">3. Cost Basis</div>
              <div className="pl-3 text-muted-foreground">
                Node Count: {nodeCount} nodes
              </div>
              {totalServerCost !== undefined && totalDiskCost !== undefined && (
                <>
                  <div className="pl-3 text-muted-foreground">
                    Server Cost: ${serverCostWithoutDisks.toLocaleString()}
                  </div>
                  <div className="pl-3 text-muted-foreground">
                    Disk Cost: ${totalDiskCost.toLocaleString()}
                  </div>
                  <div className="pl-3 text-muted-foreground font-medium">
                    Total Node Cost: ${totalNodeCost.toLocaleString()}
                  </div>
                </>
              )}
              
              {isHyperConverged && totalStorageCost !== undefined && storageAttributedServerCost !== undefined && (
                <>
                  <div className="pl-3 mt-2 pt-2 border-t text-muted-foreground">
                    <div className="font-medium mb-1">Hyper-converged Storage Attribution:</div>
                  </div>
                  {totalCpuCores !== undefined && storageCpuCores !== undefined && cpuCoresPerDisk !== undefined && (
                    <>
                      <div className="pl-6 text-[10px] text-muted-foreground">
                        Total CPU Cores: {totalCpuCores} cores
                      </div>
                      <div className="pl-6 text-[10px] text-muted-foreground">
                        Storage CPU Allocation: {cpuCoresPerDisk} cores per disk
                      </div>
                      <div className="pl-6 text-[10px] text-muted-foreground">
                        Total Disks: {totalDisks} disks
                      </div>
                      <div className="pl-6 text-[10px] text-muted-foreground">
                        Storage CPU Cores: {totalDisks} disks × {cpuCoresPerDisk} cores/disk = {storageCpuCores} cores
                      </div>
                      <div className="pl-6 text-[10px] text-muted-foreground">
                        Storage CPU Ratio: {storageCpuCores} ÷ {totalCpuCores} = {((storageCpuCores / totalCpuCores) * 100).toFixed(1)}%
                      </div>
                    </>
                  )}
                  <div className="pl-6 text-[10px] text-muted-foreground mt-1">
                    Server Cost (excl. disks): ${serverCostWithoutDisks.toLocaleString()}
                  </div>
                  <div className="pl-6 text-[10px] text-muted-foreground">
                    Storage-Attributed Server Cost: ${serverCostWithoutDisks.toLocaleString()} × {((storageCpuCores || 0) / (totalCpuCores || 1) * 100).toFixed(1)}% = ${storageAttributedServerCost.toLocaleString()}
                  </div>
                  <div className="pl-6 text-[10px] text-muted-foreground">
                    Disk Cost: ${totalDiskCost?.toLocaleString()}
                  </div>
                  <div className="pl-6 text-[10px] text-muted-foreground font-medium">
                    Total Storage-Attributed Cost: ${totalStorageCost.toLocaleString()}
                  </div>
                </>
              )}
            </div>

            <Separator className="my-2" />

            <div className="text-xs space-y-1">
              <div className="font-medium">4. Cost per TiB</div>
              <div className="pl-3 text-muted-foreground">
                Formula: Cost Basis ÷ Usable Capacity (TiB)
              </div>
              <div className="pl-3 text-muted-foreground">
                Calculation: ${costBasis.toLocaleString()} ÷ {usableCapacityTiB.toFixed(2)} TiB
              </div>
              <div className="pl-3 font-medium text-primary">
                Result: ${costPerTiB.toLocaleString(undefined, { maximumFractionDigits: 2 })} per TiB
              </div>
            </div>
          </Card>

          {isHyperConverged && (
            <div className="text-[10px] text-muted-foreground italic">
              Note: For hyper-converged clusters, only the storage-related portion of the infrastructure cost is included in this calculation.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};