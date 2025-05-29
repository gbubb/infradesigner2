import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AverageVMCostBreakdown } from './AverageVMCostBreakdown';

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
  totalCapitalCost,
  costPerVCPU,
  costTBMemory,
  monthlyCostPerAverageVM,
  averageVMVCPUs,
  averageVMMemoryGB,
  totalVCPUs,
  totalMemoryTB,
  monthlyCost,
  quantityOfAverageVMs
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
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
