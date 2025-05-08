import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RackView } from '@/components/visualization/RackView';
import { RackService } from '@/services/rackService';
import { analyzeRackLayout } from '@/utils/rackLayoutUtils';
import { HardDrive } from 'lucide-react';
import { DevicePalette } from '@/components/palette/DevicePalette';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ConnectionPanel } from '@/components/connections/ConnectionPanel';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useConnectionManager } from '@/hooks/design/useConnectionManager';
import { InfrastructureComponent, PlacedDevice, Port } from '@/types/infrastructure';

// Helper function to calculate port visual coordinates
const calculatePortVisualXY = (
  placedDevice: PlacedDevice,
  portId: string,
  deviceDetails: InfrastructureComponent,
  unitHeight: number,
  rackViewWidth: number
): { x: number; y: number } | null => {
  // If device has no ports or no height defined, we can't calculate position
  if (!deviceDetails.ports || !deviceDetails.ruHeight) {
    return null;
  }
  
  // Find the port in device's ports array
  const portIndex = deviceDetails.ports.findIndex(port => port.id === portId);
  if (portIndex === -1) {
    return null;
  }
  
  // Calculate device's visual position
  // Note: In our rack view, Y=0 is at the bottom of the rack and increases upwards
  const deviceBottomVisualY = (placedDevice.ruPosition - 1) * unitHeight;
  const deviceVisualHeight = deviceDetails.ruHeight * unitHeight;
  
  // For simplicity, place all ports on the right edge with a small margin
  const x = rackViewWidth - 10;
  
  // Distribute ports evenly along the device height
  // Adding 1 to denominator and numerator to avoid edges
  const portOffsetY = (portIndex + 1) * (deviceVisualHeight / (deviceDetails.ports.length + 1));
  const y = deviceBottomVisualY + portOffsetY;
  
  return { x, y };
};

