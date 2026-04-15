
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import { ComputeClusterRequirement, StorageCluster } from '@/types/infrastructure';
import { v4 as uuidv4 } from 'uuid';

interface ComputeClusterFormProps {
  clusters: ComputeClusterRequirement[];
  onUpdate: (clusters: ComputeClusterRequirement[]) => void;
  showHeader?: boolean;
  storageClusters?: StorageCluster[];
  totalAvailabilityZones?: number;
}

export const ComputeClusterForm: React.FC<ComputeClusterFormProps> = ({
  clusters,
  onUpdate,
  showHeader = true,
  storageClusters = [],
  totalAvailabilityZones = 3,
}) => {
  // Check if a compute cluster is being used for hyper-converged storage
  const isHyperConverged = (clusterId: string) => {
    return storageClusters.some(sc => sc.type === 'hyperConverged' && sc.computeClusterId === clusterId);
  };
  const addCluster = () => {
    const newCluster: ComputeClusterRequirement = {
      id: uuidv4(),
      name: `Compute Cluster ${clusters.length + 1}`,
      totalVCPUs: 5000,
      totalMemoryTB: 30,
      availabilityZoneRedundancy: 'N+1',
      overcommitRatio: 2,
      gpuEnabled: false
    };
    
    onUpdate([...clusters, newCluster]);
  };

  const updateCluster = (index: number, field: string, value: string | number | boolean | undefined) => {
    const updatedClusters = [...clusters];
    updatedClusters[index] = {
      ...updatedClusters[index],
      [field]: value
    };
    
    onUpdate(updatedClusters);
  };

  const removeCluster = (index: number) => {
    const updatedClusters = [...clusters];
    updatedClusters.splice(index, 1);
    onUpdate(updatedClusters);
  };

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Compute Clusters</h3>
          <Button variant="outline" size="sm" onClick={addCluster}>
            <Plus className="h-4 w-4 mr-2" />
            Add Cluster
          </Button>
        </div>
      )}
      
      {clusters.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <p>No compute clusters defined</p>
              <p className="text-sm mt-2">
                Add a compute cluster to define vCPU and memory requirements
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        clusters.map((cluster, index) => (
          <Card key={cluster.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <Input
                  value={cluster.name}
                  onChange={(e) => updateCluster(index, 'name', e.target.value)}
                  className="font-medium text-lg h-8 w-72"
                />
                {showHeader && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeCluster(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`totalVCPUs-${index}`}>Total vCPUs</Label>
                  <Input
                    id={`totalVCPUs-${index}`}
                    type="number"
                    placeholder="e.g., 5000"
                    value={cluster.totalVCPUs || ''}
                    onChange={(e) => updateCluster(index, 'totalVCPUs', parseInt(e.target.value, 10) || undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`totalMemoryTB-${index}`}>Total Memory (TB)</Label>
                  <Input
                    id={`totalMemoryTB-${index}`}
                    type="number"
                    placeholder="e.g., 30"
                    value={cluster.totalMemoryTB || ''}
                    onChange={(e) => updateCluster(index, 'totalMemoryTB', parseFloat(e.target.value) || undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`redundancy-${index}`}>Availability Zone Redundancy</Label>
                  <Select
                    value={cluster.availabilityZoneRedundancy || 'None'}
                    onValueChange={(value) => updateCluster(index, 'availabilityZoneRedundancy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select redundancy level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None (No additional capacity)</SelectItem>
                      <SelectItem value="N+1">N+1 (One additional AZ worth of capacity)</SelectItem>
                      <SelectItem value="N+2">N+2 (Two additional AZs worth of capacity)</SelectItem>
                      <SelectItem value="1 Node">1 Node (Survive single node failure)</SelectItem>
                      <SelectItem value="2 Nodes">2 Nodes (Survive dual node failure)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`overcommitRatio-${index}`}>
                    CPU Overcommit Ratio (vCPU:Core)
                  </Label>
                  <Input
                    id={`overcommitRatio-${index}`}
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    placeholder="e.g., 2.0"
                    value={cluster.overcommitRatio || ''}
                    onChange={(e) => updateCluster(index, 'overcommitRatio', parseFloat(e.target.value) || undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`availabilityZoneCount-${index}`}>
                    Availability Zones
                    <span className="ml-1 text-xs text-muted-foreground">
                      (max: {totalAvailabilityZones})
                    </span>
                  </Label>
                  <Input
                    id={`availabilityZoneCount-${index}`}
                    type="number"
                    min="1"
                    max={totalAvailabilityZones}
                    placeholder={`Default: ${totalAvailabilityZones}`}
                    value={cluster.availabilityZoneCount || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      updateCluster(index, 'availabilityZoneCount',
                        value && value > 0 && value <= totalAvailabilityZones ? value : undefined);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of availability zones this cluster spans
                  </p>
                </div>
                
                <div className="flex items-center justify-between space-y-0 pt-4 col-span-2">
                  <Label htmlFor={`gpuEnabled-${index}`}>GPU Enabled Cluster</Label>
                  <Switch
                    id={`gpuEnabled-${index}`}
                    checked={cluster.gpuEnabled || false}
                    onCheckedChange={(checked) => updateCluster(index, 'gpuEnabled', checked)}
                  />
                </div>
              </div>
              
              {isHyperConverged(cluster.id) && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-medium">Hyper-Converged Storage</h4>
                    <p className="text-sm text-muted-foreground">
                      This cluster is selected for hyper-converged storage. Configure disks in the Design tab.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
