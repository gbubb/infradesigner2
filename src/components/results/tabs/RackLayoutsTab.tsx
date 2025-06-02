import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { RackService } from '@/services/rackService';

export const RackLayoutsTab: React.FC = () => {
  // EXPLICITLY TYPE rackProfiles for type safety and error prevention
  const { rackProfiles, availabilityZones } = useRackInitialization() as {
    rackProfiles: { id: string; name: string; azName?: string; availabilityZoneId?: string }[];
    availabilityZones: any; // keep as any for now, or string[] if known
  };

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
  
  // Listen for requirements changes (as in Results) for rack re-init
  const requirementsHash = JSON.stringify(activeDesign?.requirements || {});
  
  // Track the previous requirements hash to detect actual changes
  const prevRequirementsHashRef = useRef<string>('');
  
  // Effect: Only clear racks when requirements actually change, not on mount
  useEffect(() => {
    if (!activeDesign) return;
    
    // Check if this is the first load or if requirements actually changed
    const currentHash = requirementsHash;
    const isRequirementsChanged = prevRequirementsHashRef.current !== '' && 
                                prevRequirementsHashRef.current !== currentHash;
    
    // Update the ref for next comparison
    prevRequirementsHashRef.current = currentHash;
    
    // Only clear and regenerate if requirements actually changed
    if (isRequirementsChanged) {
      console.log('Requirements changed, clearing rack layouts');
      RackService.clearAllRackProfiles();
      setResetTrigger(prev => prev + 1);
      setSelectedRackId(null);
    }
  }, [activeDesign?.id, requirementsHash]);

  // --- EFFECT TO LOAD SAVED RACK LAYOUTS ONLY WHEN USER EXPLICITLY ASKS ---
  const handleLoadLayout = async () => {
    setIsLoadingLayout(true);
    try {
      const data = await LayoutPersistenceService.loadLayoutForDesign();
      if (
        data &&
        Array.isArray(data.rackprofiles) &&
        data.rackprofiles.length > 0
      ) {
        // Ensure only valid devices are restored
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
        // Only update the design after loading here
        if (activeDesign) {
          updateDesign(activeDesign.id, { rackprofiles: data.rackprofiles });
          toast.success("Rack layout loaded from database!");
          // Make sure to re-initialize to show loaded racks
          setResetTrigger(prev => prev + 1);
          setSelectedRackId(null);
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
  };

  // --- RESET: Always clear and re-generate from requirements, never reload from DB
  const handleResetLayout = async () => {
    setIsResetting(true);
    try {
      // Just clear all racks and trigger re-init from requirements
      RackService.clearAllRackProfiles();
      setResetTrigger(prev => prev + 1); // will cause useRackInitialization to re-create the racks
      toast.success('Rack layout reset!');
      setSelectedRackId(null);
    } catch (error) {
      console.error("Error resetting rack layout:", error);
      toast.error("Failed to reset rack layout");
    } finally {
      setIsResetting(false);
    }
  };

  // Map of AZ id to friendly names -- always read directly from requirements.physicalConstraints
  const azNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (activeDesign?.requirements?.physicalConstraints?.availabilityZones) {
      activeDesign.requirements.physicalConstraints.availabilityZones.forEach((az: any) => {
        if (az.id && az.name) map[az.id] = az.name;
      });
    }
    rackProfiles.forEach(rp => {
      // fallback for legacy; shouldn't overwrite existing names
      if (rp.availabilityZoneId && rp.azName && !map[rp.availabilityZoneId]) {
        map[rp.availabilityZoneId] = rp.azName;
      }
    });
    return map;
  }, [activeDesign?.requirements?.physicalConstraints?.availabilityZones, rackProfiles]);

  // Get friendly AZ names (for filter dropdown & assignment dialogs)
  const friendlyAzNames = React.useMemo(() => {
    let names: string[] = [];
    const physicalAzs = activeDesign?.requirements?.physicalConstraints?.availabilityZones;

    if (physicalAzs && Array.isArray(physicalAzs) && physicalAzs.length > 0) {
      names = physicalAzs.map((az: any) => az.name).filter(Boolean) as string[];
    } else {
      // Fallback to names found from rack profiles if no AZs are defined in requirements
      names = Array.from(new Set(rackProfiles.map(rp => rp.azName).filter(Boolean) as string[]));
    }

    // Ensure "Core" is present if dedicated core racks are configured in network requirements
    const hasDedicatedCoreRacks = !!activeDesign?.requirements?.networkRequirements?.dedicatedNetworkCoreRacks;
    const coreAzStandardName = "Core";
    const coreAzExists = names.some(name => name.toLowerCase() === coreAzStandardName.toLowerCase());

    if (hasDedicatedCoreRacks && !coreAzExists) {
      names.push(coreAzStandardName); // Add "Core" if it's missing and should be there
    }
    
    // Return unique names, especially if "Core" was added or if there were duplicates from sources
    return Array.from(new Set(names));
  }, [activeDesign?.requirements, rackProfiles]);

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
    rack => selectedAZ === 'all' || azNameMap[rack.availabilityZoneId ?? ""] === selectedAZ || rack.azName === selectedAZ
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
    setSnapshotRackNameMap({}); // Fixed typo: initialize as empty object or implement if needed.

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
          availabilityZones={friendlyAzNames} // Pass array of friendly names, not IDs
          selectedRackId={selectedRackId}
          setSelectedRackId={setSelectedRackId}
          filteredRacks={filteredRacks}
        />
        
        {/* Horizontal Rack Layout with Scrolling */}
        <RackHorizontalScroller
          racks={filteredRacks.map(rack => ({
            id: rack.id,
            name: rack.name,
            azName: rack.azName,
            availabilityZoneId: rack.availabilityZoneId
          }))}
          selectedRackId={selectedRackId}
          setSelectedRackId={setSelectedRackId}
          scrollPosition={scrollPosition}
          setScrollPosition={setScrollPosition}
          scrollStep={scrollStep}
          azNameMap={azNameMap}
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
                azNameMap={azNameMap}
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
          availabilityZones={friendlyAzNames}
          clusterAssignments={clusterAZAssignments}
          setClusterAssignments={setClusterAZAssignments}
          onConfirm={handleConfirmAutoPlacement}
        />
      </div>
    </DndProvider>
  );
};
