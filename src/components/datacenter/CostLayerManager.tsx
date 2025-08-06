import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit2, Trash2, DollarSign, Building, Wrench, Server, Zap, Home, Info } from 'lucide-react';
import { DatacenterFacility, CostLayer, CostCategory } from '@/types/infrastructure/datacenter-types';
import { cn } from '@/lib/utils';

interface CostLayerManagerProps {
  facility: DatacenterFacility;
  onUpdate: (facility: DatacenterFacility) => void;
}

// Map the selected category to the CostCategory type
const categoryMapping: Record<string, CostCategory> = {
  realEstate: 'real-estate',
  facilityInfrastructure: 'building-facility',
  mechanicalElectrical: 'power-infrastructure',
  itInfrastructure: 'it-infrastructure',
  power: 'utilities',
  maintenance: 'maintenance',
  staffing: 'operations'
};

// Predefined cost categories with typical amortisation periods
const costCategories = {
  realEstate: {
    name: 'Real Estate',
    icon: Building,
    type: 'capital' as const,
    typicalAmortisation: { min: 30, max: 50, default: 40 },
    description: 'Land, building construction, site development'
  },
  facilityInfrastructure: {
    name: 'Facility Infrastructure',
    icon: Home,
    type: 'capital' as const,
    typicalAmortisation: { min: 15, max: 25, default: 20 },
    description: 'Power distribution, cooling systems, fire suppression'
  },
  mechanicalElectrical: {
    name: 'Mechanical & Electrical',
    icon: Wrench,
    type: 'capital' as const,
    typicalAmortisation: { min: 10, max: 15, default: 12 },
    description: 'UPS systems, generators, CRAC units'
  },
  itInfrastructure: {
    name: 'IT Infrastructure',
    icon: Server,
    type: 'capital' as const,
    typicalAmortisation: { min: 3, max: 5, default: 4 },
    description: 'Racks, structured cabling, network infrastructure'
  },
  power: {
    name: 'Power/Energy',
    icon: Zap,
    type: 'operational' as const,
    frequency: 'monthly' as const,
    description: 'Utility power costs, energy consumption'
  },
  maintenance: {
    name: 'Maintenance',
    icon: Wrench,
    type: 'operational' as const,
    frequency: 'monthly' as const,
    description: 'Facility maintenance, repairs, service contracts'
  },
  staffing: {
    name: 'Staffing',
    icon: Building,
    type: 'operational' as const,
    frequency: 'monthly' as const,
    description: 'Datacenter operations personnel'
  }
};