export const RackLayoutsTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const [rackProfiles, setRackProfiles] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [rackStats, setRackStats] = useState<{
    totalRU: number;
    usedRU: number;
    availableRU: number;
    utilizationPercentage: number;
    deviceCount: number;
  } | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
  
  // Get the connection data
  const { connections } = useConnectionManager();
  
  // Initialize racks and select the first one
  useEffect(() => {
    if (!activeDesign) {
      setRackProfiles([]); // Clear local racks if no active design
      setSelectedRackId(null);
      return;
    }

    // Use rackProfiles directly from the activeDesign object that triggered this effect.
    const currentDesignRacks = activeDesign.rackProfiles || [];

    if (currentDesignRacks.length === 0) {
      // If the current activeDesign object shows no racks, create one.
      // This will update activeDesign in the store (new reference).
      // The effect will run again due to this new activeDesign reference.
      RackService.createRackProfile("Default Rack");
      // No need to set local state (setRackProfiles/setSelectedRackId) here,
      // as the next run of the effect with the updated activeDesign will handle it.
    } else {
      // Racks exist in the current activeDesign.
      // Update local state based on these racks.
      setRackProfiles(currentDesignRacks.map(rack => ({ id: rack.id, name: rack.name })));

      // If no rack is selected, or if the currently selected rack ID
      // is not found in the currentDesignRacks, select the first available rack.
      const isSelectedRackValid = selectedRackId && currentDesignRacks.some(r => r.id === selectedRackId);
      if (!isSelectedRackValid && currentDesignRacks.length > 0) {
        setSelectedRackId(currentDesignRacks[0].id);
      } else if (currentDesignRacks.length === 0) { 
        setSelectedRackId(null);
      }
    }
  }, [activeDesign]);
  
  // Update rack stats when selected rack changes
  useEffect(() => {
    if (selectedRackId) {
      try {
        const stats = analyzeRackLayout(selectedRackId);
        setRackStats(stats);
      } catch (error) {
        console.error("Error analyzing rack layout:", error);
        setRackStats(null);
      }
    }
  }, [selectedRackId]);
  
  // Define rack view dimensions - could be made dynamic or responsive if needed
  const rackViewHeight = 700;
  const rackViewWidth = 300;
  
  // Calculate lines to draw for each rack based on connections
  const linesToDrawPerRack = useMemo(() => {
    // Initialize empty result object
    const result: Record<string, Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      strokeColor: string;
      strokeWidth: number;
    }>> = {};
    
    // If no active design or no connections, return empty result
    if (!activeDesign || !connections || connections.length === 0) {
      return result;
    }
    
    // Iterate through each rack profile
    activeDesign.rackProfiles?.forEach(rackProfile => {
      const currentRackLines = [];
      const unitHeight = rackViewHeight / rackProfile.uHeight;
      
      // Iterate through each connection
      for (const connection of connections) {
        // Get device and cable details
        const sourceDeviceDetails = activeDesign.components.find(c => c.id === connection.sourceDeviceId);
        const targetDeviceDetails = activeDesign.components.find(c => c.id === connection.destinationDeviceId);
        const cableDetails = activeDesign.components.find(c => c.id === connection.cableId);
        
        if (!sourceDeviceDetails || !targetDeviceDetails || !cableDetails) {
          continue;
        }
        
        // Find placements in current rack
        const sourcePlacement = rackProfile.devices.find(d => d.deviceId === connection.sourceDeviceId);
        const targetPlacement = rackProfile.devices.find(d => d.deviceId === connection.destinationDeviceId);
        
        // Only process if both devices are in this rack (intra-rack connections)
        if (sourcePlacement && targetPlacement) {
          // Calculate visual coordinates for source and target ports
          const sourceCoords = calculatePortVisualXY(
            sourcePlacement,
            connection.sourcePortId,
            sourceDeviceDetails,
            unitHeight,
            rackViewWidth
          );
          
          const targetCoords = calculatePortVisualXY(
            targetPlacement,
            connection.destinationPortId,
            targetDeviceDetails,
            unitHeight,
            rackViewWidth
          );
          
          // Only add line if both coordinates are valid
          if (sourceCoords && targetCoords) {
            // Determine cable color based on type or model
            const strokeColor = cableDetails.model === 'CAT6A' ? '#0FA0CE' : '#8E9196';
            
            // Create the line definition
            currentRackLines.push({
              id: `${connection.cableId}-${connection.sourceDeviceId}-${connection.sourcePortId}`,
              x1: sourceCoords.x,
              y1: sourceCoords.y,
              x2: targetCoords.x,
              y2: targetCoords.y,
              strokeColor,
              strokeWidth: 2
            });
          }
        }
      }
      
      // Add lines for this rack to the result
      result[rackProfile.id] = currentRackLines;
    });
    
    return result;
  }, [activeDesign, connections, rackViewHeight, rackViewWidth]);
  
  const createNewRack = useCallback(() => {
    const rackCount = rackProfiles.length + 1;
    const newRackId = RackService.createRackProfile(`Rack ${rackCount}`);
    setRackProfiles(prev => [...prev, { id: newRackId, name: `Rack ${rackCount}` }]);
    setSelectedRackId(newRackId);
  }, [rackProfiles.length]);

  const handleDeviceClick = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setIsConnectionDialogOpen(true);
  }, []);

  const handleCloseConnectionDialog = useCallback(() => {
    setIsConnectionDialogOpen(false);
    setSelectedDeviceId(null);
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Rack Layouts</h2>
          <p className="text-sm text-muted-foreground">
            Visualize and organize components within racks
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <Select 
            value={selectedRackId || ''}
            onValueChange={(value) => setSelectedRackId(value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a rack" />
            </SelectTrigger>
            <SelectContent>
              {rackProfiles.map(rack => (
                <SelectItem key={rack.id} value={rack.id}>{rack.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={createNewRack}>Add New Rack</Button>
        </div>
        
        {selectedRackId && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Rack visualization - takes 7 columns */}
            <div className="md:col-span-7">
              <div className="flex justify-center">
                <RackView 
                  rackProfileId={selectedRackId}
                  height={rackViewHeight}
                  width={rackViewWidth}
                  showLabels={true}
                  labelInterval={5}
                  onDeviceClick={handleDeviceClick}
                  linesToDraw={linesToDrawPerRack[selectedRackId] || []}
                />
              </div>
            </div>
            
            {/* Device palette and rack info - takes 5 columns */}
            <div className="md:col-span-5">
              <div className="space-y-6">
                {/* Device Palette for drag and drop */}
                <DevicePalette />
                
                {/* Rack Utilization Card */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                      <HardDrive className="h-5 w-5" />
                      Rack Utilization
                    </h3>
                    
                    {rackStats ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">Total RU:</div>
                          <div className="font-medium">{rackStats.totalRU}U</div>
                          
                          <div className="text-muted-foreground">Used RU:</div>
                          <div className="font-medium">{rackStats.usedRU}U</div>
                          
                          <div className="text-muted-foreground">Available RU:</div>
                          <div className="font-medium">{rackStats.availableRU}U</div>
                          
                          <div className="text-muted-foreground">Device Count:</div>
                          <div className="font-medium">{rackStats.deviceCount}</div>
                          
                          <div className="text-muted-foreground">Utilization:</div>
                          <div className="font-medium">{rackStats.utilizationPercentage.toFixed(1)}%</div>
                        </div>
                        
                        {/* Progress bar for utilization */}
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${rackStats.utilizationPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No utilization data available</p>
                    )}
                  </CardContent>
                </Card>
                
                {/* Rack Properties */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-medium text-lg mb-4">Rack Properties</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="rackName">Rack Name</Label>
                        <Input 
                          id="rackName" 
                          value={rackProfiles.find(r => r.id === selectedRackId)?.name || ''}
                          disabled
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connection Management Dialog */}
      <Dialog open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedDeviceId && (
            <ConnectionPanel 
              deviceId={selectedDeviceId}
              onClose={handleCloseConnectionDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </DndProvider>
  );
};
