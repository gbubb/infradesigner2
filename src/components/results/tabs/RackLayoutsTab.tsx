
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { analyzeRackLayout } from '@/utils/rackLayoutUtils';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ConnectionPanel } from '@/components/connections/ConnectionPanel';
import { RackFilterControls } from './rack-layouts/RackFilterControls';
import { RackHorizontalScroller } from './rack-layouts/RackHorizontalScroller';
import { RackDetailView } from './rack-layouts/RackDetailView';
import { useRackInitialization } from './rack-layouts/useRackInitialization';
import { DevicePalette } from '@/components/palette/DevicePalette';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogCancel 
} from '@/components/ui/alert-dialog';
import { AutomatedPlacementService, PlacementReport } from '@/services/automatedPlacementService';
import { RackProfile } from '@/types/infrastructure/rack-types';

export const RackLayoutsTab: React.FC = () => {
  const { rackProfiles, availabilityZones } = useRackInitialization();
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
  const [selectedAZ, setSelectedAZ] = useState<string | 'all'>('all');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isPlacementDialogOpen, setIsPlacementDialogOpen] = useState(false);
  const [placementReport, setPlacementReport] = useState<PlacementReport | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const scrollStep = 300;
  
  // Set initial selected rack when rack profiles are loaded
  useEffect(() => {
    if (rackProfiles.length > 0 && !selectedRackId) {
      setSelectedRackId(rackProfiles[0].id);
    }
  }, [rackProfiles, selectedRackId]);
  
  // Update rack stats when selected rack changes or when devices are added/removed
  const updateRackStats = useCallback(() => {
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
  
  // Initial stats load when rack changes
  useEffect(() => {
    updateRackStats();
  }, [updateRackStats, selectedRackId]);

  // Device click handler
  const handleDeviceClick = useCallback((deviceId: string) => {
    console.log("Device clicked:", deviceId);
    setSelectedDeviceId(deviceId);
    setIsConnectionDialogOpen(true);
  }, []);

  // Dialog close handler
  const handleCloseConnectionDialog = useCallback(() => {
    setIsConnectionDialogOpen(false);
  }, []);
  
  const filteredRacks = rackProfiles.filter(
    rack => selectedAZ === 'all' || rack.availabilityZoneId === selectedAZ
  );
  
  // Find the currently selected rack from the profiles
  const selectedRack = selectedRackId 
    ? rackProfiles.find(r => r.id === selectedRackId) as unknown as RackProfile 
    : undefined;

  // Re-enable auto-placement functionality
  const handleAutoPlaceDevices = async () => {
    if (isPlacing) return;
    
    setIsPlacing(true);
    toast.info("Starting automated device placement...");
    
    try {
      // Run the automated placement service
      const report = AutomatedPlacementService.placeAllDesignDevices();
      
      setPlacementReport(report);
      setIsPlacementDialogOpen(true);
      
      // Update rack stats after placement
      updateRackStats();
      
      if (report.success) {
        toast.success(`Placed ${report.placedDevices} devices successfully`);
      } else {
        toast.error(`Placed ${report.placedDevices} devices, but failed to place ${report.failedDevices} devices`);
      }
    } catch (error) {
      console.error("Error in automated placement:", error);
      toast.error("Failed to execute automated placement");
    } finally {
      setIsPlacing(false);
    }
  };

  // Handler for device placement events to update rack stats
  const handleDevicePlaced = useCallback(() => {
    console.log("Device placement detected, updating rack stats");
    updateRackStats();
  }, [updateRackStats]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Rack Layouts</h2>
          <p className="text-sm text-muted-foreground">
            Visualize and organize components within racks grouped by availability zones
          </p>
        </div>
        
        {/* Actions Row */}
        <div className="flex justify-between items-center">
          <Button 
            variant="default"
            onClick={handleAutoPlaceDevices}
            disabled={isPlacing}
          >
            {isPlacing ? "Placing Devices..." : "Auto-Place Devices"}
          </Button>
        </div>
        
        {/* Filter controls */}
        <RackFilterControls
          selectedAZ={selectedAZ}
          setSelectedAZ={setSelectedAZ}
          availabilityZones={availabilityZones}
          selectedRackId={selectedRackId}
          setSelectedRackId={setSelectedRackId}
          filteredRacks={filteredRacks}
        />
        
        {/* Horizontal Rack Layout with Scrolling */}
        <RackHorizontalScroller
          racks={filteredRacks}
          selectedRackId={selectedRackId}
          setSelectedRackId={setSelectedRackId}
          scrollPosition={scrollPosition}
          setScrollPosition={setScrollPosition}
          scrollStep={scrollStep}
        />
        
        {/* Main content area with device palette and rack view/details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Device palette - takes 1/4 of the space (now on the left) */}
          <div className="md:col-span-1">
            <DevicePalette 
              rackId={selectedRackId || undefined} 
              onDevicePlaced={handleDevicePlaced}
            />
          </div>

          {/* Rack detail view - takes 3/4 of the space (now on the right) */}
          <div className="md:col-span-3">
            {selectedRackId && (
              <RackDetailView
                rackProfileId={selectedRackId}
                onDeviceClick={handleDeviceClick}
                rackStats={rackStats}
                selectedRack={selectedRack}
                onDevicePlaced={handleDevicePlaced}
              />
            )}
            {!selectedRackId && (
              <div className="flex items-center justify-center h-[700px] border rounded-md bg-muted/20">
                <p className="text-muted-foreground">Select a rack to view details.</p>
              </div>
            )}
          </div>
        </div>

        {/* Connection Dialog */}
        {isConnectionDialogOpen && selectedDeviceId && (
          <Dialog 
            open={isConnectionDialogOpen} 
            onOpenChange={(open) => {
              if (!open) handleCloseConnectionDialog();
            }}
          >
            <DialogContent className="sm:max-w-[600px]">
              <ConnectionPanel 
                deviceId={selectedDeviceId}
                onClose={handleCloseConnectionDialog}
              />
            </DialogContent>
          </Dialog>
        )}
        
        {/* Placement Report Dialog */}
        <AlertDialog open={isPlacementDialogOpen} onOpenChange={setIsPlacementDialogOpen}>
          <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Device Placement Report</AlertDialogTitle>
              <AlertDialogDescription>
                {placementReport && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-lg">
                      Status: 
                      {placementReport.success ? (
                        <span className="text-green-500 font-medium">Successful</span>
                      ) : (
                        <span className="text-amber-500 font-medium">Partial Success</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-muted rounded">
                        <div className="text-sm font-medium">Total Devices</div>
                        <div className="text-xl">{placementReport.totalDevices}</div>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <div className="text-sm font-medium">Successfully Placed</div>
                        <div className="text-xl text-green-500">{placementReport.placedDevices}</div>
                      </div>
                      {placementReport.failedDevices > 0 && (
                        <div className="p-2 bg-muted rounded col-span-2">
                          <div className="text-sm font-medium">Failed Placements</div>
                          <div className="text-xl text-amber-500">{placementReport.failedDevices}</div>
                        </div>
                      )}
                    </div>
                    
                    {placementReport.items && placementReport.items.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Placement Details</h4>
                        <div className="max-h-[400px] overflow-y-auto border rounded-md">
                          {placementReport.items.map((item, index) => (
                            <div key={index} className={`p-2 border-b ${
                              item.status === "placed" ? "bg-green-50" : "bg-amber-50"
                            }`}>
                              <div className="flex justify-between">
                                <span className="font-medium">{item.deviceName}</span>
                                <span>{item.status === "placed" ? "✅ Placed" : "⚠️ Failed"}</span>
                              </div>
                              {item.status === "placed" && (
                                <div className="text-xs text-slate-500">
                                  Placed in rack at position {item.ruPosition}
                                </div>
                              )}
                              {item.status === "failed" && item.reason && (
                                <div className="text-xs text-slate-500">
                                  Reason: {item.reason}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!placementReport && "No placement report available."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DndProvider>
  );
};