export const CostLayerManager: React.FC<CostLayerManagerProps> = ({ facility, onUpdate }) => {
  const [editingLayer, setEditingLayer] = useState<CostLayer | null>(null);
  const [isAddingLayer, setIsAddingLayer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof costCategories>('realEstate');
  const [newLayer, setNewLayer] = useState<Partial<CostLayer>>({
    name: '',
    type: 'capital',
    amount: 0,
    currency: 'USD',
    amortisationMonths: 480, // 40 years default
    allocationMethod: 'hybrid'
  });

  // Group cost layers by type
  const groupedLayers = useMemo(() => {
    const capital = facility.costLayers.filter(l => l.type === 'capital');
    const operational = facility.costLayers.filter(l => l.type === 'operational');
    return { capital, operational };
  }, [facility.costLayers]);

  // Calculate monthly costs
  const monthlyCosts = useMemo(() => {
    const capitalMonthly = groupedLayers.capital.reduce((sum, layer) => {
      return sum + (layer.amortisationMonths ? layer.amount / layer.amortisationMonths : 0);
    }, 0);

    const operationalMonthly = groupedLayers.operational.reduce((sum, layer) => {
      if (layer.frequency === 'monthly') return sum + layer.amount;
      if (layer.frequency === 'annual') return sum + (layer.amount / 12);
      return sum;
    }, 0);

    return {
      capital: capitalMonthly,
      operational: operationalMonthly,
      total: capitalMonthly + operationalMonthly
    };
  }, [groupedLayers]);

  const handleAddLayer = () => {
    if (!newLayer.name?.trim()) return;

    const layer: CostLayer = {
      id: crypto.randomUUID(),
      name: newLayer.name.trim(),
      category: categoryMapping[selectedCategory],
      type: newLayer.type || 'capital',
      amount: newLayer.amount || 0,
      currency: newLayer.currency || 'USD',
      amortisationMonths: newLayer.type === 'capital' ? newLayer.amortisationMonths : undefined,
      frequency: newLayer.type === 'operational' ? newLayer.frequency : undefined,
      allocationMethod: newLayer.allocationMethod || 'hybrid'
    };

    onUpdate({
      ...facility,
      costLayers: [...facility.costLayers, layer]
    });

    // Reset form
    setNewLayer({
      name: '',
      type: 'capital',
      amount: 0,
      currency: 'USD',
      amortisationMonths: 480,
      allocationMethod: 'hybrid'
    });
    setIsAddingLayer(false);
  };

  const handleEditLayer = (layer: CostLayer) => {
    const updatedLayers = facility.costLayers.map(l => 
      l.id === layer.id ? layer : l
    );
    onUpdate({
      ...facility,
      costLayers: updatedLayers
    });
    setEditingLayer(null);
  };

  const handleDeleteLayer = (layerId: string) => {
    const updatedLayers = facility.costLayers.filter(l => l.id !== layerId);
    onUpdate({
      ...facility,
      costLayers: updatedLayers
    });
  };

  // Quick add predefined category
  const quickAddCategory = (categoryKey: keyof typeof costCategories) => {
    const category = costCategories[categoryKey];
    setSelectedCategory(categoryKey);
    setNewLayer({
      name: category.name,
      type: category.type,
      amount: 0,
      currency: 'USD',
      amortisationMonths: category.type === 'capital' 
        ? (category.typicalAmortisation?.default || 12) * 12
        : undefined,
      frequency: category.type === 'operational' ? category.frequency : undefined,
      allocationMethod: 'hybrid'
    });
    setIsAddingLayer(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              Capital (Monthly)
            </div>
            <div className="text-2xl font-bold">
              ${monthlyCosts.capital.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              Operational (Monthly)
            </div>
            <div className="text-2xl font-bold">
              ${monthlyCosts.operational.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              Total (Monthly)
            </div>
            <div className="text-2xl font-bold text-primary">
              ${monthlyCosts.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="layers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="layers">Cost Layers</TabsTrigger>
          <TabsTrigger value="templates">Quick Add Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="layers" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Cost Layer Configuration</CardTitle>
                <Button size="sm" onClick={() => setIsAddingLayer(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Cost Layer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {facility.costLayers.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    No cost layers defined. Add layers to model your datacenter costs.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Capital Costs */}
                  {groupedLayers.capital.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Capital Costs
                      </h4>
                      <div className="space-y-2">
                        {groupedLayers.capital.map(layer => (
                          <div key={layer.id} className="p-4 border rounded-md">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium">{layer.name}</h5>
                                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                                  <span>Total: ${layer.amount.toLocaleString()}</span>
                                  {layer.amortisationMonths && (
                                    <>
                                      <span>•</span>
                                      <span>{(layer.amortisationMonths / 12).toFixed(1)} years</span>
                                      <span>•</span>
                                      <span>${(layer.amount / layer.amortisationMonths).toFixed(0)}/month</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {layer.allocationMethod}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingLayer(layer)}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteLayer(layer.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Operational Costs */}
                  {groupedLayers.operational.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Operational Costs
                      </h4>
                      <div className="space-y-2">
                        {groupedLayers.operational.map(layer => (
                          <div key={layer.id} className="p-4 border rounded-md">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium">{layer.name}</h5>
                                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                                  <span>${layer.amount.toLocaleString()}/{layer.frequency}</span>
                                  {layer.frequency === 'annual' && (
                                    <>
                                      <span>•</span>
                                      <span>${(layer.amount / 12).toFixed(0)}/month</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {layer.allocationMethod}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingLayer(layer)}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteLayer(layer.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Add Cost Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Select a predefined category to quickly add typical datacenter costs with recommended amortisation periods.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(costCategories).map(([key, category]) => {
                  const Icon = category.icon;
                  return (
                    <Card 
                      key={key}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => quickAddCategory(key as keyof typeof costCategories)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <h5 className="font-medium">{category.name}</h5>
                            <p className="text-sm text-muted-foreground mt-1">
                              {category.description}
                            </p>
                            {category.type === 'capital' && category.typicalAmortisation && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                {category.typicalAmortisation.min}-{category.typicalAmortisation.max} years
                              </Badge>
                            )}
                            {category.type === 'operational' && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                {category.frequency}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Cost Layer Dialog */}
      <Dialog open={isAddingLayer || !!editingLayer} onOpenChange={(open) => {
        if (!open) {
          setIsAddingLayer(false);
          setEditingLayer(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLayer ? 'Edit Cost Layer' : 'Add Cost Layer'}
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
                placeholder="e.g., Building Construction, Power Costs"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={editingLayer?.category || categoryMapping[selectedCategory] || 'other'}
                onValueChange={(value: CostCategory) => {
                  if (editingLayer) {
                    setEditingLayer({ ...editingLayer, category: value });
                  } else {
                    // Find the key for the selected category value
                    const categoryKey = Object.entries(categoryMapping).find(([key, val]) => val === value)?.[0] as keyof typeof costCategories;
                    if (categoryKey) {
                      setSelectedCategory(categoryKey);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real-estate">Real Estate</SelectItem>
                  <SelectItem value="building-facility">Facility Infrastructure</SelectItem>
                  <SelectItem value="power-infrastructure">Mechanical & Electrical</SelectItem>
                  <SelectItem value="cooling-infrastructure">Cooling Infrastructure</SelectItem>
                  <SelectItem value="it-infrastructure">IT Infrastructure</SelectItem>
                  <SelectItem value="network-connectivity">Network Connectivity</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cost Type</Label>
              <RadioGroup
                value={editingLayer?.type || newLayer.type || 'capital'}
                onValueChange={(value: 'capital' | 'operational') => {
                  if (editingLayer) {
                    setEditingLayer({ ...editingLayer, type: value });
                  } else {
                    setNewLayer({ ...newLayer, type: value });
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="capital" id="capital" />
                  <Label htmlFor="capital">Capital (one-time, amortised)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="operational" id="operational" />
                  <Label htmlFor="operational">Operational (recurring)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={editingLayer?.amount || newLayer.amount || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    if (editingLayer) {
                      setEditingLayer({ ...editingLayer, amount: value });
                    } else {
                      setNewLayer({ ...newLayer, amount: value });
                    }
                  }}
                />
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={editingLayer?.currency || newLayer.currency || 'USD'}
                  onValueChange={(value) => {
                    if (editingLayer) {
                      setEditingLayer({ ...editingLayer, currency: value });
                    } else {
                      setNewLayer({ ...newLayer, currency: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Capital-specific fields */}
            {(editingLayer?.type || newLayer.type) === 'capital' && (
              <div>
                <Label htmlFor="amortization">Amortisation Period (years)</Label>
                <Input
                  id="amortization"
                  type="number"
                  value={((editingLayer?.amortisationMonths || newLayer.amortisationMonths || 12) / 12).toFixed(1)}
                  onChange={(e) => {
                    const years = parseFloat(e.target.value) || 1;
                    const months = Math.round(years * 12);
                    if (editingLayer) {
                      setEditingLayer({ ...editingLayer, amortisationMonths: months });
                    } else {
                      setNewLayer({ ...newLayer, amortisationMonths: months });
                    }
                  }}
                  step="0.5"
                  min="0.5"
                />
              </div>
            )}

            {/* Operational-specific fields */}
            {(editingLayer?.type || newLayer.type) === 'operational' && (
              <div>
                <Label>Frequency</Label>
                <RadioGroup
                  value={editingLayer?.frequency || newLayer.frequency || 'monthly'}
                  onValueChange={(value: 'monthly' | 'annual') => {
                    if (editingLayer) {
                      setEditingLayer({ ...editingLayer, frequency: value });
                    } else {
                      setNewLayer({ ...newLayer, frequency: value });
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly">Monthly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="annual" id="annual" />
                    <Label htmlFor="annual">Annual</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div>
              <Label>Allocation Method</Label>
              <RadioGroup
                value={editingLayer?.allocationMethod || newLayer.allocationMethod || 'hybrid'}
                onValueChange={(value: 'per-rack' | 'per-kw' | 'hybrid') => {
                  if (editingLayer) {
                    setEditingLayer({ ...editingLayer, allocationMethod: value });
                  } else {
                    setNewLayer({ ...newLayer, allocationMethod: value });
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="per-rack" id="per-rack" />
                  <Label htmlFor="per-rack">Per Rack (equal distribution)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="per-kw" id="per-kw" />
                  <Label htmlFor="per-kw">Per kW (power-based)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hybrid" id="hybrid" />
                  <Label htmlFor="hybrid">Hybrid (50% rack, 50% power)</Label>
                </div>
              </RadioGroup>
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