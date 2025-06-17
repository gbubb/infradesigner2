import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit2, Trash2, Zap, AlertTriangle, TrendingDown, Activity } from 'lucide-react';
import { DatacenterFacility, PowerLayer, RedundancyConfig } from '@/types/infrastructure/datacenter-types';
import { cn } from '@/lib/utils';

interface PowerInfrastructureDesignerProps {
  facility: DatacenterFacility;
  onUpdate: (facility: DatacenterFacility) => void;
}

interface PowerLayerNodeProps {
  layer: PowerLayer;
  allLayers: PowerLayer[];
  onEdit: (layer: PowerLayer) => void;
  onDelete: (layerId: string) => void;
  depth?: number;
}

const PowerLayerNode: React.FC<PowerLayerNodeProps> = ({ 
  layer, 
  allLayers, 
  onEdit, 
  onDelete, 
  depth = 0 
}) => {
  const children = allLayers.filter(l => l.parentLayerId === layer.id);
  const effectiveCapacity = layer.capacityKW * layer.efficiency;
  const lossKW = layer.capacityKW - effectiveCapacity;

  return (
    <div className="relative">
      <div
        className={cn(
          "p-4 rounded-md border bg-card",
          depth === 0 && "border-primary"
        )}
        style={{ marginLeft: `${depth * 24}px` }}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {layer.name}
            </h4>
            <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
              <span>Capacity: {layer.capacityKW.toLocaleString()} kW</span>
              <span>Efficiency: {(layer.efficiency * 100).toFixed(1)}%</span>
              <span>Output: {effectiveCapacity.toFixed(0)} kW</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(layer)}
            >
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(layer.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Redundancy Configuration */}
        {layer.redundancyConfig && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              {layer.redundancyConfig.type}
            </Badge>
          </div>
        )}

        {/* Power Loss Indicator */}
        {lossKW > 0 && (
          <div className="mt-2 flex items-center gap-2 text-sm text-orange-600">
            <TrendingDown className="w-3 h-3" />
            <span>Loss: {lossKW.toFixed(0)} kW</span>
          </div>
        )}
      </div>
      
      {children.length > 0 && (
        <div className="mt-2">
          {children.map(child => (
            <PowerLayerNode
              key={child.id}
              layer={child}
              allLayers={allLayers}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const PowerInfrastructureDesigner: React.FC<PowerInfrastructureDesignerProps> = ({ 
  facility, 
  onUpdate 
}) => {
  const [editingLayer, setEditingLayer] = useState<PowerLayer | null>(null);
  const [isAddingLayer, setIsAddingLayer] = useState(false);
  const [newLayer, setNewLayer] = useState<Partial<PowerLayer>>({
    name: '',
    type: 'pdu',
    capacityKW: 1000,
    efficiency: 0.95,
    parentLayerId: undefined
  });

  const rootLayers = facility.powerInfrastructure.filter(l => !l.parentLayerId);

  // Calculate power flow analysis
  const powerFlowAnalysis = useMemo(() => {
    const calculateLayerFlow = (layerId: string): {
      inputKW: number;
      outputKW: number;
      lossKW: number;
      children: string[];
    } => {
      const layer = facility.powerInfrastructure.find(l => l.id === layerId);
      if (!layer) return { inputKW: 0, outputKW: 0, lossKW: 0, children: [] };

      const children = facility.powerInfrastructure.filter(l => l.parentLayerId === layerId);
      const inputKW = layer.capacityKW;
      const outputKW = inputKW * layer.efficiency;
      const lossKW = inputKW - outputKW;

      return {
        inputKW,
        outputKW,
        lossKW,
        children: children.map(c => c.id)
      };
    };

    const analysis: Record<string, ReturnType<typeof calculateLayerFlow>> = {};
    facility.powerInfrastructure.forEach(layer => {
      analysis[layer.id] = calculateLayerFlow(layer.id);
    });

    return analysis;
  }, [facility.powerInfrastructure]);

  // Calculate total IT load capacity
  const totalITCapacity = useMemo(() => {
    // Find leaf nodes (no children) as they represent IT load
    const leafLayers = facility.powerInfrastructure.filter(layer => 
      !facility.powerInfrastructure.some(l => l.parentLayerId === layer.id)
    );
    
    return leafLayers.reduce((sum, layer) => {
      // Calculate effective capacity considering all parent efficiencies
      let effectiveCapacity = layer.capacityKW;
      let currentLayer = layer;
      
      while (currentLayer) {
        effectiveCapacity *= currentLayer.efficiency;
        currentLayer = facility.powerInfrastructure.find(l => 
          l.id === currentLayer?.parentLayerId
        ) || null;
      }
      
      return sum + effectiveCapacity;
    }, 0);
  }, [facility.powerInfrastructure]);

  const handleAddLayer = () => {
    if (!newLayer.name?.trim()) return;

    const layer: PowerLayer = {
      id: crypto.randomUUID(),
      name: newLayer.name.trim(),
      type: newLayer.type || 'pdu',
      capacityKW: newLayer.capacityKW || 1000,
      efficiency: newLayer.efficiency || 0.95,
      parentLayerId: newLayer.parentLayerId,
      redundancyConfig: newLayer.redundancyConfig
    };

    onUpdate({
      ...facility,
      powerInfrastructure: [...facility.powerInfrastructure, layer]
    });

    setNewLayer({
      name: '',
      type: 'pdu',
      capacityKW: 1000,
      efficiency: 0.95,
      parentLayerId: undefined
    });
    setIsAddingLayer(false);
  };

  const handleEditLayer = (layer: PowerLayer) => {
    const updatedLayers = facility.powerInfrastructure.map(l => 
      l.id === layer.id ? layer : l
    );
    onUpdate({
      ...facility,
      powerInfrastructure: updatedLayers
    });
    setEditingLayer(null);
  };

  const handleDeleteLayer = (layerId: string) => {
    // Delete the layer and all its children
    const deleteRecursive = (id: string): string[] => {
      const children = facility.powerInfrastructure.filter(l => l.parentLayerId === id);
      const childIds = children.flatMap(child => deleteRecursive(child.id));
      return [id, ...childIds];
    };

    const idsToDelete = deleteRecursive(layerId);
    const updatedLayers = facility.powerInfrastructure.filter(l => !idsToDelete.includes(l.id));
    
    onUpdate({
      ...facility,
      powerInfrastructure: updatedLayers
    });
  };

  // Add default power infrastructure template
  const addDefaultInfrastructure = () => {
    const gridId = crypto.randomUUID();
    const upsId = crypto.randomUUID();
    const pduAId = crypto.randomUUID();
    const pduBId = crypto.randomUUID();
    
    const defaultLayers: PowerLayer[] = [
      { id: gridId, name: 'Grid Input', type: 'grid', capacityKW: 10000, efficiency: 1.0, parentLayerId: undefined },
      { id: upsId, name: 'UPS System', type: 'ups', capacityKW: 10000, efficiency: 0.95, parentLayerId: gridId, 
        redundancyConfig: { type: '2N' } },
      { id: pduAId, name: 'PDU A', type: 'pdu', capacityKW: 5000, efficiency: 0.98, parentLayerId: upsId },
      { id: pduBId, name: 'PDU B', type: 'pdu', capacityKW: 5000, efficiency: 0.98, parentLayerId: upsId },
    ];
    
    onUpdate({
      ...facility,
      powerInfrastructure: defaultLayers
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="design" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="design">Infrastructure Design</TabsTrigger>
          <TabsTrigger value="analysis">Power Flow Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Power Infrastructure Layers</CardTitle>
                <div className="flex gap-2">
                  {facility.powerInfrastructure.length === 0 && (
                    <Button variant="outline" size="sm" onClick={addDefaultInfrastructure}>
                      Use Default Template
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setIsAddingLayer(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Layer
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {facility.powerInfrastructure.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    No power infrastructure defined. Add layers to model your power distribution.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Typical layers: Grid → UPS → PDU → Rack
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {rootLayers.map(layer => (
                      <PowerLayerNode
                        key={layer.id}
                        layer={layer}
                        allLayers={facility.powerInfrastructure}
                        onEdit={setEditingLayer}
                        onDelete={handleDeleteLayer}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Power Flow Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Total IT Capacity</Label>
                    <div className="text-2xl font-bold">
                      {totalITCapacity.toFixed(0)} kW
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {facility.powerInfrastructure.map(layer => {
                      const flow = powerFlowAnalysis[layer.id];
                      return (
                        <div key={layer.id} className="p-3 border rounded-md">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium">{layer.name}</h5>
                              <div className="text-sm text-muted-foreground mt-1">
                                Input: {flow.inputKW.toFixed(0)} kW → 
                                Output: {flow.outputKW.toFixed(0)} kW
                              </div>
                            </div>
                            {flow.lossKW > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Loss: {flow.lossKW.toFixed(0)} kW
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Efficiency Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Cascading efficiencies result in cumulative power losses through the infrastructure.
                  </AlertDescription>
                </Alert>
                
                <div className="mt-4 space-y-3">
                  {facility.powerInfrastructure.map(layer => (
                    <div key={layer.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{layer.name}</span>
                        <span>{(layer.efficiency * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${layer.efficiency * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Layer Dialog */}
      <Dialog open={isAddingLayer || !!editingLayer} onOpenChange={(open) => {
        if (!open) {
          setIsAddingLayer(false);
          setEditingLayer(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLayer ? 'Edit Power Layer' : 'Add Power Layer'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="layer-name">Layer Name</Label>
              <Input
                id="layer-name"
                value={editingLayer?.name || newLayer.name || ''}
                onChange={(e) => {
                  if (editingLayer) {
                    setEditingLayer({ ...editingLayer, name: e.target.value });
                  } else {
                    setNewLayer({ ...newLayer, name: e.target.value });
                  }
                }}
                placeholder="e.g., Grid Input, UPS, PDU"
              />
            </div>
            
            <div>
              <Label htmlFor="layer-type">Layer Type</Label>
              <Select
                value={editingLayer?.type || newLayer.type || 'pdu'}
                onValueChange={(value) => {
                  if (editingLayer) {
                    setEditingLayer({ ...editingLayer, type: value as PowerLayer['type'] });
                  } else {
                    setNewLayer({ ...newLayer, type: value as PowerLayer['type'] });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select layer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid Input</SelectItem>
                  <SelectItem value="ups">UPS</SelectItem>
                  <SelectItem value="generator">Generator</SelectItem>
                  <SelectItem value="switchgear">Switchgear</SelectItem>
                  <SelectItem value="pdu">PDU</SelectItem>
                  <SelectItem value="panel">Panel</SelectItem>
                  <SelectItem value="rack">Rack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="capacity">Capacity (kW)</Label>
              <Input
                id="capacity"
                type="number"
                value={editingLayer?.capacityKW || newLayer.capacityKW || 1000}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  if (editingLayer) {
                    setEditingLayer({ ...editingLayer, capacityKW: value });
                  } else {
                    setNewLayer({ ...newLayer, capacityKW: value });
                  }
                }}
              />
            </div>
            
            <div>
              <Label htmlFor="efficiency">
                Efficiency: {((editingLayer?.efficiency || newLayer.efficiency || 0.95) * 100).toFixed(1)}%
              </Label>
              <Slider
                id="efficiency"
                min={0.5}
                max={1}
                step={0.01}
                value={[editingLayer?.efficiency || newLayer.efficiency || 0.95]}
                onValueChange={(value) => {
                  if (editingLayer) {
                    setEditingLayer({ ...editingLayer, efficiency: value[0] });
                  } else {
                    setNewLayer({ ...newLayer, efficiency: value[0] });
                  }
                }}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="parent-layer">Parent Layer (Optional)</Label>
              <Select
                value={editingLayer?.parentLayerId || newLayer.parentLayerId || 'none'}
                onValueChange={(value) => {
                  const parentId = value === 'none' ? undefined : value;
                  if (editingLayer) {
                    setEditingLayer({ 
                      ...editingLayer, 
                      parentLayerId: parentId 
                    });
                  } else {
                    setNewLayer({ 
                      ...newLayer, 
                      parentLayerId: parentId 
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent layer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root Layer)</SelectItem>
                  {facility.powerInfrastructure
                    .filter(layer => layer.id !== editingLayer?.id)
                    .map(layer => (
                      <SelectItem key={layer.id} value={layer.id}>
                        {layer.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddingLayer(false);
              setEditingLayer(null);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (editingLayer) {
                handleEditLayer(editingLayer);
              } else {
                handleAddLayer();
              }
            }}>
              {editingLayer ? 'Save Changes' : 'Add Layer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};