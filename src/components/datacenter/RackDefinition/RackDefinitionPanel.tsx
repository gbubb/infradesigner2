import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Server, Trash2, AlertCircle, Grid3X3, Zap } from 'lucide-react';
import { useStore } from '@/store';
import { DatacenterRackService } from '@/services/datacenter/DatacenterRackService';
import type { DatacenterRack, RackCreationParams } from '@/types/infrastructure/datacenter-rack-types';
import type { HierarchyLevel } from '@/types/infrastructure/datacenter-types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function RackDefinitionPanel() {
  const { selectedFacilityId, getFacilityById } = useStore();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [datacenterRacks, setDatacenterRacks] = useState<DatacenterRack[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Rack creation form state
  const [rackCount, setRackCount] = useState('10');
  const [rackPrefix, setRackPrefix] = useState('R');
  const [uHeight, setUHeight] = useState('42');
  const [maxPowerKw, setMaxPowerKw] = useState('5.0');
  const [rackType, setRackType] = useState<DatacenterRack['rackType']>('standard');

  const facility = selectedFacilityId ? getFacilityById(selectedFacilityId) : null;

  useEffect(() => {
    const loadDatacenterRacks = async () => {
      if (!selectedLevel) return;
      
      setLoading(true);
      try {
        const racks = await DatacenterRackService.getRacksByHierarchyLevel(selectedLevel);
        setDatacenterRacks(racks);
      } catch (error) {
        console.error('Error loading datacenter racks:', error);
        toast.error("Error", { description: "Failed to load datacenter racks" });
      } finally {
        setLoading(false);
      }
    };

    if (selectedLevel) {
      loadDatacenterRacks();
    }
  }, [selectedLevel]);


  const handleCreateRacks = async () => {
    if (!selectedLevel) return;
    
    const params: RackCreationParams = {
      hierarchyLevelId: selectedLevel,
      rackCount: parseInt(rackCount) || 0,
      rackPrefix,
      uHeight: parseInt(uHeight) || 42,
      maxPowerKw: parseFloat(maxPowerKw) || 5.0,
      rackType
    };

    if (params.rackCount <= 0) {
      toast.error("Invalid Input", {
        description: "Please enter a valid number of racks to create",
      });
      return;
    }

    setCreating(true);
    try {
      await DatacenterRackService.createRacks(params);
      toast.success("Racks Created", {
        description: `Successfully created ${params.rackCount} racks`,
      });
      
      // Reload racks
      if (selectedLevel) {
        const racks = await DatacenterRackService.getRacksByHierarchyLevel(selectedLevel);
        setDatacenterRacks(racks);
      }
      
      // Reset form
      setRackCount('10');
    } catch (error) {
      console.error('Error creating racks:', error);
      toast.error("Error", { description: "Failed to create racks" });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRacks = async (rackIds: string[]) => {
    try {
      await DatacenterRackService.deleteRacks(rackIds);
      toast.success("Racks Deleted", {
        description: `Successfully deleted ${rackIds.length} rack(s)`,
      });
      if (selectedLevel) {
        const racks = await DatacenterRackService.getRacksByHierarchyLevel(selectedLevel);
        setDatacenterRacks(racks);
      }
    } catch (error) {
      console.error('Error deleting racks:', error);
      toast.error("Error", { description: "Failed to delete racks" });
    }
  };

  const renderHierarchyLevel = (level: HierarchyLevel, depth: number = 0) => {
    const isSelected = selectedLevel === level.id;
    const rackCapacity = level.capacity?.racks || 0;
    const hasCapacity = rackCapacity > 0;
    
    return (
      <div key={level.id}>
        <button
          className={cn(
            "w-full text-left px-4 py-2 rounded transition-colors",
            isSelected && "bg-primary/10 border-primary",
            hasCapacity && "hover:bg-accent border-transparent",
            !hasCapacity && "opacity-60 cursor-not-allowed",
            "border"
          )}
          style={{ paddingLeft: `${(depth * 20) + 16}px` }}
          onClick={() => hasCapacity && setSelectedLevel(level.id)}
          disabled={!hasCapacity}
          title={!hasCapacity ? "Set rack capacity in Space Hierarchy to define racks here" : undefined}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{level.name}</span>
            <div className="flex items-center gap-2 text-xs">
              {hasCapacity ? (
                <Badge variant="secondary">
                  {level.capacity?.racks} rack capacity
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  No capacity defined
                </Badge>
              )}
              {level.capacity?.powerKW && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {level.capacity.powerKW} kW
                </Badge>
              )}
            </div>
          </div>
        </button>
        {facility?.hierarchyConfig
          .filter(h => h.parentId === level.id)
          .map(child => renderHierarchyLevel(child, depth + 1))}
      </div>
    );
  };

  const renderRackGrid = () => {
    if (datacenterRacks.length === 0) return null;

    // Since all racks are in the same hierarchy level (row), display them in a single row
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">{datacenterRacks[0]?.rowNumber || 'Racks'}</h4>
          <div className="grid grid-cols-10 gap-2">
            {datacenterRacks
              .sort((a, b) => (a.positionX || 0) - (b.positionX || 0))
              .map(rack => (
                  <div
                    key={rack.id}
                    className={cn(
                      "aspect-square rounded border p-2 text-xs flex flex-col items-center justify-center",
                      rack.status === 'available' && "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
                      rack.status === 'occupied' && "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
                      rack.status === 'reserved' && "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
                      rack.status === 'maintenance' && "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                    )}
                    title={`${rack.name} - ${rack.status}`}
                  >
                    <Server className="h-4 w-4 mb-1" />
                    <span>{rack.rackNumber}</span>
                  </div>
                ))}
              </div>
            </div>
      </div>
    );
  };

  if (!facility) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Please select a facility to manage rack definitions.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Hierarchy Selection */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Select Location</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {facility.hierarchyConfig.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No hierarchy levels with rack capacity defined. 
                    Set rack capacity in the Space Hierarchy tab first.
                  </AlertDescription>
                </Alert>
              ) : (
                facility.hierarchyConfig
                  .filter(h => !h.parentId)
                  .map(level => renderHierarchyLevel(level))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rack Definition and Management */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {selectedLevel ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Define Racks</span>
                  <Badge variant="outline">
                    {datacenterRacks.length} racks defined
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="create" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="create">Create Racks</TabsTrigger>
                    <TabsTrigger value="manage">Manage Racks</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="create" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="rackCount">Number of Racks</Label>
                        <Input
                          id="rackCount"
                          type="number"
                          value={rackCount}
                          onChange={(e) => setRackCount(e.target.value)}
                          min="1"
                          max="100"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rackPrefix">Rack Prefix</Label>
                        <Input
                          id="rackPrefix"
                          value={rackPrefix}
                          onChange={(e) => setRackPrefix(e.target.value)}
                          placeholder="e.g., R"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <Label htmlFor="uHeight">Height (U)</Label>
                        <Input
                          id="uHeight"
                          type="number"
                          value={uHeight}
                          onChange={(e) => setUHeight(e.target.value)}
                          min="1"
                          max="52"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxPower">Max Power (kW)</Label>
                        <Input
                          id="maxPower"
                          type="number"
                          value={maxPowerKw}
                          onChange={(e) => setMaxPowerKw(e.target.value)}
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="rackType">Rack Type</Label>
                        <Select value={rackType} onValueChange={(v) => setRackType(v as DatacenterRack['rackType'])}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="high_density">High Density</SelectItem>
                            <SelectItem value="network">Network</SelectItem>
                            <SelectItem value="storage">Storage</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleCreateRacks}
                      disabled={creating}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create {rackCount} Racks
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="manage" className="space-y-4">
                    {datacenterRacks.length > 0 ? (
                      <>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">
                            Total capacity: {datacenterRacks.reduce((sum, r) => sum + (r.maxPowerKw || 0), 0).toFixed(1)} kW
                          </p>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete all racks in this location?')) {
                                handleDeleteRacks(datacenterRacks.map(r => r.id));
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete All
                          </Button>
                        </div>
                        
                        <ScrollArea className="h-[300px] border rounded-lg p-4">
                          <div className="space-y-2">
                            {datacenterRacks.map(rack => (
                              <div
                                key={rack.id}
                                className="flex items-center justify-between p-2 rounded border"
                              >
                                <div className="flex items-center gap-3">
                                  <Server className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">{rack.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {rack.uHeight}U • {rack.maxPowerKw}kW • {rack.rackType}
                                    </div>
                                  </div>
                                </div>
                                <Badge
                                  variant={
                                    rack.status === 'available' ? 'secondary' :
                                    rack.status === 'occupied' ? 'default' :
                                    rack.status === 'reserved' ? 'outline' :
                                    'destructive'
                                  }
                                >
                                  {rack.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No racks defined for this location yet.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Rack Layout Visualization */}
            {datacenterRacks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
                    Rack Layout
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {renderRackGrid()}
                  </ScrollArea>
                  
                  <div className="mt-4 flex gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
                      <span>Occupied</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
                      <span>Reserved</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
                      <span>Maintenance</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-[400px] text-muted-foreground">
              Select a location from the hierarchy to define racks
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}