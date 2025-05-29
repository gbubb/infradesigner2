import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { ComputeClusterForm } from './ComputeClusterForm';
import { v4 as uuidv4 } from 'uuid';

interface ComputeRequirements {
  controllerNodeCount?: number;
  infrastructureClusterRequired?: boolean;
  infrastructureNodeCount?: number;
  computeClusters: any[];
  deviceLifespanYears?: number;
  averageVMVCPUs?: number;
  averageVMMemoryGB?: number;
}

export const ComputeRequirementsForm = ({ requirements, onUpdate }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const numericValue = parseInt(value);
    onUpdate({ ...requirements, [name]: isNaN(numericValue) ? undefined : numericValue });
  };

  const handleAddCluster = () => {
    const newCluster = {
      id: uuidv4(),
      name: `Compute Cluster ${requirements.computeClusters.length + 1}`,
      totalVCPUs: 0,
      totalMemoryTB: 0,
      availabilityZoneRedundancy: 'None',
      overcommitRatio: 1,
      gpuEnabled: false,
    };

    onUpdate({
      ...requirements,
      computeClusters: [...requirements.computeClusters, newCluster],
    });
  };

  const handleRemoveCluster = (id) => {
    onUpdate({
      ...requirements,
      computeClusters: requirements.computeClusters.filter((cluster) => cluster.id !== id),
    });
  };

  const handleClusterUpdate = (id, updatedCluster) => {
    onUpdate({
      ...requirements,
      computeClusters: requirements.computeClusters.map((cluster) =>
        cluster.id === id ? { ...cluster, ...updatedCluster } : cluster
      ),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compute Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="controllerNodeCount">Controller Node Count</Label>
              <Input
                id="controllerNodeCount"
                name="controllerNodeCount"
                type="number"
                min="0"
                placeholder="e.g., 3"
                value={requirements.controllerNodeCount || ''}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="infrastructureNodeCount">Infrastructure Node Count</Label>
              <Input
                id="infrastructureNodeCount"
                name="infrastructureNodeCount"
                type="number"
                min="0"
                placeholder="e.g., 3"
                value={requirements.infrastructureNodeCount || ''}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deviceLifespanYears">Device Lifespan (years)</Label>
              <Input
                id="deviceLifespanYears"
                name="deviceLifespanYears"
                type="number"
                min="2"
                max="6"
                placeholder="3"
                value={requirements.deviceLifespanYears === undefined ? 3 : requirements.deviceLifespanYears}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="averageVMVCPUs">Average VM vCPUs</Label>
              <Input
                id="averageVMVCPUs"
                name="averageVMVCPUs"
                type="number"
                min="1"
                placeholder="e.g., 4"
                value={requirements.averageVMVCPUs || ''}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="averageVMMemoryGB">Average VM Memory (GB)</Label>
              <Input
                id="averageVMMemoryGB"
                name="averageVMMemoryGB"
                type="number"
                min="1"
                placeholder="e.g., 8"
                value={requirements.averageVMMemoryGB || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Compute Clusters</h3>
        <Button onClick={handleAddCluster} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Cluster
        </Button>
      </div>

      {requirements.computeClusters.map((cluster) => (
        <div key={cluster.id} className="relative">
          <ComputeClusterForm
            clusters={[cluster]} 
            onUpdate={(updatedClusters) => handleClusterUpdate(cluster.id, updatedClusters[0])}
            showHeader={false}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-muted-foreground"
            onClick={() => handleRemoveCluster(cluster.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {requirements.computeClusters.length === 0 && (
        <div className="bg-muted/50 rounded-md p-4 text-center text-muted-foreground">
          No compute clusters defined. Click "Add Cluster" to create one.
        </div>
      )}
    </div>
  );
};
