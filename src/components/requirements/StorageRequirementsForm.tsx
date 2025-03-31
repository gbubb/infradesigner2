
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { StorageClusterRequirement } from '@/types/infrastructure';
import { useDesignStore } from '@/store/designStore';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

interface StorageRequirementsProps {
  requirements: {
    storageClusters: StorageClusterRequirement[];
  };
  onUpdate: (storageRequirements: any) => void;
}

export const StorageRequirementsForm: React.FC<StorageRequirementsProps> = ({
  requirements,
  onUpdate,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentClusterId, setCurrentClusterId] = useState<string | null>(null);
  const [clusterForm, setClusterForm] = useState<Partial<StorageClusterRequirement>>({
    name: '',
    totalCapacityTB: 100,
    availabilityZoneQuantity: 3,
    poolType: '3 Replica',
    maxFillFactor: 80
  });

  const handleAddCluster = () => {
    setCurrentClusterId(null);
    setClusterForm({
      name: `Storage Cluster ${requirements.storageClusters.length + 1}`,
      totalCapacityTB: 100,
      availabilityZoneQuantity: 3,
      poolType: '3 Replica',
      maxFillFactor: 80
    });
    setIsDialogOpen(true);
  };

  const handleEditCluster = (cluster: StorageClusterRequirement) => {
    setCurrentClusterId(cluster.id);
    setClusterForm({ ...cluster });
    setIsDialogOpen(true);
  };

  const handleRemoveCluster = (clusterId: string) => {
    const updatedClusters = requirements.storageClusters.filter(c => c.id !== clusterId);
    onUpdate({ storageClusters: updatedClusters });
    toast.success('Storage cluster removed');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = parseFloat(value);
    setClusterForm({
      ...clusterForm,
      [name]: isNaN(numericValue) ? value : numericValue
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setClusterForm({
      ...clusterForm,
      [name]: value
    });
  };

  const handleSaveCluster = () => {
    if (!clusterForm.name) {
      toast.error('Please provide a name for the storage cluster');
      return;
    }

    if (!clusterForm.totalCapacityTB || clusterForm.totalCapacityTB <= 0) {
      toast.error('Please specify a valid capacity');
      return;
    }

    if (!clusterForm.availabilityZoneQuantity || clusterForm.availabilityZoneQuantity <= 0) {
      toast.error('Please specify a valid number of availability zones');
      return;
    }

    let updatedClusters: StorageClusterRequirement[];
    
    if (currentClusterId) {
      // Edit existing cluster
      updatedClusters = requirements.storageClusters.map(cluster => 
        cluster.id === currentClusterId 
          ? { ...clusterForm, id: currentClusterId } as StorageClusterRequirement
          : cluster
      );
      toast.success('Storage cluster updated');
    } else {
      // Add new cluster
      const newCluster: StorageClusterRequirement = {
        ...clusterForm,
        id: uuidv4()
      } as StorageClusterRequirement;
      
      updatedClusters = [...requirements.storageClusters, newCluster];
      toast.success('Storage cluster added');
    }
    
    onUpdate({ storageClusters: updatedClusters });
    setIsDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Storage Requirements</CardTitle>
        <Button onClick={handleAddCluster}>
          <Plus className="h-4 w-4 mr-2" />
          Add Storage Cluster
        </Button>
      </CardHeader>
      <CardContent>
        {requirements.storageClusters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No storage clusters defined yet.</p>
            <p className="text-sm mt-2">Add a storage cluster to define your storage requirements.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requirements.storageClusters.map((cluster) => (
              <div 
                key={cluster.id} 
                className="border rounded-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {cluster.name} 
                    <Badge variant="outline">{cluster.poolType}</Badge>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Capacity:</span> {cluster.totalCapacityTB} TB
                    </div>
                    <div>
                      <span className="text-muted-foreground">Availability Zones:</span> {cluster.availabilityZoneQuantity}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fill Factor:</span> {cluster.maxFillFactor}%
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 self-end sm:self-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditCluster(cluster)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRemoveCluster(cluster.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{currentClusterId ? 'Edit Storage Cluster' : 'Add Storage Cluster'}</DialogTitle>
              <DialogDescription>
                Define the requirements for this storage cluster
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Cluster Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Primary Storage"
                  value={clusterForm.name || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalCapacityTB">Total Usable Capacity (TB)</Label>
                  <Input
                    id="totalCapacityTB"
                    name="totalCapacityTB"
                    type="number"
                    placeholder="e.g., 1000"
                    value={clusterForm.totalCapacityTB || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availabilityZoneQuantity">Availability Zone Quantity</Label>
                  <Input
                    id="availabilityZoneQuantity"
                    name="availabilityZoneQuantity"
                    type="number"
                    min="1"
                    placeholder="e.g., 3"
                    value={clusterForm.availabilityZoneQuantity || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxFillFactor">Maximum Fill Factor (%)</Label>
                  <Input
                    id="maxFillFactor"
                    name="maxFillFactor"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g., 80"
                    value={clusterForm.maxFillFactor || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poolType">Storage Pool Type</Label>
                  <Select
                    value={clusterForm.poolType || '3 Replica'}
                    onValueChange={(value) => handleSelectChange('poolType', value)}
                  >
                    <SelectTrigger id="poolType">
                      <SelectValue placeholder="Select storage pool type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3 Replica">3 Replica</SelectItem>
                      <SelectItem value="2 Replica">2 Replica</SelectItem>
                      <SelectItem value="Erasure Coding 4+2">Erasure Coding 4+2</SelectItem>
                      <SelectItem value="Erasure Coding 8+3">Erasure Coding 8+3</SelectItem>
                      <SelectItem value="Erasure Coding 8+4">Erasure Coding 8+4</SelectItem>
                      <SelectItem value="Erasure Coding 10+4">Erasure Coding 10+4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCluster}>
                {currentClusterId ? 'Update Cluster' : 'Add Cluster'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
