
import React, { useState, useEffect, useCallback } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RackView } from '@/components/visualization/RackView';
import { DevicePalette } from '@/components/palette/DevicePalette';
import { ConnectionPanel } from '@/components/visualization/ConnectionPanel';
import { RackService } from '@/services/rackService';
import { analyzeRackLayout } from '@/utils/rackLayoutUtils';
import { HardDrive } from 'lucide-react';
import { toast } from 'sonner';

export const RackLayoutsTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const [rackProfiles, setRackProfiles] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [rackStats, setRackStats] = useState<{
    totalRU: number;
    usedRU: number;
    availableRU: number;
    utilizationPercentage: number;
    deviceCount: number;
  } | null>(null);
  
  // Initialize racks and select the first one - only when activeDesign changes
  useEffect(() => {
    if (!activeDesign) return;
    
    try {
      const allRacks = RackService.getAllRackProfiles();
      
      if (allRacks.length === 0) {
        // Create a default rack if none exists
        const newRackId = RackService.createRackProfile("Default Rack");
        setRackProfiles([{ id: newRackId, name: "Default Rack" }]);
        setSelectedRackId(newRackId);
      } else {
        setRackProfiles(allRacks.map(rack => ({ id: rack.id, name: rack.name })));
        // Only set the selected rack ID if it's not already set
        if (!selectedRackId) {
          setSelectedRackId(allRacks[0].id);
        }
      }
    } catch (error) {
      console.error("Error initializing racks:", error);
      toast.error("Failed to initialize racks");
    }
  }, [activeDesign?.id, selectedRackId]);
  
  // Update rack stats when selected rack changes
  useEffect(() => {
    if (!selectedRackId) return;

    try {
      const stats = analyzeRackLayout(selectedRackId);
      setRackStats(stats);
    } catch (error) {
      console.error("Error analyzing rack layout:", error);
      setRackStats(null);
    }
  }, [selectedRackId]);
  
  // Create a new rack
  const createNewRack = useCallback(() => {
    const rackCount = rackProfiles.length + 1;
    const newRackId = RackService.createRackProfile(`Rack ${rackCount}`);
    setRackProfiles(prev => [...prev, { id: newRackId, name: `Rack ${rackCount}` }]);
    setSelectedRackId(newRackId);
  }, [rackProfiles.length]);

  // Handle device selection
  const handleDeviceSelect = useCallback((deviceId: string) => {
    setSelectedDeviceId(prevId => prevId === deviceId ? null : deviceId);
  }, []);

  // Handle rack selection
  const handleRackChange = useCallback((value: string) => {
    setSelectedRackId(value);
    // Clear selected device when changing racks
    setSelectedDeviceId(null);
  }, []);

  return (
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
          onValueChange={handleRackChange}
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Device Palette */}
          <div className="lg:col-span-1">
            <DevicePalette />
          </div>
          
          {/* Rack View */}
          <div className="lg:col-span-2">
            <div className="flex justify-center">
              <RackView 
                rackProfileId={selectedRackId}
                height={700}
                width={300}
                showLabels={true}
                labelInterval={5}
                onDeviceSelect={handleDeviceSelect}
              />
            </div>
          </div>
          
          {/* Side Panel - Rack Stats and Connection Manager */}
          <div className="lg:col-span-1 space-y-6">
            {/* Rack Stats Card */}
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
            
            {/* Connection Panel */}
            {selectedDeviceId && (
              <ConnectionPanel selectedDeviceId={selectedDeviceId} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
