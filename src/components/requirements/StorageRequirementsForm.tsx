
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { StorageClusterRequirement } from '@/types/infrastructure';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';

interface StorageRequirementsProps {
  requirements: {
    storageClusters: StorageClusterRequirement[];
    deviceLifespanYears?: number;
  };
  onUpdate: (storageRequirements: any) => void;
}

export const StorageRequirementsForm: React.FC<StorageRequirementsProps> = ({
  requirements,
  onUpdate,
}) => {
  // Pool type options for storage clusters
  const poolTypeOptions = [
    '3 Replica',
    '2 Replica',
    'Erasure Coding 4+2',
    'Erasure Coding 8+3',
    'Erasure Coding 8+4',
    'Erasure Coding 10+4'
  ];

  // Handler for device lifespan changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = parseInt(value, 10);
      
    onUpdate({ [name]: isNaN(numericValue) ? undefined : numericValue });
  };

  // Add a new storage cluster
  const handleAddCluster = () => {
    const newClusters = [...(requirements.storageClusters || []), {
      id: uuidv4(),
      name: `Storage Cluster ${(requirements.storageClusters?.length || 0) + 1}`,
      totalCapacityTB: 100,
      availabilityZoneQuantity: 3,
      poolType: '3 Replica',
      maxFillFactor: 80
    }];
    
    onUpdate({ storageClusters: newClusters });
  };

  // Remove a storage cluster
  const handleRemoveCluster = (clusterId: string) => {
    const updatedClusters = requirements.storageClusters.filter(cluster => cluster.id !== clusterId);
    onUpdate({ storageClusters: updatedClusters });
  };

  // Update a storage cluster property
  const handleClusterChange = (clusterId: string, field: string, value: any) => {
    const updatedClusters = requirements.storageClusters.map(cluster => {
      if (cluster.id === clusterId) {
        return { ...cluster, [field]: value };
      }
      return cluster;
    });
    
    onUpdate({ storageClusters: updatedClusters });
  };

  // Handler for numeric inputs to ensure proper parsing
  const handleNumericChange = (clusterId: string, field: string, value: string) => {
    const numericValue = parseInt(value, 10);
    handleClusterChange(clusterId, field, isNaN(numericValue) ? 0 : numericValue);
  };

  return (
    <div className="space-y-6">
      {/* Device Lifespan Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Storage Device Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deviceLifespanYears">Device Lifespan (Years)</Label>
              <Input
                id="deviceLifespanYears"
                name="deviceLifespanYears"
                type="number"
                min="2"
                max="6"
                placeholder="3"
                value={requirements.deviceLifespanYears || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Clusters */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Storage Clusters</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddCluster} 
            className="flex items-center gap-2"
          >
            <PlusCircle size={16} />
            <span>Add Cluster</span>
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-8">
              {requirements.storageClusters && requirements.storageClusters.length > 0 ? (
                requirements.storageClusters.map((cluster, index) => (
                  <div key={cluster.id} className="p-4 border rounded-md relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={() => handleRemoveCluster(cluster.id)}
                    >
                      <Trash2 size={16} />
                    </Button>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor={`cluster-name-${cluster.id}`}>Cluster Name</Label>
                        <Input
                          id={`cluster-name-${cluster.id}`}
                          value={cluster.name}
                          onChange={(e) => handleClusterChange(cluster.id, 'name', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`capacity-${cluster.id}`}>Total Capacity (TB)</Label>
                        <Input
                          id={`capacity-${cluster.id}`}
                          type="number"
                          min="1"
                          value={cluster.totalCapacityTB}
                          onChange={(e) => handleNumericChange(cluster.id, 'totalCapacityTB', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`az-quantity-${cluster.id}`}>Availability Zones</Label>
                        <Input
                          id={`az-quantity-${cluster.id}`}
                          type="number"
                          min="1"
                          max="10"
                          value={cluster.availabilityZoneQuantity}
                          onChange={(e) => handleNumericChange(cluster.id, 'availabilityZoneQuantity', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`max-fill-${cluster.id}`}>Maximum Fill Factor (%)</Label>
                        <Input
                          id={`max-fill-${cluster.id}`}
                          type="number"
                          min="50"
                          max="95"
                          value={cluster.maxFillFactor}
                          onChange={(e) => handleNumericChange(cluster.id, 'maxFillFactor', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`pool-type-${cluster.id}`}>Storage Pool Type</Label>
                        <Select
                          value={cluster.poolType}
                          onValueChange={(value) => handleClusterChange(cluster.id, 'poolType', value)}
                        >
                          <SelectTrigger id={`pool-type-${cluster.id}`}>
                            <SelectValue placeholder="Select pool type" />
                          </SelectTrigger>
                          <SelectContent>
                            {poolTypeOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground mt-2">
                      This cluster will provide {cluster.totalCapacityTB} TB of raw storage capacity 
                      distributed across {cluster.availabilityZoneQuantity} availability zones with 
                      {cluster.poolType} data protection.
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">No storage clusters defined</p>
                  <Button 
                    variant="outline" 
                    onClick={handleAddCluster} 
                    className="flex items-center gap-2"
                  >
                    <PlusCircle size={16} />
                    <span>Add your first cluster</span>
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
