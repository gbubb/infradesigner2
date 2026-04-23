import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Building2, Plus, DollarSign, Zap, AlertCircle, Edit, Trash2, Server, BarChart3 } from 'lucide-react';
import { DatacenterFacility } from '@/types/infrastructure/datacenter-types';
import { HierarchyBuilder } from './HierarchyBuilder';
import { PowerInfrastructureDesigner } from './PowerInfrastructureDesigner';
import { CostLayerManager } from './CostLayerManager';
import { RackMappingPanel } from './RackMapping/RackMappingPanel';
import { RackCostVisualization } from './RackAssignment/RackCostVisualization';
import { RackDefinitionPanel } from './RackDefinition/RackDefinitionPanel';
import { useDesignStore } from '@/store/designStore';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const facilityFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().optional()
});

type FacilityFormData = z.infer<typeof facilityFormSchema>;

export const DatacenterPanel: React.FC = () => {
  const [isCreatingFacility, setIsCreatingFacility] = useState(false);
  const [editingFacility, setEditingFacility] = useState<DatacenterFacility | null>(null);
  const [activeTab, setActiveTab] = useState<string>('hierarchy');

  // Get state and actions from the facilities slice
  const {
    facilities,
    selectedFacilityId,
    isLoadingFacilities,
    facilitiesError: _facilitiesError,
    loadFacilities,
    selectFacility,
    createFacility,
    updateFacility,
    deleteFacility
  } = useDesignStore();

  // Load facilities on mount
  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  // Get selected facility
  const selectedFacility = useMemo(() => {
    return facilities.find(f => f.id === selectedFacilityId);
  }, [facilities, selectedFacilityId]);

  // Form for creating/editing facilities
  const form = useForm<FacilityFormData>({
    resolver: zodResolver(facilityFormSchema),
    defaultValues: {
      name: '',
      location: '',
      description: ''
    }
  });

  // Update form when editing a facility
  useEffect(() => {
    if (editingFacility) {
      form.reset({
        name: editingFacility.name,
        location: editingFacility.location,
        description: editingFacility.description || ''
      });
    } else {
      form.reset({ name: '', location: '', description: '' });
    }
  }, [editingFacility, form]);

  // Calculate facility-level metrics
  const facilityMetrics = useMemo(() => {
    if (!selectedFacility) return null;

    // Calculate total power capacity through the layers
    const totalPowerCapacity = selectedFacility.powerInfrastructure
      .filter(layer => !layer.parentLayerId) // Root layers only
      .reduce((sum, layer) => sum + layer.capacityKW, 0);

    // Calculate effective PUE from cascading efficiencies
    const calculateEffectivePUE = () => {
      let efficiency = 1.0;
      selectedFacility.powerInfrastructure.forEach(layer => {
        efficiency *= layer.efficiency;
      });
      return efficiency > 0 ? 1 / efficiency : 1.0;
    };

    // Calculate total monthly costs
    const totalMonthlyCost = selectedFacility.costLayers.reduce((sum, layer) => {
      if (layer.type === 'operational' && layer.frequency === 'monthly') {
        return sum + layer.amount;
      } else if (layer.type === 'operational' && layer.frequency === 'annual') {
        return sum + (layer.amount / 12);
      } else if (layer.type === 'capital' && layer.amortisationMonths) {
        return sum + (layer.amount / layer.amortisationMonths);
      }
      return sum;
    }, 0);

    return {
      totalPowerCapacity,
      effectivePUE: calculateEffectivePUE(),
      totalMonthlyCost,
      costPerKW: totalPowerCapacity > 0 ? totalMonthlyCost / totalPowerCapacity : 0
    };
  }, [selectedFacility]);

  const handleCreateFacility = () => {
    setIsCreatingFacility(true);
    setEditingFacility(null);
  };

  const handleEditFacility = (facility: DatacenterFacility) => {
    setEditingFacility(facility);
    setIsCreatingFacility(true);
  };

  const handleDeleteFacility = async (facilityId: string) => {
    try {
      await deleteFacility(facilityId);
      toast.success('Success', { description: 'Facility deleted successfully' });
    } catch (_error) {
      toast.error('Error', { description: 'Failed to delete facility' });
    }
  };

  const onSubmitFacility = async (data: FacilityFormData) => {
    try {
      if (editingFacility) {
        // Update existing facility
        await updateFacility(editingFacility.id, data);
        toast.success('Success', { description: 'Facility updated successfully' });
      } else {
        // Create new facility
        const newFacility = await createFacility({
          name: data.name,
          location: data.location,
          description: data.description,
          hierarchyConfig: [],
          powerInfrastructure: [],
          costLayers: [],
          constraints: {
            maxPowerKW: 0,
            maxCoolingKW: 0,
            maxRacks: 0
          }
        });
        selectFacility(newFacility.id);
        toast.success('Success', { description: 'Facility created successfully' });
      }
      setIsCreatingFacility(false);
      setEditingFacility(null);
    } catch (_error) {
      toast.error('Error', {
        description: editingFacility ? 'Failed to update facility' : 'Failed to create facility',
      });
    }
  };

  const handleUpdateFacility = (updatedFacility: DatacenterFacility) => {
    updateFacility(updatedFacility.id, updatedFacility);
  };

  if (isLoadingFacilities) {
    return (
      <div className="w-full p-6">
        <h2 className="text-2xl font-semibold mb-6">Datacenter Facilities</h2>
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading facilities...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (facilities.length === 0 && !isCreatingFacility) {
    return (
      <div className="w-full p-6">
        <h2 className="text-2xl font-semibold mb-6">Datacenter Facilities</h2>
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Datacenter Facilities</h3>
            <p className="text-muted-foreground mb-4">
              Create your first datacenter facility to model costs and capacity.
            </p>
            <Button onClick={handleCreateFacility}>
              <Plus className="w-4 h-4 mr-2" />
              Create Facility
            </Button>
          </CardContent>
        </Card>
        
        {/* Facility Form Dialog */}
        <Dialog open={isCreatingFacility} onOpenChange={setIsCreatingFacility}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFacility ? 'Edit Facility' : 'Create New Facility'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitFacility)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter facility name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter facility location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter facility description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreatingFacility(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingFacility ? 'Update' : 'Create'} Facility
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Datacenter Facilities</h2>
        <Button onClick={handleCreateFacility} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Facility
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Facility List */}
        <div className="lg:col-span-1 space-y-2">
          {facilities.map(facility => (
            <Card 
              key={facility.id}
              className={cn(
                "cursor-pointer transition-colors",
                selectedFacilityId === facility.id && "border-primary"
              )}
              onClick={() => selectFacility(facility.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{facility.name}</h4>
                    <p className="text-sm text-muted-foreground">{facility.location}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedFacilityId === facility.id && (
                      <Badge variant="default" className="ml-2">Active</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFacility(facility);
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this facility?')) {
                          handleDeleteFacility(facility.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {facility.powerInfrastructure.length} Power Layers
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {facility.costLayers.length} Cost Layers
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Facility Details */}
        <div className="lg:col-span-3">
          {selectedFacility ? (
            <>
              {/* Metrics Summary */}
              {facilityMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Zap className="w-4 h-4" />
                        Total Power
                      </div>
                      <div className="text-2xl font-bold">
                        {facilityMetrics.totalPowerCapacity.toLocaleString()} kW
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <AlertCircle className="w-4 h-4" />
                        Effective PUE
                      </div>
                      <div className="text-2xl font-bold">
                        {facilityMetrics.effectivePUE.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <DollarSign className="w-4 h-4" />
                        Monthly Cost
                      </div>
                      <div className="text-2xl font-bold">
                        ${facilityMetrics.totalMonthlyCost.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <DollarSign className="w-4 h-4" />
                        Cost per kW
                      </div>
                      <div className="text-2xl font-bold">
                        ${facilityMetrics.costPerKW.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Configuration Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="hierarchy">Space Hierarchy</TabsTrigger>
                  <TabsTrigger value="power">Power Infrastructure</TabsTrigger>
                  <TabsTrigger value="costs">Cost Layers</TabsTrigger>
                  <TabsTrigger value="rack-definition" className="flex items-center gap-1">
                    <Server className="h-3 w-3" />
                    Rack Definition
                  </TabsTrigger>
                  <TabsTrigger value="racks" className="flex items-center gap-1">
                    <Server className="h-3 w-3" />
                    Rack Assignment
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Cost Analysis
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="hierarchy" className="mt-6">
                  <HierarchyBuilder 
                    facility={selectedFacility}
                    onUpdate={handleUpdateFacility}
                  />
                </TabsContent>

                <TabsContent value="power" className="mt-6">
                  <PowerInfrastructureDesigner
                    facility={selectedFacility}
                    onUpdate={handleUpdateFacility}
                  />
                </TabsContent>

                <TabsContent value="costs" className="mt-6">
                  <CostLayerManager
                    facility={selectedFacility}
                    onUpdate={handleUpdateFacility}
                  />
                </TabsContent>

                <TabsContent value="rack-definition" className="mt-6">
                  <RackDefinitionPanel />
                </TabsContent>

                <TabsContent value="racks" className="mt-6">
                  <RackMappingPanel />
                </TabsContent>

                <TabsContent value="analysis" className="mt-6">
                  <RackCostVisualization />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Select a facility to view and edit its configuration
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Facility Form Dialog */}
      <Dialog open={isCreatingFacility} onOpenChange={setIsCreatingFacility}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFacility ? 'Edit Facility' : 'Create New Facility'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitFacility)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter facility name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter facility location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter facility description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreatingFacility(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingFacility ? 'Update' : 'Create'} Facility
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};