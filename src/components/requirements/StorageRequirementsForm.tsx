
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, Server, Zap, Link2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StoragePoolEfficiencyFactors, StorageCluster, StoragePool } from '@/types/infrastructure';
import { useStore } from '@/store';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export const StorageRequirementsForm = ({ requirements, onUpdate }) => {
  const computeClusters = useStore((state) => state.requirements.computeRequirements.computeClusters);
  const storageClusters = requirements.storageClusters || [];
  const storagePools = requirements.storagePools || [];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const numericValue = parseInt(value, 10);
    onUpdate({
      ...requirements,
      [name]: isNaN(numericValue) ? undefined : numericValue
    });
  };

  // ==================== STORAGE CLUSTERS (Physical Infrastructure) ====================

  const handleAddCluster = () => {
    const newCluster: StorageCluster = {
      id: uuidv4(),
      name: `Storage Cluster ${storageClusters.length + 1}`,
      type: 'dedicated',
      availabilityZoneQuantity: 3,
    };

    onUpdate({
      ...requirements,
      storageClusters: [...storageClusters, newCluster],
    });
  };

  const handleRemoveCluster = (id: string) => {
    // Remove cluster and update any pools targeting this cluster
    const updatedPools = storagePools.map(pool => {
      if (pool.storageClusterId === id) {
        return { ...pool, storageClusterId: undefined };
      }
      return pool;
    });

    onUpdate({
      ...requirements,
      storageClusters: storageClusters.filter((cluster) => cluster.id !== id),
      storagePools: updatedPools,
    });
  };

  const handleClusterUpdate = (id: string, field: string, value: string | number | undefined) => {
    onUpdate({
      ...requirements,
      storageClusters: storageClusters.map((cluster) =>
        cluster.id === id ? { ...cluster, [field]: value } : cluster
      ),
    });
  };

  const handleClusterBatchUpdate = (id: string, updates: Partial<StorageCluster>) => {
    onUpdate({
      ...requirements,
      storageClusters: storageClusters.map((cluster) =>
        cluster.id === id ? { ...cluster, ...updates } : cluster
      ),
    });
  };

  // ==================== STORAGE POOLS (Logical Capacity Tiers) ====================

  const handleAddPool = () => {
    const newPool: StoragePool = {
      id: uuidv4(),
      name: `Storage Pool ${storagePools.length + 1}`,
      totalCapacityTB: 100,
      poolType: '3 Replica',
      maxFillFactor: 85,
    };

    onUpdate({
      ...requirements,
      storagePools: [...storagePools, newPool],
    });
  };

  const handleRemovePool = (id: string) => {
    onUpdate({
      ...requirements,
      storagePools: storagePools.filter((pool) => pool.id !== id),
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

  // Helper to get pools for a cluster
  const getPoolsForCluster = (clusterId: string) => {
    return storagePools.filter(pool => pool.storageClusterId === clusterId);
  };

  // Helper to get cluster by ID
  const getClusterById = (clusterId: string) => {
    return storageClusters.find(c => c.id === clusterId);
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

      {/* ==================== STORAGE CLUSTERS SECTION ==================== */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Storage Clusters</h3>
          <p className="text-sm text-muted-foreground">Physical storage infrastructure (servers and nodes)</p>
        </div>
        <Button onClick={handleAddCluster} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Cluster
        </Button>
      </div>

      {storageClusters.map((cluster) => {
        const poolsUsingCluster = getPoolsForCluster(cluster.id);
        const isHyperConverged = cluster.type === 'hyperConverged';

        return (
          <Card key={cluster.id} className="relative border-2">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-muted-foreground"
              onClick={() => handleRemoveCluster(cluster.id)}
            >
              <X className="h-4 w-4" />
            </Button>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                {isHyperConverged ? (
                  <Zap className="h-6 w-6 text-amber-500" />
                ) : (
                  <Server className="h-6 w-6 text-blue-500" />
                )}
                <div className="flex-1">
                  <Input
                    className="font-semibold text-lg h-9"
                    value={cluster.name}
                    onChange={(e) => handleClusterUpdate(cluster.id, 'name', e.target.value)}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={isHyperConverged ? "default" : "secondary"}>
                      {isHyperConverged ? 'Hyper-Converged' : 'Dedicated Storage'}
                    </Badge>
                    {poolsUsingCluster.length > 0 && (
                      <Badge variant="outline">
                        {poolsUsingCluster.length} {poolsUsingCluster.length === 1 ? 'pool' : 'pools'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cluster Type</Label>
                  <Select
                    value={cluster.type}
                    onValueChange={(value: 'dedicated' | 'hyperConverged') => {
                      if (value === 'hyperConverged') {
                        handleClusterBatchUpdate(cluster.id, {
                          type: 'hyperConverged',
                          computeClusterId: undefined // User will select
                        });
                      } else {
                        handleClusterBatchUpdate(cluster.id, {
                          type: 'dedicated',
                          computeClusterId: undefined,
                          cpuCoresPerDisk: undefined,
                          memoryGBPerDisk: undefined
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cluster type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dedicated">Dedicated Storage Nodes</SelectItem>
                      <SelectItem value="hyperConverged">Hyper-Converged (HCI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Node Count (AZ Quantity)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={cluster.availabilityZoneQuantity}
                    onChange={(e) =>
                      handleClusterUpdate(cluster.id, 'availabilityZoneQuantity', parseInt(e.target.value, 10) || 3)
                    }
                  />
                </div>
              </div>

              {isHyperConverged && (
                <div className="border-t pt-4 space-y-4 bg-amber-50/50 dark:bg-amber-950/20 -mx-6 px-6 py-4">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Link2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Hyper-Converged Configuration</span>
                  </div>

                  <div className="space-y-2">
                    <Label>Linked Compute Cluster</Label>
                    <Select
                      value={cluster.computeClusterId || ''}
                      onValueChange={(value) => handleClusterUpdate(cluster.id, 'computeClusterId', value)}
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CPU Cores per Disk</Label>
                      <Input
                        type="number"
                        min="1"
                        max="16"
                        placeholder="4"
                        value={cluster.cpuCoresPerDisk === undefined ? 4 : cluster.cpuCoresPerDisk}
                        onChange={(e) =>
                          handleClusterUpdate(cluster.id, 'cpuCoresPerDisk', parseInt(e.target.value, 10) || 4)
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        CPU cores reserved per disk for storage operations
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Memory (GB) per Disk</Label>
                      <Input
                        type="number"
                        min="1"
                        max="32"
                        placeholder="2"
                        value={cluster.memoryGBPerDisk === undefined ? 2 : cluster.memoryGBPerDisk}
                        onChange={(e) =>
                          handleClusterUpdate(cluster.id, 'memoryGBPerDisk', parseInt(e.target.value, 10) || 2)
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Memory reserved per disk for storage operations
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Display pools using this cluster */}
              {poolsUsingCluster.length > 0 && (
                <div className="text-sm border-t pt-3">
                  <p className="font-medium mb-2">Storage pools using this cluster:</p>
                  <div className="space-y-1">
                    {poolsUsingCluster.map(pool => (
                      <div key={pool.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                        <div>
                          <span className="font-medium">{pool.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ({pool.poolType}, {pool.totalCapacityTB} TiB)
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {Math.round((StoragePoolEfficiencyFactors[pool.poolType] || 0.33) * 100)}% efficient
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {storageClusters.length === 0 && (
        <div className="bg-muted/50 rounded-md p-8 text-center text-muted-foreground border-2 border-dashed">
          <Server className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No storage clusters defined</p>
          <p className="text-sm mt-1">Create physical storage infrastructure first</p>
        </div>
      )}

      <Separator className="my-8" />

      {/* ==================== STORAGE POOLS SECTION ==================== */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Storage Pools</h3>
          <p className="text-sm text-muted-foreground">Logical capacity tiers with data protection schemes</p>
        </div>
        <Button onClick={handleAddPool} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Pool
        </Button>
      </div>

      {storagePools.map((pool) => {
        const targetCluster = pool.storageClusterId ? getClusterById(pool.storageClusterId) : null;
        const efficiencyFactor = StoragePoolEfficiencyFactors[pool.poolType] || 0.33;
        const usableCapacity = pool.totalCapacityTB * efficiencyFactor;

        return (
          <Card key={pool.id} className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-muted-foreground"
              onClick={() => handleRemovePool(pool.id)}
            >
              <X className="h-4 w-4" />
            </Button>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Input
                  className="font-semibold"
                  value={pool.name}
                  onChange={(e) => handlePoolUpdate(pool.id, 'name', e.target.value)}
                />
              </div>
              {targetCluster && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    → {targetCluster.name}
                  </Badge>
                  {targetCluster.type === 'hyperConverged' && (
                    <Badge variant="default" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      HCI
                    </Badge>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target Storage Cluster</Label>
                <Select
                  value={pool.storageClusterId || ''}
                  onValueChange={(value) => handlePoolUpdate(pool.id, 'storageClusterId', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target cluster" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (no target)</SelectItem>
                    {storageClusters.map((cluster) => (
                      <SelectItem key={cluster.id} value={cluster.id}>
                        {cluster.type === 'hyperConverged' && <Zap className="h-3 w-3 inline mr-1" />}
                        {cluster.name} ({cluster.type === 'hyperConverged' ? 'HCI' : 'Dedicated'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {storageClusters.length === 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Please create storage clusters first
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usable Capacity (TiB)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={pool.totalCapacityTB}
                    onChange={(e) =>
                      handlePoolUpdate(pool.id, 'totalCapacityTB', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Protection Scheme</Label>
                  <Select
                    value={pool.poolType}
                    onValueChange={(value) => handlePoolUpdate(pool.id, 'poolType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select scheme" />
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
                    value={pool.maxFillFactor}
                    onChange={(e) =>
                      handlePoolUpdate(pool.id, 'maxFillFactor', parseInt(e.target.value, 10) || 85)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Raw Capacity Required</Label>
                  <div className="h-10 flex items-center px-3 bg-muted rounded-md">
                    <span className="font-medium">
                      {(pool.totalCapacityTB / efficiencyFactor).toFixed(1)} TiB
                    </span>
                  </div>
                </div>
              </div>

              {/* Capacity visualization */}
              <div className="bg-muted/50 rounded p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Usable capacity:</span>
                  <span className="font-medium">{pool.totalCapacityTB} TiB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Efficiency:</span>
                  <span className="font-medium">{Math.round(efficiencyFactor * 100)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Effective capacity:</span>
                  <span className="font-medium">
                    {(pool.totalCapacityTB * (pool.maxFillFactor / 100)).toFixed(1)} TiB
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${pool.maxFillFactor}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {storagePools.length === 0 && (
        <div className="bg-muted/50 rounded-md p-8 text-center text-muted-foreground text-sm border-2 border-dashed">
          <p>No storage pools defined</p>
          <p className="text-xs mt-1">Create logical capacity tiers with data protection schemes</p>
        </div>
      )}
    </div>
  );
};
