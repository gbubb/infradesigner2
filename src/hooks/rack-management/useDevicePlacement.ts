import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { AutomatedPlacementService, PlacementReport } from '@/services/automatedPlacementService';
import { ClusterAZAssignment } from '@/types/infrastructure/rack-types';
import { useDesignStore } from '@/store/designStore';

export function useDevicePlacement() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
  const [isPlacementDialogOpen, setIsPlacementDialogOpen] = useState(false);
  const [placementReport, setPlacementReport] = useState<PlacementReport | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isAZAssignmentDialogOpen, setIsAZAssignmentDialogOpen] = useState(false);
  const [clusterAZAssignments, setClusterAZAssignments] = useState<ClusterAZAssignment[]>([]);
  const [isPlacementRulesDialogOpen, setIsPlacementRulesDialogOpen] = useState(false);
  const [readyToOpenReportDialog, setReadyToOpenReportDialog] = useState(false);
  const [snapshotAzNameMap, setSnapshotAzNameMap] = useState<Record<string, string>>({});
  const [snapshotRackNameMap, setSnapshotRackNameMap] = useState<Record<string, string>>({});
  
  const hasUnsavedChangesRef = useRef(false);

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

  // Handle device placement (callback for DevicePalette)
  const handleDevicePlaced = useCallback((onStatsUpdate?: () => void) => {
    hasUnsavedChangesRef.current = true;
    // Update rack stats after device placement
    if (onStatsUpdate) {
      onStatsUpdate();
    }
  }, []);

  // Auto-place devices with saved placement rules
  const handleAutoPlaceDevices = useCallback((azNameMap: Record<string, string>) => {
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
    
    // Execute auto-placement immediately - clear existing placements first
    setIsPlacing(true);
    
    console.log('[useDevicePlacement] Starting auto-placement...');
    const report = AutomatedPlacementService.placeAllDesignDevices(undefined, placementRulesWithAzIds, true);
    console.log('[useDevicePlacement] Generated placement report:', report);
    
    setPlacementReport(report);
    setSnapshotAzNameMap(azNameMap);
    setSnapshotRackNameMap({});
    
    setIsPlacing(false);
    setReadyToOpenReportDialog(true);
    console.log('[useDevicePlacement] Auto-placement complete, ready to show dialog');
    
    // Show toast if any failed placements
    if (report.failedDevices > 0) {
      toast.error(
        `Auto-placement could not place ${report.failedDevices} device(s). See the Placement Report for details.`
      );
    }
  }, []);

  // Confirm auto-placement after AZ assignment
  const handleConfirmAutoPlacement = useCallback((azNameMap: Record<string, string>) => {
    setIsPlacing(true);

    const report = AutomatedPlacementService.placeAllDesignDevices(undefined, clusterAZAssignments, true);
    console.log('Generated placement report in RackLayoutsTab:', report); 

    setPlacementReport(report);
    // Capture current maps for the report dialog
    setSnapshotAzNameMap(azNameMap); 
    setSnapshotRackNameMap({});

    setIsPlacing(false);    
    setIsAZAssignmentDialogOpen(false);
    setReadyToOpenReportDialog(true); 
    
    // Show toast if any failed placements
    if (report.failedDevices > 0) {
      toast.error(
        `Auto-placement could not place ${report.failedDevices} device(s). See the Placement Report for details.`
      );
    }
  }, [clusterAZAssignments]);

  return {
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
    hasUnsavedChangesRef,
    handleDeviceClick,
    handleCloseConnectionDialog,
    handleDevicePlaced,
    handleAutoPlaceDevices,
    handleConfirmAutoPlacement
  };
}