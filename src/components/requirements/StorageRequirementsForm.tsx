
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StoragePoolEfficiencyFactors } from '@/types/infrastructure';

export const StorageRequirementsForm = ({ requirements, onUpdate }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const numericValue = parseInt(value, 10);
    onUpdate({
      ...requirements,
      [name]: isNaN(numericValue) ? undefined : numericValue
    });
  };

  const handleAddCluster = () => {
    const newCluster = {
      id: uuidv4(),
      name: `Storage Cluster ${requirements.storageClusters.length + 1}`,
      totalCapacityTB: 0,
      availabilityZoneQuantity: 3,
      poolType: '3 Replica',
      maxFillFactor: 85,
    };

    onUpdate({
      ...requirements,
      storageClusters: [...requirements.storageClusters, newCluster],
    });
  };

  const handleRemoveCluster = (id) => {
    onUpdate({
      ...requirements,
      storageClusters: requirements.storageClusters.filter((cluster) => cluster.id !== id),
    });
  };

  const handleClusterUpdate = (id, field, value) => {
    onUpdate({
      ...requirements,
      storageClusters: requirements.storageClusters.map((cluster) =>
        cluster.id === id ? { ...cluster, [field]: value } : cluster
      ),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Storage Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Storage Clusters</h3>
        <Button onClick={handleAddCluster} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Cluster
        </Button>
      </div>

      {requirements.storageClusters.map((cluster) => (
        <Card key={cluster.id} className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-muted-foreground"
            onClick={() => handleRemoveCluster(cluster.id)}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Input
                className="font-semibold"
                value={cluster.name}
                onChange={(e) => handleClusterUpdate(cluster.id, 'name', e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Raw Capacity (TB)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={cluster.totalCapacityTB}
                  onChange={(e) => 
                    handleClusterUpdate(
                      cluster.id, 
                      'totalCapacityTB', 
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Availability Zone Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={cluster.availabilityZoneQuantity}
                  onChange={(e) => 
                    handleClusterUpdate(
                      cluster.id, 
                      'availabilityZoneQuantity', 
                      parseInt(e.target.value, 10) || 1
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Pool Type</Label>
                <Select
                  value={cluster.poolType}
                  onValueChange={(value) => handleClusterUpdate(cluster.id, 'poolType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pool type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(StoragePoolEfficiencyFactors).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type} ({Math.round(StoragePoolEfficiencyFactors[type] * 100)}% efficient)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Max Fill Factor (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={cluster.maxFillFactor}
                  onChange={(e) => 
                    handleClusterUpdate(
                      cluster.id, 
                      'maxFillFactor', 
                      parseInt(e.target.value, 10) || 1
                    )
                  }
                />
              </div>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <div className="flex justify-between items-center text-sm">
                <span>Effective Capacity:</span>
                <span className="font-semibold">
                  {Math.round(
                    cluster.totalCapacityTB *
                    StoragePoolEfficiencyFactors[cluster.poolType] *
                    (cluster.maxFillFactor / 100) *
                    0.909495 * 10
                  ) / 10}{' '}
                  TiB
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {requirements.storageClusters.length === 0 && (
        <div className="bg-muted/50 rounded-md p-4 text-center text-muted-foreground">
          No storage clusters defined. Click "Add Cluster" to create one.
        </div>
      )}
    </div>
  );
};
