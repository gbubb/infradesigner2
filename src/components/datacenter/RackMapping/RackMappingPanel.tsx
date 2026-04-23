import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Server, Zap, Link2, Unlink, Package } from 'lucide-react';
import { useStore } from '@/store';
import { DatacenterRackService } from '@/services/datacenter/DatacenterRackService';
import { supabase } from '@/lib/supabase';
import type { DatacenterRack, DatacenterRackWithUsage } from '@/types/infrastructure/datacenter-rack-types';
import type { RackProfile } from '@/types/infrastructure/rack-types';
import type { HierarchyLevel } from '@/types/infrastructure/datacenter-types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function RackMappingPanel() {
  const { 
    selectedFacilityId, 
    getFacilityById,
    activeDesign 
  } = useStore();
  
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [datacenterRacks, setDatacenterRacks] = useState<DatacenterRackWithUsage[]>([]);
  const [allFacilityRacks, setAllFacilityRacks] = useState<DatacenterRack[]>([]);
  const [designRacks, setDesignRacks] = useState<RackProfile[]>([]);
  const [selectedDesignRack, setSelectedDesignRack] = useState<string | null>(null);
  const [selectedDatacenterRack, setSelectedDatacenterRack] = useState<string | null>(null);
  const [_loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState(false);

  const facility = selectedFacilityId ? getFacilityById(selectedFacilityId) : null;

  useEffect(() => {
    const loadAllFacilityRacks = async () => {
      if (!selectedFacilityId) return;
      
      try {
        const racks = await DatacenterRackService.getFacilityRacks(selectedFacilityId);
        setAllFacilityRacks(racks);
      } catch (error) {
        console.error('Error loading facility racks:', error);
      }
    };

    if (selectedFacilityId) {
      loadAllFacilityRacks();
    }
  }, [selectedFacilityId]);

  useEffect(() => {
    const loadDatacenterRacks = async () => {
      if (!selectedLevel) return;
      
      setLoading(true);
      try {
        const racks = await DatacenterRackService.getRacksWithUsage(selectedLevel);
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

  useEffect(() => {
    const loadDesignRacks = async () => {
      if (!activeDesign?.id) return;
      
      try {
        // Get design with rack profiles
        const { data: design } = await supabase
          .from('designs')
          .select('rackprofiles')
          .eq('id', activeDesign.id)
          .single();
        
        if (design?.rackprofiles) {
          const rackData = typeof design.rackprofiles === 'string' 
            ? JSON.parse(design.rackprofiles) 
            : design.rackprofiles;
          
          if (Array.isArray(rackData)) {
            setDesignRacks(rackData);
          } else {
            setDesignRacks([]);
          }
        } else {
          setDesignRacks([]);
        }
      } catch (error) {
        console.error('Error loading design racks:', error);
      }
    };

    if (activeDesign?.id) {
      loadDesignRacks();
    }
  }, [activeDesign?.id]);




  const handleMapRack = async () => {
    if (!selectedDesignRack || !selectedDatacenterRack || !activeDesign?.id) return;
    
    setMapping(true);
    try {
      await DatacenterRackService.mapDesignRack(
        selectedDesignRack,
        selectedDatacenterRack,
        activeDesign.id
      );
      
      toast.success("Rack Mapped", {
        description: "Successfully mapped design rack to datacenter rack",
      });
      
      // Reload datacenter racks to update status
      if (selectedLevel) {
        setLoading(true);
        try {
          const racks = await DatacenterRackService.getRacksWithUsage(selectedLevel);
          setDatacenterRacks(racks);
        } catch (error) {
          console.error('Error loading datacenter racks:', error);
        } finally {
          setLoading(false);
        }
      }
      
      // Clear selections
      setSelectedDesignRack(null);
      setSelectedDatacenterRack(null);
    } catch (error) {
      console.error('Error mapping rack:', error);
      toast.error("Error", { description: "Failed to map rack" });
    } finally {
      setMapping(false);
    }
  };

  const handleUnmapRack = async (designRackId: string) => {
    try {
      await DatacenterRackService.unmapDesignRack(designRackId);
      
      toast.success("Rack Unmapped", {
        description: "Successfully unmapped design rack",
      });
      
      if (selectedLevel) {
        const racks = await DatacenterRackService.getRacksWithUsage(selectedLevel);
        setDatacenterRacks(racks);
      }
    } catch (error) {
      console.error('Error unmapping rack:', error);
      toast.error("Error", { description: "Failed to unmap rack" });
    }
  };

  const renderHierarchyLevel = (level: HierarchyLevel, depth: number = 0) => {
    const isSelected = selectedLevel === level.id;
    const levelRacks = allFacilityRacks.filter(r => r.hierarchyLevelId === level.id);
    const hasRacks = levelRacks.length > 0;
    
    return (
      <div key={level.id}>
        <button
          className={cn(
            "w-full text-left px-4 py-2 rounded transition-colors",
            isSelected && "bg-primary/10 border-primary",
            hasRacks && "hover:bg-accent border-transparent",
            !hasRacks && "opacity-60",
            "border"
          )}
          style={{ paddingLeft: `${(depth * 20) + 16}px` }}
          onClick={() => hasRacks && setSelectedLevel(level.id)}
          disabled={!hasRacks}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{level.name}</span>
            {hasRacks && (
              <Badge variant="secondary">
                {levelRacks.length} racks
              </Badge>
            )}
          </div>
        </button>
        {facility?.hierarchyConfig
          .filter(h => h.parentId === level.id)
          .map(child => renderHierarchyLevel(child, depth + 1))}
      </div>
    );
  };

  const getUnmappedDesignRacks = () => {
    const mappedRackIds = new Set(
      datacenterRacks
        .filter(r => r.mappedRack)
        .map(r => r.mappedRack!.id)
    );
    
    return designRacks.filter(r => !mappedRackIds.has(r.id));
  };

  const availableDatacenterRacks = datacenterRacks.filter(r => r.status === 'available');
  const unmappedDesignRacks = getUnmappedDesignRacks();

  if (!facility || !activeDesign) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Please select a facility and have an active design to map racks.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
      {/* Hierarchy Selection */}
      <Card className="flex flex-col min-h-0">
        <CardHeader>
          <CardTitle>Select Location</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {facility.hierarchyConfig
                .filter(h => !h.parentId)
                .map(level => renderHierarchyLevel(level))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rack Mapping */}
      <div className="lg:col-span-2 space-y-6">
        {selectedLevel ? (
          <>
            {/* Mapping Interface */}
            <Card>
              <CardHeader>
                <CardTitle>Map Design Racks to Datacenter Racks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                  {/* Design Rack Selection */}
                  <div>
                    <Label className="text-sm mb-2">Design Rack</Label>
                    <Select 
                      value={selectedDesignRack || ''} 
                      onValueChange={setSelectedDesignRack}
                      disabled={unmappedDesignRacks.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          unmappedDesignRacks.length === 0 
                            ? "No unmapped racks" 
                            : "Select design rack"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {unmappedDesignRacks.map(rack => (
                          <SelectItem key={rack.id} value={rack.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{rack.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {rack.devices?.length || 0} devices
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Datacenter Rack Selection */}
                  <div>
                    <Label className="text-sm mb-2">Datacenter Rack</Label>
                    <Select 
                      value={selectedDatacenterRack || ''} 
                      onValueChange={setSelectedDatacenterRack}
                      disabled={availableDatacenterRacks.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          availableDatacenterRacks.length === 0 
                            ? "No available racks" 
                            : "Select datacenter rack"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDatacenterRacks.map(rack => (
                          <SelectItem key={rack.id} value={rack.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{rack.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {rack.maxPowerKw}kW • {rack.uHeight}U
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  className="w-full mt-4"
                  onClick={handleMapRack}
                  disabled={!selectedDesignRack || !selectedDatacenterRack || mapping}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Map Rack
                </Button>
              </CardContent>
            </Card>

            {/* Current Mappings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Mappings</span>
                  <Badge variant="outline">
                    {datacenterRacks.filter(r => r.status === 'occupied').length} / {datacenterRacks.length} occupied
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                    {datacenterRacks
                      .filter(r => r.mappedRack)
                      .map(rack => (
                        <div
                          key={rack.id}
                          className="p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <Server className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{rack.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {rack.rowNumber} • {rack.rackType} • {rack.uHeight}U • {rack.maxPowerKw}kW max
                                  </div>
                                </div>
                              </div>
                              
                              {rack.mappedRack && (
                                <div className="ml-8 p-3 rounded bg-muted/50">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm font-medium">
                                        {rack.mappedRack.name}
                                      </div>
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                        <span className="flex items-center gap-1">
                                          <Package className="h-3 w-3" />
                                          {rack.mappedRack.devices.length} devices
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Zap className="h-3 w-3" />
                                          {rack.powerUsageKw.toFixed(1)} / {rack.maxPowerKw} kW
                                        </span>
                                        <span>
                                          {rack.spaceUsageU} / {rack.uHeight} U
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleUnmapRack(rack.mappedRack!.id)}
                                    >
                                      <Unlink className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  {/* Utilization Bars */}
                                  <div className="mt-3 space-y-2">
                                    <div>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span>Power</span>
                                        <span>{rack.powerUtilization.toFixed(0)}%</span>
                                      </div>
                                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-primary transition-all"
                                          style={{ width: `${rack.powerUtilization}%` }}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span>Space</span>
                                        <span>{rack.spaceUtilization.toFixed(0)}%</span>
                                      </div>
                                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-primary transition-all"
                                          style={{ width: `${rack.spaceUtilization}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {datacenterRacks.filter(r => r.mappedRack).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No racks mapped yet. Select a design rack and datacenter rack above to create a mapping.
                      </div>
                    )}
                  </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-[400px] text-muted-foreground">
              Select a location from the hierarchy to view and map racks
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}