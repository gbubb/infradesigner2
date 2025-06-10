import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, DollarSign, Zap, AlertCircle } from 'lucide-react';
import { DatacenterFacility } from '@/types/infrastructure/datacenter-types';
import { HierarchyBuilder } from './HierarchyBuilder';
import { PowerInfrastructureDesigner } from './PowerInfrastructureDesigner';
import { CostLayerManager } from './CostLayerManager';
import { useDesignStore } from '@/store/designStore';
import { cn } from '@/lib/utils';

export const DatacenterPanel: React.FC = () => {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<DatacenterFacility[]>([]);
  const [isCreatingFacility, setIsCreatingFacility] = useState(false);

  // Get active design from store for context
  const activeDesign = useDesignStore(state => state.activeDesign);

  // Get selected facility
  const selectedFacility = useMemo(() => {
    return facilities.find(f => f.id === selectedFacilityId);
  }, [facilities, selectedFacilityId]);

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
      } else if (layer.type === 'capital' && layer.amortizationMonths) {
        return sum + (layer.amount / layer.amortizationMonths);
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
    const newFacility: DatacenterFacility = {
      id: `facility-${Date.now()}`,
      name: 'New Datacenter',
      location: 'Location TBD',
      hierarchyConfig: [],
      powerInfrastructure: [],
      costLayers: [],
      constraints: {
        maxPowerKW: 0,
        maxCoolingKW: 0,
        maxRacks: 0,
        maxFloorLoadingKgPerM2: 0
      }
    };
    setFacilities([...facilities, newFacility]);
    setSelectedFacilityId(newFacility.id);
    setIsCreatingFacility(false);
  };

  const handleUpdateFacility = (updatedFacility: DatacenterFacility) => {
    setFacilities(facilities.map(f => 
      f.id === updatedFacility.id ? updatedFacility : f
    ));
  };

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
            <Button onClick={() => setIsCreatingFacility(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Facility
            </Button>
          </CardContent>
        </Card>
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
              onClick={() => setSelectedFacilityId(facility.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{facility.name}</h4>
                    <p className="text-sm text-muted-foreground">{facility.location}</p>
                  </div>
                  {selectedFacilityId === facility.id && (
                    <Badge variant="default" className="ml-2">Active</Badge>
                  )}
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
              <Tabs defaultValue="hierarchy" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="hierarchy">Space Hierarchy</TabsTrigger>
                  <TabsTrigger value="power">Power Infrastructure</TabsTrigger>
                  <TabsTrigger value="costs">Cost Layers</TabsTrigger>
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
    </div>
  );
};