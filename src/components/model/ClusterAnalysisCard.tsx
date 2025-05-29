import React from 'react';
import { Badge } from '@/components/ui/badge';

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
