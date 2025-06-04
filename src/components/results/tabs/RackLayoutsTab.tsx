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
import { PlacementRulesDialog } from './rack-layouts/PlacementRulesDialog';
import { ClusterAZAssignment } from '@/types/infrastructure/rack-types';
import { LayoutPersistenceService } from '@/services/layoutPersistenceService';
import PlacementReportDialog from './rack-layouts/PlacementReportDialog';
import { useDesignStore } from '@/store/designStore';
import { RackService } from '@/services/rackService';

export const RackLayoutsTab: React.FC = () => {
  // State definitions
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
  const [isPlacementRulesDialogOpen, setIsPlacementRulesDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [scrollStep, setScrollStep] = useState(300);
  const [readyToOpenReportDialog, setReadyToOpenReportDialog] = useState(false);
  const [snapshotAzNameMap, setSnapshotAzNameMap] = useState<Record<string, string>>({});
  const [snapshotRackNameMap, setSnapshotRackNameMap] = useState<Record<string, string>>({});
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [isLoadingLayout, setIsLoadingLayout] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  // Refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const hasUnsavedChangesRef = useRef(false);
  const isNavigatingAwayRef = useRef(false);
  const previousRequirementsHashRef = useRef<string | null>(null);
  const isResettingRef = useRef(false);
  
  // Store hooks
  const activeDesign = useDesignStore(state => state.activeDesign);
  const updateDesign = useDesignStore(state => state.updateDesign);
  
  // Listen for requirements changes (as in Results) for rack re-init
  const requirementsHash = React.useMemo(
    () => JSON.stringify(activeDesign?.requirements || {}),
    [activeDesign?.requirements]
  );
  
  // Initialize racks - now with proper dependencies
  const { rackProfiles, availabilityZones } = useRackInitialization(resetTrigger) as {
    rackProfiles: { id: string; name: string; azName?: string; availabilityZoneId?: string }[];
    availabilityZones: string[]; // Array of availability zone IDs
  };
  
  // Load placement rules from active design
  useEffect(() => {
    if (activeDesign && activeDesign.placementRules) {
      setClusterAZAssignments(activeDesign.placementRules);
    }
  }, [activeDesign]);
  
  // Track previous rack profiles to detect real changes
  const previousRackProfilesRef = useRef<string | null>(null);
  
  // Effect: Auto-save when devices are placed (with 2s debounce)
  useEffect(() => {
    if (!activeDesign || isResettingRef.current) return;
    
    // Serialize current rack profiles for comparison
    const currentRackProfilesStr = JSON.stringify(activeDesign.rackprofiles || []);
    
    // Check if rack profiles actually changed
    if (previousRackProfilesRef.current === currentRackProfilesStr) {
      return; // No real change, skip auto-save
    }
    
    // Update previous rack profiles
    previousRackProfilesRef.current = currentRackProfilesStr;
    
    // Mark as having unsaved changes
    hasUnsavedChangesRef.current = true;

    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!isNavigatingAwayRef.current && hasUnsavedChangesRef.current) { // Only save if we have real changes
        setIsAutoSaving(true);
        try {
          await LayoutPersistenceService.saveCurrentLayout();
          hasUnsavedChangesRef.current = false;
        } catch (error) {
          console.error("Error auto-saving rack layout:", error);
          toast.error("Failed to auto-save rack layout");
        } finally {
          setIsAutoSaving(false);
        }
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [activeDesign]); // Only trigger on rack profile changes

  // Effect: Auto-save when navigating away
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (hasUnsavedChangesRef.current && activeDesign) {
        isNavigatingAwayRef.current = true;
        try {
          await LayoutPersistenceService.saveCurrentLayout();
          hasUnsavedChangesRef.current = false;
        } catch (error) {
          console.error("Error saving rack layout before navigation:", error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeDesign]);

  // Effect: Auto-load when mounting or returning to tab
  useEffect(() => {
    const loadSavedLayout = async () => {
      if (!activeDesign) return;
      
      try {
        const data = await LayoutPersistenceService.loadLayoutForDesign();
        if (data?.rackprofiles?.length > 0) {
          // Only load if requirements haven't changed
          const currentRequirementsHash = JSON.stringify(activeDesign.requirements || {});
          const savedRequirementsHash = JSON.stringify(data.requirements || {});
          
          if (currentRequirementsHash === savedRequirementsHash) {
            // Ensure only valid devices are restored
            const validDeviceIds = new Set(
              (activeDesign?.components ?? []).map((c) => c.id)
            );
            const isValid = data.rackprofiles.every((rack: any) =>
              (rack.devices ?? []).every((dev: any) => validDeviceIds.has(dev.deviceId))
            );
            
            if (isValid) {
              updateDesign(activeDesign.id, { rackprofiles: data.rackprofiles });
              // Don't increment resetTrigger here - we're loading existing racks, not regenerating
              // setResetTrigger(prev => prev + 1);
              setSelectedRackId(null);
              hasUnsavedChangesRef.current = false;
            }
          }
        }
      } catch (error) {
        console.error("Error auto-loading rack layout:", error);
      }
    };

    loadSavedLayout();
  }, [activeDesign?.id]); // Only trigger on design ID change

  // Effect: Only clear and regenerate racks when requirements actually change
  useEffect(() => {
    if (!activeDesign || isResettingRef.current) return;
    
    // Check if requirements actually changed
    if (previousRequirementsHashRef.current !== null && 
        previousRequirementsHashRef.current !== requirementsHash) {
      // Requirements changed - clear racks and force regeneration
      RackService.clearAllRackProfiles();
      setResetTrigger(prev => prev + 1);
      setSelectedRackId(null);
      hasUnsavedChangesRef.current = false;
    }
    
    // Update the previous hash
    previousRequirementsHashRef.current = requirementsHash;
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
          // Don't increment resetTrigger - we want to preserve the loaded layout
          // setResetTrigger(prev => prev + 1);
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
    isResettingRef.current = true;
    try {
      // Clear all racks WITH design update to ensure clean state
      RackService.clearAllRackProfiles(false); // Don't skip - we need clean state
      
      // Wait a tick for the clear to propagate
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Force re-initialization from requirements
      setResetTrigger(prev => prev + 1); // will cause useRackInitialization to re-create the racks
      
      toast.success('Rack layout reset!');
      setSelectedRackId(null);
      hasUnsavedChangesRef.current = false; // Reset unsaved changes
      
      // Allow auto-save to resume after a delay
      setTimeout(() => {
        isResettingRef.current = false;
      }, 500); // Increased delay to ensure initialization completes
    } catch (error) {
      console.error("Error resetting rack layout:", error);
      toast.error("Failed to reset rack layout");
      isResettingRef.current = false;
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
  
  // Filter racks by selected AZ
  const baseFilteredRacks = rackProfiles.filter(
    rack => selectedAZ === 'all' || azNameMap[rack.availabilityZoneId ?? ""] === selectedAZ || rack.azName === selectedAZ
  );

  // Sort racks according to row layout order if available
  const filteredRacks = React.useMemo(() => {
    const rowLayout = activeDesign?.rowLayout;
    
    if (!rowLayout || !rowLayout.rackOrder || rowLayout.rackOrder.length === 0) {
      // No row layout defined, return racks in their original order
      return baseFilteredRacks;
    }
    
    // Create a map for efficient lookup
    const rackMap = new Map(baseFilteredRacks.map(rack => [rack.id, rack]));
    const orderedRacks: typeof baseFilteredRacks = [];
    
    // Add racks in the order defined by row layout
    rowLayout.rackOrder.forEach(rackId => {
      const rack = rackMap.get(rackId);
      if (rack) {
        orderedRacks.push(rack);
        rackMap.delete(rackId); // Remove from map to avoid duplicates
      }
    });
    
    // Add any remaining racks that weren't in the row layout order
    rackMap.forEach(rack => {
      orderedRacks.push(rack);
    });
    
    return orderedRacks;
  }, [baseFilteredRacks, activeDesign?.rowLayout]);
  
  const selectedRack = selectedRackId ? (() => {
    const rack = rackProfiles.find(r => r.id === selectedRackId);
    if (!rack) return undefined;
    
    // Use Row Layout friendly name as the authoritative source
    const rowLayoutProperties = activeDesign?.rowLayout?.rackProperties?.[rack.id];
    const displayName = rowLayoutProperties?.friendlyName || rack.name;
    
    return {
      ...rack,
      name: displayName
    };
  })() : undefined;

  const handleAutoPlaceDevices = () => {
    // Get saved placement rules from active design
    const activeDesign = useDesignStore.getState().activeDesign;
    
    if (!activeDesign || !activeDesign.placementRules || activeDesign.placementRules.length === 0) {
      toast.error("Please configure placement rules first");
      setIsPlacementRulesDialogOpen(true);
      return;
    }
    
    // Convert friendly AZ names back to AZ IDs for placement service
    const placementRulesWithAzIds = activeDesign.placementRules.map(rule => ({
      ...rule,
      selectedAZs: rule.selectedAZs.map(friendlyName => {
        // Find the actual AZ ID that corresponds to this friendly name
        const azEntry = Object.entries(azNameMap).find(([id, name]) => name === friendlyName);
        return azEntry ? azEntry[0] : friendlyName; // fallback to friendly name if not found
      })
    }));
    
    // Use saved placement rules directly
    setClusterAZAssignments(activeDesign.placementRules);
    
    // Execute auto-placement immediately
    setIsPlacing(true);
    
    const report = AutomatedPlacementService.placeAllDesignDevices(undefined, placementRulesWithAzIds);
    console.log('Generated placement report in RackLayoutsTab:', report);
    
    setPlacementReport(report);
    setSnapshotAzNameMap(azNameMap);
    setSnapshotRackNameMap({});
    
    setIsPlacing(false);
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

  // Modify DevicePalette onDevicePlaced callback to set unsaved changes flag
  const handleDevicePlaced = useCallback(() => {
    hasUnsavedChangesRef.current = true;
    // Update rack stats after device placement
    if (selectedRackId) {
      try {
        const updatedStats = analyzeRackLayout(selectedRackId);
        setRackStats(updatedStats);
      } catch (error) {
        console.error("Error updating rack stats:", error);
      }
    }
  }, [selectedRackId]);

  // Modify handleSaveLayout to update the unsaved changes flag
  const handleSaveLayout = async () => {
    setIsSaving(true);
    try {
      await LayoutPersistenceService.saveCurrentLayout();
      hasUnsavedChangesRef.current = false;
      toast.success('Rack layout saved!');
    } catch (error) {
      console.error("Error saving rack layout:", error);
      toast.error("Failed to save rack layout");
    } finally {
      setIsSaving(false);
    }
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
          filteredRacks={filteredRacks.map(rack => {
            // Use friendly name from row layout if available
            const rowLayoutProperties = activeDesign?.rowLayout?.rackProperties?.[rack.id];
            const displayName = rowLayoutProperties?.friendlyName || rack.name;
            
            return {
              ...rack,
              name: displayName
            };
          })}
        />
        
        {/* Horizontal Rack Layout with Scrolling */}
        <RackHorizontalScroller
          racks={filteredRacks.map(rack => {
            // Use friendly name from row layout if available
            const rowLayoutProperties = activeDesign?.rowLayout?.rackProperties?.[rack.id];
            const displayName = rowLayoutProperties?.friendlyName || rack.name;
            
            return {
              id: rack.id,
              name: displayName,
              azName: rack.azName,
              availabilityZoneId: rack.availabilityZoneId
            };
          })}
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
