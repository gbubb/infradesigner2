import React, { useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ConnectionPanel } from '@/components/connections/ConnectionPanel';
import { RackFilterControls } from './rack-layouts/RackFilterControls';
import { RackHorizontalScroller } from './rack-layouts/RackHorizontalScroller';
import { RackDetailView } from './rack-layouts/RackDetailView';
import { useRackInitialization } from './rack-layouts/useRackInitialization';
import { DevicePalette } from '@/components/palette/DevicePalette';
import { Button } from '@/components/ui/button';
import { ClusterAZAssignmentDialog } from './rack-layouts/ClusterAZAssignmentDialog';
import { PlacementRulesDialog } from './rack-layouts/PlacementRulesDialog';
import PlacementReportDialog from './rack-layouts/PlacementReportDialog';
import { useDesignStore } from '@/store/designStore';
import { RackOperationsService } from '@/services/RackOperationsService';
import { RackPDFExport } from './rack-layouts/RackPDFExport';
import { RackProfile } from '@/types/infrastructure/rack-types';
import {
  useRackManagement,
  useDevicePlacement,
  useRackFiltering,
  useRackPersistence,
  useRackScrolling
} from '@/hooks/rack-management';

export const RackLayoutsTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  
  // Initialize persistence hook first to get resetTrigger
  const {
    isSaving,
    isResetting,
    isLoadingLayout,
    isAutoSaving,
    resetTrigger,
    hasUnsavedChangesRef,
    handleSaveLayout,
    handleLoadLayout,
    handleResetLayout,
    markUnsavedChanges
  } = useRackPersistence();
  
  // Initialize racks
  const { rackProfiles, availabilityZones } = useRackInitialization(resetTrigger) as {
    rackProfiles: { id: string; name: string; azName?: string; availabilityZoneId?: string }[];
    availabilityZones: string[];
  };
  
  // Get AZ mappings from service
  const azNameMap = useMemo(() => RackOperationsService.getAzNameMap(rackProfiles as RackProfile[]), [rackProfiles]);
  const friendlyAzNames = useMemo(() => RackOperationsService.getFriendlyAzNames(rackProfiles as RackProfile[]), [rackProfiles]);
  
  // Initialize management hooks
  const {
    selectedRackId,
    setSelectedRackId,
    rackStats,
    selectedRack,
    updateRackStats
  } = useRackManagement(rackProfiles);
  
  const {
    selectedDeviceId,
    isConnectionDialogOpen,
    isPlacementDialogOpen,
    setIsPlacementDialogOpen,
    placementReport,
    setPlacementReport,
    isPlacing,
    isAZAssignmentDialogOpen,
    setIsAZAssignmentDialogOpen,
    clusterAZAssignments,
    setClusterAZAssignments,
    isPlacementRulesDialogOpen,
    setIsPlacementRulesDialogOpen,
    readyToOpenReportDialog,
    setReadyToOpenReportDialog,
    snapshotAzNameMap,
    snapshotRackNameMap,
    handleDeviceClick,
    handleCloseConnectionDialog,
    handleDevicePlaced,
    handleAutoPlaceDevices,
    handleConfirmAutoPlacement
  } = useDevicePlacement();
  
  const {
    selectedAZ,
    setSelectedAZ,
    filteredRacks,
    getDisplayRacks
  } = useRackFiltering(rackProfiles, azNameMap);
  
  const {
    scrollPosition,
    setScrollPosition,
    scrollStep
  } = useRackScrolling();
  
  // Load placement rules from active design
  useEffect(() => {
    const rules = RackOperationsService.loadPlacementRules();
    setClusterAZAssignments(rules);
  }, [activeDesign, setClusterAZAssignments]);
  
  // Wrapped handlers to call updateRackStats after placement
  const handleAutoPlaceDevicesWrapper = () => {
    handleAutoPlaceDevices(azNameMap);
    updateRackStats();
  };
  
  const handleConfirmAutoPlacementWrapper = () => {
    handleConfirmAutoPlacement(azNameMap);
    updateRackStats();
  };

  // Effect to open the placement report dialog once the report is ready
  useEffect(() => {
    if (readyToOpenReportDialog && placementReport) {
      setIsPlacementDialogOpen(true);
      setReadyToOpenReportDialog(false);
    }
  }, [readyToOpenReportDialog, placementReport, setIsPlacementDialogOpen, setReadyToOpenReportDialog]);
  
  // Device placement callback with stats update
  const handleDevicePlacedWrapper = () => {
    markUnsavedChanges();
    handleDevicePlaced(updateRackStats);
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
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setIsPlacementRulesDialogOpen(true)}
            >
              Placement Rules
            </Button>
            <Button 
              variant="default"
              onClick={handleAutoPlaceDevicesWrapper}
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
          <div>
            <RackPDFExport
              rackProfiles={getDisplayRacks}
              azNameMap={azNameMap}
              selectedRackId={selectedRackId}
            />
          </div>
        </div>
        
        {/* Filter controls */}
        <RackFilterControls
          selectedAZ={selectedAZ}
          setSelectedAZ={setSelectedAZ}
          availabilityZones={friendlyAzNames}
          selectedRackId={selectedRackId}
          setSelectedRackId={setSelectedRackId}
          filteredRacks={getDisplayRacks}
        />
        
        {/* Horizontal Rack Layout with Scrolling */}
        <RackHorizontalScroller
          racks={getDisplayRacks.map(rack => ({
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
            <DevicePalette 
              rackId={selectedRackId || undefined} 
              onDevicePlaced={handleDevicePlacedWrapper} 
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
          onConfirm={handleConfirmAutoPlacementWrapper}
        />
        
        {/* Placement Rules Dialog */}
        <PlacementRulesDialog
          open={isPlacementRulesDialogOpen}
          onOpenChange={setIsPlacementRulesDialogOpen}
          availabilityZones={friendlyAzNames}
        />

        {/* Add auto-save indicator */}
        {isAutoSaving && (
          <div className="fixed bottom-4 right-4 bg-background border rounded-md shadow-md px-4 py-2 text-sm text-muted-foreground">
            Auto-saving...
          </div>
        )}
      </div>
    </DndProvider>
  );
};
