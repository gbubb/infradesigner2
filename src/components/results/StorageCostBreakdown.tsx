import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StoragePoolEfficiencyFactors } from '@/store/slices/requirements/constants';

interface StorageCostBreakdownProps {
  clusterName: string;
  isHyperConverged: boolean;
  totalNodeCost: number;
  totalStorageCost: number;
  usableCapacityTiB: number;
  monthlyStorageCostPerTiB: number;
  amortisationPeriodMonths: number;
  poolType?: string;
  nodeCount?: number;
  totalRawCapacityTB?: number;
}

export const StorageCostBreakdown: React.FC<StorageCostBreakdownProps> = ({
  clusterName,
  isHyperConverged,
  totalNodeCost,
  totalStorageCost,
  usableCapacityTiB,
  monthlyStorageCostPerTiB,
  amortisationPeriodMonths,
  poolType = '3 Replica',
  nodeCount = 0,
  totalRawCapacityTB = 0
}) => {
  const [open, setOpen] = React.useState(false);

  // Determine which cost basis to use
  const costBasis = isHyperConverged ? totalStorageCost : totalNodeCost;
  const monthlyStorageCost = costBasis / amortisationPeriodMonths;

  // Calculate efficiency factor from actual data or use default from constants
  // If we have actual capacity data, calculate the real efficiency
  const efficiencyFactor = totalRawCapacityTB > 0 && usableCapacityTiB > 0
    ? (usableCapacityTiB / 0.909495) / totalRawCapacityTB  // Convert TiB back to TB for comparison
    : (StoragePoolEfficiencyFactors[poolType] || (1/3));
  const efficiencyPercentage = (efficiencyFactor * 100).toFixed(1);
  
  const calculationSteps = [
    `Storage Cluster: ${clusterName}`,
    ``,
    `Cluster Configuration:`,
    `- Cluster Type: ${isHyperConverged ? 'Hyper-Converged' : 'Conventional Storage'}`,
    `- Number of Nodes: ${nodeCount}`,
    `- Storage Pool Type: ${poolType}`,
    `- Storage Efficiency: ${efficiencyPercentage}%`,
    ``,
    `Capacity Details:`,
    `- Total Raw Capacity: ${totalRawCapacityTB.toFixed(2)} TB`,
    `- Usable Capacity: ${usableCapacityTiB.toFixed(2)} TiB`,
    `- Efficiency Factor: ${totalRawCapacityTB.toFixed(2)} TB × ${efficiencyPercentage}% = ${(totalRawCapacityTB * efficiencyFactor).toFixed(2)} TB`,
    `- TB to TiB Conversion: ${(totalRawCapacityTB * efficiencyFactor).toFixed(2)} TB × 0.909 = ${usableCapacityTiB.toFixed(2)} TiB`,
    ``,
    `Cost Basis Calculation:`,
  ];

  if (isHyperConverged) {
    calculationSteps.push(
      `- Total Node Cost: $${totalNodeCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      `- Storage-Specific Cost: $${totalStorageCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      `  (Includes disk costs + proportional server costs)`,
      `- Cost Basis Used: Storage-Specific Cost`
    );
  } else {
    calculationSteps.push(
      `- Total Node Cost: $${totalNodeCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      `- Cost Basis Used: Full Node Cost`,
      `  (Conventional storage nodes are 100% dedicated to storage)`
    );
  }

  calculationSteps.push(
    ``,
    `Monthly Cost Amortization:`,
    `- Capital Cost: $${costBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `- Device Lifespan: ${(amortisationPeriodMonths/12).toFixed(1)} years (${amortisationPeriodMonths} months)`,
    `  (From Storage Requirements configuration)`,
    `- Monthly Storage Cost: $${costBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })} ÷ ${amortisationPeriodMonths} months`,
    `- Monthly Storage Cost: $${monthlyStorageCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    ``,
    `Cost per TiB Calculation:`,
    `- Monthly Storage Cost: $${monthlyStorageCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `- Usable Capacity: ${usableCapacityTiB.toFixed(2)} TiB`,
    `- Cost per TiB: $${monthlyStorageCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} ÷ ${usableCapacityTiB.toFixed(2)} TiB`,
    `- Final Monthly Cost per TiB: $${monthlyStorageCostPerTiB.toLocaleString(undefined, { maximumFractionDigits: 2 })}/TiB`
  );

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-5 w-5 rounded-full" 
        onClick={() => setOpen(true)}
        type="button"
      >
        <Calculator className="h-3 w-3" />
        <span className="sr-only">View calculation</span>
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Storage Cost per TiB Calculation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <Card className="p-3 bg-slate-50 max-h-[400px] overflow-y-auto">
              <div className="space-y-1.5">
                {calculationSteps.map((step, index) => (
                  <div key={index} className="text-xs">
                    {step || '\u00A0'}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};