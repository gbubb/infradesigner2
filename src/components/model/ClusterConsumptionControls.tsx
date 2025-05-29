
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ClusterPricing } from '@/types/infrastructure';

interface ClusterConsumptionControlsProps {
  computePricing: ClusterPricing[];
  storagePricing: ClusterPricing[];
  clusterConsumption: Record<string, number>;
  clusterDeviceCounts: Record<string, number>;
  updateClusterConsumption: (clusterId: string, consumption: number) => void;
}

export const ClusterConsumptionControls: React.FC<ClusterConsumptionControlsProps> = ({
  computePricing,
  storagePricing,
  clusterConsumption,
  clusterDeviceCounts,
  updateClusterConsumption
}) => {
  return (
    <>
      {/* Compute Cluster Consumption Controls */}
      {computePricing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Compute Cluster Consumption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {computePricing.map((cluster) => (
              <div key={cluster.clusterId} className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">{cluster.clusterName}</span>
                  <Badge variant="outline">{clusterConsumption[cluster.clusterId] || 50}%</Badge>
                </div>
                <Slider
                  value={[clusterConsumption[cluster.clusterId] || 50]}
                  onValueChange={(value) => updateClusterConsumption(cluster.clusterId, value[0])}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <div className="text-sm text-muted-foreground">
                  Devices: {clusterDeviceCounts[cluster.clusterId] || 0} | 
                  Price: €{cluster.pricePerMonth}/month per unit
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Storage Cluster Consumption Controls */}
      {storagePricing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Cluster Consumption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {storagePricing.map((cluster) => (
              <div key={cluster.clusterId} className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">{cluster.clusterName}</span>
                  <Badge variant="outline">{clusterConsumption[cluster.clusterId] || 50}%</Badge>
                </div>
                <Slider
                  value={[clusterConsumption[cluster.clusterId] || 50]}
                  onValueChange={(value) => updateClusterConsumption(cluster.clusterId, value[0])}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <div className="text-sm text-muted-foreground">
                  Devices: {clusterDeviceCounts[cluster.clusterId] || 0} | 
                  Price: €{cluster.pricePerMonth}/month per GiB
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
};
