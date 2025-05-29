import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface ClusterAnalysisData {
  name: string;
  type: 'compute' | 'storage';
  consumption: number;
  deviceCount: number;
  costs: {
    compute?: number;
    storage?: number;
    network: number;
    rack: number;
    energy: number;
    licensing: number;
    total: number;
  };
  costBreakdown?: {
    compute?: {
      hardwareCost: number;
      deviceCount: number;
      amortizationPeriod: number;
    };
    storage?: {
      hardwareCost: number;
      deviceCount: number;
      amortizationPeriod: number;
    };
    network: {
      totalCost: number;
      deviceShare: number;
      totalDevices: number;
    };
    rack: {
      totalCost: number;
      ruShare: number;
      totalRU: number;
    };
    energy: {
      totalCost: number;
      powerShare: number;
      totalPower: number;
    };
    licensing: {
      totalCost: number;
      deviceShare: number;
      totalDevices: number;
    };
  };
  revenue: number;
  profit: number;
  profitMargin: number;
}

interface ClusterAnalysisCardProps {
  clusterId: string;
  analysis: ClusterAnalysisData;
}

export const ClusterAnalysisCard: React.FC<ClusterAnalysisCardProps> = ({
  clusterId,
  analysis
}) => {
  return (
    <div key={clusterId} className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h5 className="font-medium">{analysis.name}</h5>
        <div className="flex gap-2">
          <Badge variant="outline">{analysis.type}</Badge>
          <Badge variant="outline">{analysis.consumption}% utilized</Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <h6 className="font-medium text-green-600">Revenue</h6>
          <div className="font-medium text-lg">${analysis.revenue.toFixed(2)}</div>
        </div>
        
        <div className="space-y-2">
          <h6 className="font-medium text-red-600">Allocated Costs</h6>
          <div className="space-y-1 text-sm">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
                <ChevronDown className="h-4 w-4" />
                Show Cost Breakdown
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {analysis.type === 'compute' && analysis.costs.compute !== undefined && analysis.costBreakdown?.compute && (
                  <div className="space-y-1 pl-4 border-l-2 border-blue-200">
                    <div className="font-medium text-blue-600">Compute Hardware</div>
                    <div className="text-xs space-y-1">
                      <div>Hardware Cost: ${analysis.costBreakdown.compute.hardwareCost.toFixed(2)}</div>
                      <div>Device Count: {analysis.costBreakdown.compute.deviceCount}</div>
                      <div>Amortization Period: {analysis.costBreakdown.compute.amortizationPeriod} years</div>
                      <div className="font-medium">Monthly Cost: ${analysis.costs.compute.toFixed(2)}</div>
                    </div>
                  </div>
                )}
                {analysis.type === 'storage' && analysis.costs.storage !== undefined && analysis.costBreakdown?.storage && (
                  <div className="space-y-1 pl-4 border-l-2 border-orange-200">
                    <div className="font-medium text-orange-600">Storage Hardware</div>
                    <div className="text-xs space-y-1">
                      <div>Hardware Cost: ${analysis.costBreakdown.storage.hardwareCost.toFixed(2)}</div>
                      <div>Device Count: {analysis.costBreakdown.storage.deviceCount}</div>
                      <div>Amortization Period: {analysis.costBreakdown.storage.amortizationPeriod} years</div>
                      <div className="font-medium">Monthly Cost: ${analysis.costs.storage.toFixed(2)}</div>
                    </div>
                  </div>
                )}
                <div className="space-y-1 pl-4 border-l-2 border-purple-200">
                  <div className="font-medium text-purple-600">Network</div>
                  <div className="text-xs space-y-1">
                    <div>Total Network Cost: ${analysis.costBreakdown?.network.totalCost.toFixed(2)}</div>
                    <div>Device Share: {analysis.costBreakdown?.network.deviceShare} / {analysis.costBreakdown?.network.totalDevices}</div>
                    <div className="font-medium">Allocated Cost: ${analysis.costs.network.toFixed(2)}</div>
                  </div>
                </div>
                <div className="space-y-1 pl-4 border-l-2 border-green-200">
                  <div className="font-medium text-green-600">Rack</div>
                  <div className="text-xs space-y-1">
                    <div>Total Rack Cost: ${analysis.costBreakdown?.rack.totalCost.toFixed(2)}</div>
                    <div>RU Share: {analysis.costBreakdown?.rack.ruShare} / {analysis.costBreakdown?.rack.totalRU}</div>
                    <div className="font-medium">Allocated Cost: ${analysis.costs.rack.toFixed(2)}</div>
                  </div>
                </div>
                <div className="space-y-1 pl-4 border-l-2 border-yellow-200">
                  <div className="font-medium text-yellow-600">Energy</div>
                  <div className="text-xs space-y-1">
                    <div>Total Energy Cost: ${analysis.costBreakdown?.energy.totalCost.toFixed(2)}</div>
                    <div>Power Share: {analysis.costBreakdown?.energy.powerShare}W / {analysis.costBreakdown?.energy.totalPower}W</div>
                    <div className="font-medium">Allocated Cost: ${analysis.costs.energy.toFixed(2)}</div>
                  </div>
                </div>
                <div className="space-y-1 pl-4 border-l-2 border-red-200">
                  <div className="font-medium text-red-600">Licensing</div>
                  <div className="text-xs space-y-1">
                    <div>Total Licensing Cost: ${analysis.costBreakdown?.licensing.totalCost.toFixed(2)}</div>
                    <div>Device Share: {analysis.costBreakdown?.licensing.deviceShare} / {analysis.costBreakdown?.licensing.totalDevices}</div>
                    <div className="font-medium">Allocated Cost: ${analysis.costs.licensing.toFixed(2)}</div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            {analysis.type === 'compute' && analysis.costs.compute !== undefined && (
              <div className="flex justify-between">
                <span>Compute:</span>
                <span>${analysis.costs.compute.toFixed(2)}</span>
              </div>
            )}
            {analysis.type === 'storage' && analysis.costs.storage !== undefined && (
              <div className="flex justify-between">
                <span>Storage:</span>
                <span>${analysis.costs.storage.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Network:</span>
              <span>${analysis.costs.network.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Rack:</span>
              <span>${analysis.costs.rack.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Energy:</span>
              <span>${analysis.costs.energy.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Licensing:</span>
              <span>${analysis.costs.licensing.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1">
              <span>Total:</span>
              <span>${analysis.costs.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h6 className={`font-medium ${analysis.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Profit/Loss
          </h6>
          <div className="space-y-1">
            <div className={`font-medium text-lg ${analysis.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${analysis.profit.toFixed(2)}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Margin: </span>
              <span className={analysis.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                {analysis.profitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Devices: {analysis.deviceCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
