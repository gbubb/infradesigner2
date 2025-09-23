
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { StoragePoolEfficiencyFactors, StoragePool } from '@/types/infrastructure';
import { useStore } from '@/store';
import { Separator } from '@/components/ui/separator';

export const StorageRequirementsForm = ({ requirements, onUpdate }) => {
  const computeClusters = useStore((state) => state.requirements.computeRequirements.computeClusters);
  const storagePools = requirements.storagePools || [];
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const numericValue = parseInt(value, 10);
    onUpdate({
      ...requirements,
      [name]: isNaN(numericValue) ? undefined : numericValue
    });
  };

  const handleAddPool = () => {
    const newPool: StoragePool = {
      id: uuidv4(),
      name: `Storage Pool ${storagePools.length + 1}`,
      type: 'dedicated',
      availabilityZoneQuantity: 3,
    };

    onUpdate({
      ...requirements,
      storagePools: [...storagePools, newPool],
    });
  };

  const handleRemovePool = (id: string) => {
    // Remove pool and update any clusters using this pool
    const updatedClusters = requirements.storageClusters.map(cluster => {
      if (cluster.storagePoolId === id) {
        return { ...cluster, storagePoolId: undefined };
      }
      return cluster;
    });

    onUpdate({
      ...requirements,
      storagePools: storagePools.filter((pool) => pool.id !== id),
      storageClusters: updatedClusters,
    });
  };

  const handlePoolUpdate = (id: string, field: string, value: string | number | undefined) => {
    onUpdate({
      ...requirements,
      storagePools: storagePools.map((pool) =>
        pool.id === id ? { ...pool, [field]: value } : pool
      ),
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

  const handleClusterBatchUpdate = (id, updates) => {
    onUpdate({
      ...requirements,
      storageClusters: requirements.storageClusters.map((cluster) =>
        cluster.id === id ? { ...cluster, ...updates } : cluster
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

      {/* Storage Pools Section */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Storage Pools</h3>
        <Button onClick={handleAddPool} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Pool
        </Button>
      </div>

      {storagePools.map((pool) => (
        <Card key={pool.id} className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-muted-foreground"
            onClick={() => handleRemovePool(pool.id)}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Input
                className="font-semibold"
                value={pool.name}
                onChange={(e) => handlePoolUpdate(pool.id, 'name', e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pool Type</Label>
                <Select
                  value={pool.type}
                  onValueChange={(value) => handlePoolUpdate(pool.id, 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pool type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dedicated">Dedicated Storage Nodes</SelectItem>
                    <SelectItem value="hyperConverged">Hyper-Converged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Availability Zones</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={pool.availabilityZoneQuantity}
                  onChange={(e) =>
                    handlePoolUpdate(pool.id, 'availabilityZoneQuantity', parseInt(e.target.value, 10) || 3)
                  }
                />
              </div>
            </div>

            {pool.type === 'hyperConverged' && (
              <div className="space-y-2">
                <Label>Compute Cluster</Label>
                <Select
                  value={pool.computeClusterId || ''}
                  onValueChange={(value) => handlePoolUpdate(pool.id, 'computeClusterId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select compute cluster" />
                  </SelectTrigger>
                  <SelectContent>
                    {computeClusters.map((cluster) => (
                      <SelectItem key={cluster.id} value={cluster.id}>
                        {cluster.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {computeClusters.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No compute clusters available. Please define compute clusters first.
                  </p>
                )}
              </div>
            )}

            {/* Display storage clusters using this pool */}
            {requirements.storageClusters.filter(sc => sc.storagePoolId === pool.id).length > 0 && (
              <div className="text-sm text-muted-foreground border-t pt-2">
                <p className="font-medium">Storage clusters using this pool:</p>
                <ul className="list-disc list-inside mt-1">
                  {requirements.storageClusters
                    .filter(sc => sc.storagePoolId === pool.id)
                    .map(sc => (
                      <li key={sc.id}>{sc.name} ({sc.poolType})</li>
                    ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {storagePools.length === 0 && (
        <div className="bg-muted/50 rounded-md p-4 text-center text-muted-foreground text-sm">
          Optional: Define storage pools to share physical storage infrastructure across multiple logical storage clusters.
        </div>
      )}

      <Separator className="my-6" />

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
                <Label>Usable Pool Capacity (TiB)</Label>
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

            <div className="mt-4 space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Storage Type</Label>
                <Select
                  value={
                    (cluster.storagePoolId !== undefined && cluster.storagePoolId !== null) ? 'pool' :
                    cluster.hyperConverged ? 'hyperConverged' :
                    'dedicated'
                  }
                  onValueChange={(value) => {
                    if (value === 'dedicated') {
                      handleClusterBatchUpdate(cluster.id, {
                        hyperConverged: false,
                        computeClusterId: undefined,
                        storagePoolId: undefined
                      });
                    } else if (value === 'hyperConverged') {
                      handleClusterBatchUpdate(cluster.id, {
                        hyperConverged: true,
                        storagePoolId: undefined,
                        computeClusterId: undefined // Clear this initially, user will select it
                      });
                    } else if (value === 'pool') {
                      handleClusterBatchUpdate(cluster.id, {
                        hyperConverged: false,
                        computeClusterId: undefined,
                        storagePoolId: '' // Set empty string to show pool selector
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select storage type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dedicated">Dedicated Storage Nodes</SelectItem>
                    <SelectItem value="pool">Use Storage Pool</SelectItem>
                    <SelectItem value="hyperConverged">Hyper-Converged (Direct)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(cluster.storagePoolId !== undefined && cluster.storagePoolId !== null) && (
                <div className="space-y-2">
                  <Label>Storage Pool</Label>
                  <Select
                    value={cluster.storagePoolId || ''}
                    onValueChange={(value) => {
                      if (value) {
                        // A pool was selected
                        const selectedPool = storagePools.find(p => p.id === value);
                        if (selectedPool?.type === 'hyperConverged') {
                          // For hyper-converged pools, set the pool and computeClusterId
                          handleClusterBatchUpdate(cluster.id, {
                            storagePoolId: value,
                            computeClusterId: selectedPool.computeClusterId
                          });
                        } else {
                          // For dedicated pools, just set the pool
                          handleClusterBatchUpdate(cluster.id, {
                            storagePoolId: value,
                            computeClusterId: undefined
                          });
                        }
                      } else {
                        // Clear selection (shouldn't happen, but handle it)
                        handleClusterBatchUpdate(cluster.id, {
                          storagePoolId: undefined,
                          computeClusterId: undefined
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select storage pool" />
                    </SelectTrigger>
                    <SelectContent>
                      {storagePools.map((pool) => (
                        <SelectItem key={pool.id} value={pool.id}>
                          {pool.name} ({pool.type === 'hyperConverged' ? 'Hyper-Converged' : 'Dedicated'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {storagePools.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No storage pools available. Please define storage pools above.
                    </p>
                  )}
                </div>
              )}

              {cluster.hyperConverged && !cluster.storagePoolId && (
                <div className="space-y-2">
                  <Label>Compute Cluster</Label>
                  <Select
                    value={cluster.computeClusterId || ''}
                    onValueChange={(value) =>
                      handleClusterUpdate(cluster.id, 'computeClusterId', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select compute cluster" />
                    </SelectTrigger>
                    <SelectContent>
                      {computeClusters.map((computeCluster) => (
                        <SelectItem key={computeCluster.id} value={computeCluster.id}>
                          {computeCluster.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {computeClusters.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No compute clusters available. Please define compute clusters first.
                    </p>
                  )}
                </div>
              )}
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
