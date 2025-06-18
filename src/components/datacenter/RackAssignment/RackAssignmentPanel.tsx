import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Server, Zap, Package, Import } from 'lucide-react';
import { useStore } from '@/store';
import { RackFacilityIntegrationService } from '@/services/datacenter/RackFacilityIntegrationService';
import type { RackProfile } from '@/types/infrastructure/rack-types';
import type { HierarchyLevel } from '@/types/infrastructure/datacenter-types';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

export function RackAssignmentPanel() {
  const { 
    selectedFacilityId, 
    getFacilityById,
    assignRacksToLevel,
    assignmentLoading,
    activeDesign 
  } = useStore();
  
  const [unassignedRacks, setUnassignedRacks] = useState<RackProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRacks, setSelectedRacks] = useState<Set<string>>(new Set());
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const facility = selectedFacilityId ? getFacilityById(selectedFacilityId) : null;

  useEffect(() => {
    loadUnassignedRacks();
  }, []);

  const loadUnassignedRacks = async () => {
    setLoading(true);
    try {
      const racks = await RackFacilityIntegrationService.getUnassignedRacks();
      setUnassignedRacks(racks);
    } catch (error) {
      console.error('Error loading unassigned racks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromDesign = async () => {
    if (!activeDesign?.id) return;
    
    setImporting(true);
    try {
      const importedRacks = await RackFacilityIntegrationService.importRacksFromDesign(activeDesign.id);
      
      if (importedRacks.length > 0) {
        toast({
          title: "Racks Imported",
          description: `Successfully imported ${importedRacks.length} racks from the current design.`,
        });
        
        // Reload unassigned racks
        await loadUnassignedRacks();
      } else {
        toast({
          title: "No Racks to Import",
          description: "All racks from the current design have already been imported.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error importing racks:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import racks from the design. Please try again.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const filteredRacks = unassignedRacks.filter(rack =>
    rack.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRackToggle = (rackId: string) => {
    const newSelected = new Set(selectedRacks);
    if (newSelected.has(rackId)) {
      newSelected.delete(rackId);
    } else {
      newSelected.add(rackId);
    }
    setSelectedRacks(newSelected);
  };

  const handleAssignRacks = async () => {
    if (!selectedLevel || !selectedFacilityId || selectedRacks.size === 0) return;

    try {
      await assignRacksToLevel(Array.from(selectedRacks), selectedFacilityId, selectedLevel);
      
      // Clear selection and reload
      setSelectedRacks(new Set());
      await loadUnassignedRacks();
    } catch (error) {
      console.error('Error assigning racks:', error);
    }
  };

  const renderHierarchyLevel = (level: HierarchyLevel, depth: number = 0) => {
    const isSelected = selectedLevel === level.id;
    const hasCapacity = (level.capacity?.racks || 0) > (level.assignedRacks || 0);
    
    return (
      <div key={level.id}>
        <button
          className={cn(
            "w-full text-left px-4 py-2 rounded hover:bg-accent transition-colors",
            isSelected && "bg-accent",
            !hasCapacity && "opacity-50 cursor-not-allowed"
          )}
          style={{ paddingLeft: `${(depth * 20) + 16}px` }}
          onClick={() => hasCapacity && setSelectedLevel(level.id)}
          disabled={!hasCapacity}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{level.name}</span>
            <div className="flex items-center gap-2">
              {level.assignedRacks !== undefined && level.capacity?.racks && (
                <Badge variant="secondary">
                  {level.assignedRacks}/{level.capacity.racks} racks
                </Badge>
              )}
              {level.capacity?.powerKW && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {level.actualPowerKw || 0}/{level.capacity.powerKW} kW
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

  if (!facility) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Please select a facility to manage rack assignments.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Unassigned Racks */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="flex items-center gap-2">
              <span>Unassigned Racks</span>
              <Badge variant="outline">{filteredRacks.length} available</Badge>
            </CardTitle>
            {activeDesign && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleImportFromDesign}
                disabled={importing}
              >
                <Import className="h-4 w-4 mr-2" />
                Import from Design
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search racks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading racks...
                </div>
              ) : filteredRacks.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-muted-foreground mb-2">
                    No unassigned racks found.
                  </div>
                  {activeDesign?.rackprofiles && activeDesign.rackprofiles.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-2">
                        Your design has {activeDesign.rackprofiles.length} racks.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleImportFromDesign}
                        disabled={importing}
                      >
                        <Import className="h-4 w-4 mr-2" />
                        Import Design Racks
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                filteredRacks.map(rack => (
                  <button
                    key={rack.id}
                    onClick={() => handleRackToggle(rack.id)}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-colors",
                      selectedRacks.has(rack.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Server className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{rack.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {rack.uHeight}U
                            {rack.rackSpecifications?.maxPowerKw && 
                              ` • ${rack.rackSpecifications.maxPowerKw} kW max`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rack.devices && rack.devices.length > 0 && (
                          <Badge variant="secondary">
                            <Package className="h-3 w-3 mr-1" />
                            {rack.devices.length} devices
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Facility Hierarchy */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Facility Hierarchy</span>
            <Button
              size="sm"
              disabled={selectedRacks.size === 0 || !selectedLevel || assignmentLoading}
              onClick={handleAssignRacks}
            >
              Assign {selectedRacks.size} Rack{selectedRacks.size !== 1 ? 's' : ''}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {facility.hierarchyConfig
                .filter(h => !h.parentId)
                .map(level => renderHierarchyLevel(level))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}