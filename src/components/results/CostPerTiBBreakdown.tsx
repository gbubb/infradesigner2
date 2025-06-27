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
  totalStorageCost
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
      <PopoverContent className="w-96" align="start">
        <div className="space-y-3">
          <div className="font-semibold text-sm">Cost per TiB Calculation - {clusterName}</div>
          
          <Card className="p-3 bg-slate-50 space-y-2">
            <div className="text-xs space-y-1">
              <div className="font-medium">1. Raw Storage Capacity</div>
              <div className="pl-3 text-muted-foreground">
                Total Raw Capacity: {totalRawCapacityTB.toFixed(2)} TB
              </div>
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
              {isHyperConverged && totalStorageCost ? (
                <>
                  <div className="pl-3 text-muted-foreground">
                    Configuration: Hyper-converged
                  </div>
                  <div className="pl-3 text-muted-foreground">
                    Total Node Cost: ${totalNodeCost.toLocaleString()}
                  </div>
                  <div className="pl-3 text-muted-foreground">
                    Storage-Attributed Cost: ${totalStorageCost.toLocaleString()}
                  </div>
                  <div className="pl-3 text-muted-foreground text-[10px] italic">
                    (Includes disk costs + proportional server cost based on CPU cores allocated to storage)
                  </div>
                </>
              ) : (
                <div className="pl-3 text-muted-foreground">
                  Total Node Cost: ${totalNodeCost.toLocaleString()}
                </div>
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