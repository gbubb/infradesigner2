
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ResourceSummaryProps {
  totalVCPUs: number;
  totalComputeMemoryTB: number;
  totalStorageTB: number;
  totalRackQuantity: number;
  totalRackUnits: number;
  totalPower: number;
  powerPerRack: number;
}

interface CostAnalysisProps {
  totalCost: number;
  costPerVCPU: number;
  costPerTB: number;
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
            <span className="text-muted-foreground">Total Storage:</span>
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
            <span className="font-medium">{totalPower.toLocaleString()} W</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Power per Rack:</span>
            <span className="font-medium">
              {powerPerRack.toLocaleString(undefined, { maximumFractionDigits: 0 })} W
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const CostAnalysisCard: React.FC<CostAnalysisProps> = ({
  totalCost,
  costPerVCPU,
  costPerTB
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Cost:</span>
            <span className="font-medium">${totalCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost per vCPU:</span>
            <span className="font-medium">${costPerVCPU.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost per TB:</span>
            <span className="font-medium">${costPerTB.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
