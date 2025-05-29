
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PricingRequirements, ClusterPricing } from '@/types/infrastructure/pricing-types';
import { ComputeClusterRequirement, StorageClusterRequirement } from '@/types/infrastructure';

interface PricingRequirementsFormProps {
  requirements: PricingRequirements;
  computeClusters: ComputeClusterRequirement[];
  storageClusters: StorageClusterRequirement[];
  onUpdate: (requirements: PricingRequirements) => void;
}

export const PricingRequirementsForm: React.FC<PricingRequirementsFormProps> = ({
  requirements,
  computeClusters,
  storageClusters,
  onUpdate
}) => {
  // Sync compute clusters with pricing
  React.useEffect(() => {
    const currentComputeIds = requirements.computePricing.map(p => p.clusterId);
    const newComputeClusters = computeClusters.filter(cluster => !currentComputeIds.includes(cluster.id));
    const removedComputeClusters = requirements.computePricing.filter(p => !computeClusters.find(c => c.id === p.clusterId));
    
    if (newComputeClusters.length > 0 || removedComputeClusters.length > 0) {
      const updatedComputePricing = [
        ...requirements.computePricing.filter(p => computeClusters.find(c => c.id === p.clusterId)),
        ...newComputeClusters.map(cluster => ({
          clusterId: cluster.id,
          clusterName: cluster.name,
          clusterType: 'compute' as const,
          pricePerMonth: 0,
          pricePerHour: 0
        }))
      ];
      
      onUpdate({
        ...requirements,
        computePricing: updatedComputePricing
      });
    }
  }, [computeClusters, requirements, onUpdate]);

  // Sync storage clusters with pricing
  React.useEffect(() => {
    const currentStorageIds = requirements.storagePricing.map(p => p.clusterId);
    const newStorageClusters = storageClusters.filter(cluster => !currentStorageIds.includes(cluster.id));
    const removedStorageClusters = requirements.storagePricing.filter(p => !storageClusters.find(c => c.id === p.clusterId));
    
    if (newStorageClusters.length > 0 || removedStorageClusters.length > 0) {
      const updatedStoragePricing = [
        ...requirements.storagePricing.filter(p => storageClusters.find(c => c.id === p.clusterId)),
        ...newStorageClusters.map(cluster => ({
          clusterId: cluster.id,
          clusterName: cluster.name,
          clusterType: 'storage' as const,
          pricePerMonth: 0,
          pricePerHour: 0
        }))
      ];
      
      onUpdate({
        ...requirements,
        storagePricing: updatedStoragePricing
      });
    }
  }, [storageClusters, requirements, onUpdate]);

  const handleComputePriceChange = (clusterId: string, pricePerMonth: number) => {
    const pricePerHour = pricePerMonth / (30 * 24); // Convert monthly to hourly
    const updatedComputePricing = requirements.computePricing.map(pricing =>
      pricing.clusterId === clusterId
        ? { ...pricing, pricePerMonth, pricePerHour }
        : pricing
    );
    
    onUpdate({
      ...requirements,
      computePricing: updatedComputePricing
    });
  };

  const handleStoragePriceChange = (clusterId: string, pricePerMonth: number) => {
    const pricePerHour = pricePerMonth / (30 * 24); // Convert monthly to hourly
    const updatedStoragePricing = requirements.storagePricing.map(pricing =>
      pricing.clusterId === clusterId
        ? { ...pricing, pricePerMonth, pricePerHour }
        : pricing
    );
    
    onUpdate({
      ...requirements,
      storagePricing: updatedStoragePricing
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compute Cluster Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          {requirements.computePricing.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cluster Name</TableHead>
                  <TableHead>Price per VM/Month ($)</TableHead>
                  <TableHead>Price per VM/Hour ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.computePricing.map((pricing) => (
                  <TableRow key={pricing.clusterId}>
                    <TableCell className="font-medium">{pricing.clusterName}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricing.pricePerMonth}
                        onChange={(e) => handleComputePriceChange(pricing.clusterId, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={pricing.pricePerHour.toFixed(4)}
                        readOnly
                        className="bg-gray-100"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No compute clusters defined. Please add compute clusters in the Compute requirements tab.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storage Cluster Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          {requirements.storagePricing.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cluster Name</TableHead>
                  <TableHead>Price per GiB/Month ($)</TableHead>
                  <TableHead>Price per GiB/Hour ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.storagePricing.map((pricing) => (
                  <TableRow key={pricing.clusterId}>
                    <TableCell className="font-medium">{pricing.clusterName}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={pricing.pricePerMonth}
                        onChange={(e) => handleStoragePriceChange(pricing.clusterId, parseFloat(e.target.value) || 0)}
                        placeholder="0.000"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={pricing.pricePerHour.toFixed(6)}
                        readOnly
                        className="bg-gray-100"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No storage clusters defined. Please add storage clusters in the Storage requirements tab.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
