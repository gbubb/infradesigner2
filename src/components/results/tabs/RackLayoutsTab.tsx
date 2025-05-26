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
import PlacementReportDialog from './rack-layouts/PlacementReportDialog';
import { useDesignStore } from '@/store/designStore';

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
  const [readyToOpenReportDialog, setReadyToOpenReportDialog] = useState(false);
  const [snapshotAzNameMap, setSnapshotAzNameMap] = useState<Record<string, string>>({});
  const [snapshotRackNameMap, setSnapshotRackNameMap] = useState<Record<string, string>>({});
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [isLoadingLayout, setIsLoadingLayout] = useState(false);
  const activeDesign = useDesignStore(state => state.activeDesign);
  const updateDesign = useDesignStore(state => state.updateDesign);
  
  // --- EFFECT TO LOAD SAVED RACK LAYOUTS ON INITIAL MOUNT OR DESIGN CHANGE OR RESET
  useEffect(() => {
    async function initializeLayout() {
      if (!activeDesign) return;
      
      try {
        // Check if racks exist already (they may have just been created by useRackInitialization)
        const existingRacks = activeDesign.rackprofiles || [];
        
        // If we already have racks and this is not caused by a reset, use them
        if (existingRacks.length > 0 && resetTrigger === 0) {
          console.log("Using existing rack layout from design");
          return;
        }

        // Otherwise, try to load from database
        const data = await LayoutPersistenceService.loadLayoutForDesign();
        if (data && data.rackprofiles && Array.isArray(data.rackprofiles) && data.rackprofiles.length > 0) {
          console.log("Loaded saved rack layout from database");
          // Update the active design's rackprofiles with saved layout
          updateDesign(activeDesign.id, { rackprofiles: data.rackprofiles });
        }
        // If database has no racks, useRackInitialization will create new ones
      } catch (error) {
        console.error("Error loading rack layout:", error);
        toast.error("Failed to load rack layout");
      }
    }
    
    initializeLayout();
    // Include resetTrigger in dependencies to re-run on reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDesign?.id, resetTrigger]);

  // Map of AZ/rackId to friendly names (live maps)
  const azNameMap = React.useMemo(() => {
    const m: Record<string, string> = {};
    availabilityZones.forEach(name => {
      m[name] = name; 
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
    } else if (rackProfiles.length > 0 && selectedRackId) {
      // Check if selected rack still exists
      if (!rackProfiles.some(rack => rack.id === selectedRackId)) {
        setSelectedRackId(rackProfiles[0].id);
      }
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
    rack => selectedAZ === 'all' || rack.azName === selectedAZ
  );
  
  const selectedRack = selectedRackId ? rackProfiles.find(r => r.id === selectedRackId) : undefined;

  const handleAutoPlaceDevices = () => {
    setIsAZAssignmentDialogOpen(true);
  };

  const handleConfirmAutoPlacement = () => {
    setIsPlacing(true);

    const report = AutomatedPlacementService.placeAllDesignDevices(undefined, clusterAZAssignments);
    console.log('Generated placement report in RackLayoutsTab:', report); 

    setPlacementReport(report);
    // Capture current maps for the report dialog
    setSnapshotAzNameMap(azNameMap); 
    setSnapshotRackNameMap(rackNameMap);

    setIsPlacing(false);    
    setIsAZAssignmentDialogOpen(false);
    setReadyToOpenReportDialog(true); 
    
    // Show toast if any failed placements
    if (report.failedDevices > 0) {
      toast.error(
        `Auto-placement could not place ${report.failedDevices} device(s). See the Placement Report for details.`
      );
    }

    if (selectedRackId) {
      try {
        const updatedStats = analyzeRackLayout(selectedRackId);
        setRackStats(updatedStats);
      } catch (error) {
        console.error("Error updating rack stats:", error);
      }
    }
  };

  // Effect to open the placement report dialog once the report is ready
  useEffect(() => {
    if (readyToOpenReportDialog && placementReport) {
      setIsPlacementDialogOpen(true);
      setReadyToOpenReportDialog(false); // Reset the trigger
    }
  }, [readyToOpenReportDialog, placementReport]);

  // Save Layout
  const handleSaveLayout = async () => {
    setIsSaving(true);
    try {
      await LayoutPersistenceService.saveCurrentLayout();
      toast.success('Rack layout saved!');
    } catch (error) {
      console.error("Error saving rack layout:", error);
      toast.error("Failed to save rack layout");
    } finally {
      setIsSaving(false);
    }
  }

  // Reset Layout - completely regenerate racks
  const handleResetLayout = async () => {
    setIsResetting(true);
    try {
      await LayoutPersistenceService.resetLayoutToLastSaved();
      // Force useRackInitialization to run again by triggering reset
      setResetTrigger(Date.now());
      toast.success('Rack layout reset!');
      
      // Clear selected rack since it might no longer exist
      setSelectedRackId(null);
    } catch (error) {
      console.error("Error resetting rack layout:", error);
      toast.error("Failed to reset rack layout");
    } finally {
      setIsResetting(false);
    }
  }

  // Load Layout - restore from database
  const handleLoadLayout = async () => {
    setIsLoadingLayout(true);
    try {
      const data = await LayoutPersistenceService.loadLayoutForDesign();
      if (
        data &&
        Array.isArray(data.rackprofiles) &&
        data.rackprofiles.length > 0
      ) {
        // Basic validation: check that loaded racks contain only devices from current active design
        const validDeviceIds = new Set(
          (activeDesign?.components ?? []).map((c) => c.id)
        );
        const isValid = data.rackprofiles.every((rack: any) =>
          (rack.devices ?? []).every((dev: any) => validDeviceIds.has(dev.deviceId))
        );
        if (!isValid) {
          toast.error(
            "The saved rack layout could not be loaded: the state does not match the current configuration (device set has changed)."
          );
          setIsLoadingLayout(false);
          return;
        }
        // Restore racks
        if (activeDesign) {
          updateDesign(activeDesign.id, { rackprofiles: data.rackprofiles });
          toast.success("Rack layout loaded from database!");
        }
      } else {
        toast.error(
          "No saved rack layout found in the database for this design."
        );
      }
    } catch (error) {
      console.error("Error loading rack layout:", error);
      toast.error("Failed to load rack layout: " + (error as Error).message);
    } finally {
      setIsLoadingLayout(false);
    }
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
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex gap-2">
            <Button 
              variant="default"
              onClick={handleAutoPlaceDevices}
              disabled={isPlacing}
            >
              {isPlacing ? "Placing Devices..." : "Auto-Place Devices"}
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleSaveLayout} 
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Layout"}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleResetLayout} 
              disabled={isResetting}
            >
              {isResetting ? "Resetting..." : "Reset Layout"}
            </Button>
            <Button
              variant="outline"
              onClick={handleLoadLayout}
              disabled={isLoadingLayout}
            >
              {isLoadingLayout ? "Loading..." : "Load Layout"}
            </Button>
          </div>
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
        <PlacementReportDialog
          open={isPlacementDialogOpen}
          onOpenChange={(open) => {
            setIsPlacementDialogOpen(open);
            if (!open) {
              setPlacementReport(null); // Clear report when dialog is closed
              // Optionally clear snapshot maps too if they are large and not needed
              // setSnapshotAzNameMap({}); 
              // setSnapshotRackNameMap({});
            }
          }}
          placementReport={placementReport}
          azNameMap={snapshotAzNameMap}
          rackNameMap={snapshotRackNameMap}
        />

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
