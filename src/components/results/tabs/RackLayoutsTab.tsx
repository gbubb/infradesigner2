
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
  const [placementReport, setPlacementReport] = useState<any | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const scrollStep = 300;
  
  // Set initial selected rack when rack profiles are loaded
  useEffect(() => {
    if (rackProfiles.length > 0 && !selectedRackId) {
      setSelectedRackId(rackProfiles[0].id);
    }
  }, [rackProfiles, selectedRackId]);
  
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

  // Simplified device click handler
  const handleDeviceClick = useCallback((deviceId: string) => {
    console.log("Device clicked:", deviceId);
    setSelectedDeviceId(deviceId);
    setIsConnectionDialogOpen(true);
  }, []);

  // Simplified dialog close handler
  const handleCloseConnectionDialog = useCallback(() => {
    setIsConnectionDialogOpen(false);
    // Don't immediately clear the selectedDeviceId
  }, []);
  
  const filteredRacks = rackProfiles.filter(
    rack => selectedAZ === 'all' || rack.availabilityZoneId === selectedAZ
  );
  
  const selectedRack = selectedRackId ? rackProfiles.find(r => r.id === selectedRackId) : undefined;

  const handleAutoPlaceDevices = () => {
    // Simplified auto-place function
    toast.info("Auto-placement disabled for debugging");
  };

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
            <DevicePalette rackId={selectedRackId || undefined} />
          </div>

          {/* Rack detail view - takes 3/4 of the space (now on the right) */}
          <div className="md:col-span-3">
            {selectedRackId && (
              <RackDetailView
                rackProfileId={selectedRackId}
                onDeviceClick={handleDeviceClick}
                rackStats={rackStats}
                selectedRack={selectedRack}
              />
            )}
            {!selectedRackId && (
              <div className="flex items-center justify-center h-[700px] border rounded-md bg-muted/20">
                <p className="text-muted-foreground">Select a rack to view details.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ultra simplified Connection Dialog */}
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
      
      {/* Placement Report Dialog - simplified */}
      <AlertDialog open={isPlacementDialogOpen} onOpenChange={setIsPlacementDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Device Placement Report</AlertDialogTitle>
            <AlertDialogDescription>
              Simplified for debugging
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndProvider>
  );
};
