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
  AlertDialogCancel,
  AlertDialogAction 
} from '@/components/ui/alert-dialog';
import { AutomatedPlacementService, PlacementReport } from '@/services/automatedPlacementService';
import { ClusterAZAssignmentDialog } from './rack-layouts/ClusterAZAssignmentDialog';
import { ClusterAZAssignment } from '@/types/infrastructure/rack-types';
import { LayoutPersistenceService } from '@/services/layoutPersistenceService';

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
  const [isAZAssignmentDialogOpen, setIsAZAssignmentDialogOpen] = useState(false);
  const [clusterAZAssignments, setClusterAZAssignments] = useState<ClusterAZAssignment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [scrollStep, setScrollStep] = useState(300);
  
  // Map of AZ/rackId to friendly names
  const azNameMap = React.useMemo(() => {
    const m: Record<string, string> = {};
    availabilityZones.forEach(name => {
      m[name] = name; // If using AZ struct with .id/.name, update this logic
    });
    rackProfiles.forEach(rp => {
      if (rp.availabilityZoneId && rp.azName)
        m[rp.availabilityZoneId] = rp.azName;
    });
    return m;
  }, [availabilityZones, rackProfiles]);
  const rackNameMap = React.useMemo(() => {
    const m: Record<string, string> = {};
    rackProfiles.forEach(rp => { m[rp.id] = rp.name; });
    return m;
  }, [rackProfiles]);

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
  
  const selectedRack = selectedRackId ? rackProfiles.find(r => r.id === selectedRackId) : undefined;

  const handleAutoPlaceDevices = () => {
    // Open the AZ assignment dialog first
    setIsAZAssignmentDialogOpen(true);
  };

  const handleConfirmAutoPlacement = () => {
    setIsPlacing(true);
    
    // Pass cluster AZ assignments to the placement service
    const report = AutomatedPlacementService.placeAllDesignDevices(undefined, clusterAZAssignments);
    setPlacementReport(report);
    setIsPlacementDialogOpen(true);
    setIsPlacing(false);
    
    // Update rack stats for the selected rack
    if (selectedRackId) {
      try {
        const updatedStats = analyzeRackLayout(selectedRackId);
        setRackStats(updatedStats);
      } catch (error) {
        console.error("Error updating rack stats:", error);
      }
    }
  };

  // Loading saved layout
  useEffect(() => {
    async function loadLayout() {
      if (!selectedRackId) return;
      const data = await LayoutPersistenceService.loadLayoutForDesign();
      if (data?.rackprofiles) {
        // Overwrite racks/devices with loaded layout
        // (could replace rackprofile state or trigger reload with newly loaded data)
      }
    }
    loadLayout();
  }, [selectedRackId]);

  // Save Layout
  const handleSaveLayout = async () => {
    setIsSaving(true);
    await LayoutPersistenceService.saveCurrentLayout();
    toast.success('Rack layout saved!');
    setIsSaving(false);
  }

  // Reset Layout
  const handleResetLayout = async () => {
    setIsResetting(true);
    await LayoutPersistenceService.resetLayoutToLastSaved();
    toast.success('Rack layout reset to last saved version!');
    setIsResetting(false);
  }

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
        <div className="flex justify-between items-center gap-2">
          <Button 
            variant="default"
            onClick={handleAutoPlaceDevices}
            disabled={isPlacing}
          >
            {isPlacing ? "Placing Devices..." : "Auto-Place Devices"}
          </Button>
          <Button variant="secondary" onClick={handleSaveLayout} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Layout"}
          </Button>
          <Button variant="destructive" onClick={handleResetLayout} disabled={isResetting}>
            {isResetting ? "Resetting..." : "Reset Layout"}
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
            <DevicePalette rackId={selectedRackId || undefined} onDevicePlaced={() => {
              // Update rack stats after device placement
              if (selectedRackId) {
                try {
                  const updatedStats = analyzeRackLayout(selectedRackId);
                  setRackStats(updatedStats);
                } catch (error) {
                  console.error("Error updating rack stats:", error);
                }
              }
            }} />
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
          <AlertDialogContent className="max-w-[700px] w-[700px] max-h-[80vh] overflow-y-auto relative px-0">
            <button
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 z-10 text-2xl"
              style={{ lineHeight: 1, background: "transparent", border: "none", cursor: "pointer" }}
              onClick={() => setIsPlacementDialogOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <AlertDialogHeader className="px-6">
              <AlertDialogTitle>Device Placement Report</AlertDialogTitle>
              <AlertDialogDescription>
                {/* Only inline or short summary text should go here */}
                {placementReport && (
                  <>
                    Total devices processed: <span className="font-bold">{placementReport.totalDevices}</span>
                    {" | "}Successfully placed: <span className="text-green-600 font-bold">{placementReport.placedDevices}</span>
                    {" | "}Failed to place: <span className="text-red-600 font-bold">{placementReport.failedDevices}</span>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {/* Move the table and detailed info OUT of AlertDialogDescription! */}
            {placementReport && (
              <div className="space-y-4 px-6 pb-3">
                <div className="border rounded-md overflow-hidden w-full">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {placementReport.items.map((item, index) => (
                        <tr key={index} className={item.status === "failed" ? "bg-red-50" : ""}>
                          <td className="px-4 py-2 text-sm">
                            {item.deviceName}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {item.instanceName}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.status === "placed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}>
                              {item.status === "placed" ? "Placed" : "Failed"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {item.status === "placed" ? (
                              <span>
                                AZ: {azNameMap[item.azId] || item.azId} | Rack: {rackNameMap[item.rackId] || item.rackId} | Position: {item.ruPosition}
                              </span>
                            ) : (
                              <span className="text-red-600">{item.reason}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <AlertDialogFooter className="px-6">
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cluster AZ Assignment Dialog */}
        <ClusterAZAssignmentDialog
          open={isAZAssignmentDialogOpen}
          onOpenChange={setIsAZAssignmentDialogOpen}
          availabilityZones={availabilityZones}
          clusterAssignments={clusterAZAssignments}
          setClusterAssignments={setClusterAZAssignments}
          onConfirm={handleConfirmAutoPlacement}
        />
      </div>
    </DndProvider>
  );
};
