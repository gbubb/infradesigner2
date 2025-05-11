import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { analyzeRackLayout } from '@/utils/rackLayoutUtils';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ConnectionPanel } from '@/components/connections/ConnectionPanel';
import { RackFilterControls } from './rack-layouts/RackFilterControls';
import { RackHorizontalScroller } from './rack-layouts/RackHorizontalScroller';
import { RackDetailView } from './rack-layouts/RackDetailView';
import { useRackInitialization, RackProfileInitializationData } from './rack-layouts/useRackInitialization';
import { DevicePalette } from '@/components/palette/DevicePalette';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AutomatedPlacementService, PlacementReport } from '@/services/automatedPlacementService';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogCancel 
} from '@/components/ui/alert-dialog';
import { useDesignStore } from '@/store/designStore';
import { StoreState } from '@/store/types';
import { InfrastructureComponent } from '@/types/infrastructure';
import { useConnectionManager } from '@/hooks/design/useConnectionManager';

// Selector and equality function for designComponents (used by ConnectionPanel via props)
const panelSelector = (state: StoreState) => state.activeDesign?.components || [];
const componentsEqualityFn = (oldComponents: InfrastructureComponent[], newComponents: InfrastructureComponent[]): boolean => {
  if (oldComponents === newComponents) return true;
  if (oldComponents.length !== newComponents.length) return false;
  return JSON.stringify(oldComponents) === JSON.stringify(newComponents);
};

export const RackLayoutsTab: React.FC = () => {
  const { rackProfiles: initializedRackProfiles, availabilityZones: initializedAzNames } = useRackInitialization();
  const activeDesignFromStore = useDesignStore(state => state.activeDesign);

  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [rackStats, setRackStats] = useState<any | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
  const [selectedAZ, setSelectedAZ] = useState<string | 'all'>('all');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isPlacementDialogOpen, setIsPlacementDialogOpen] = useState(false);
  const [placementReport, setPlacementReport] = useState<PlacementReport | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const scrollStep = 300;
  const testDeviceId = "test-device-id-for-debug"; // Hardcoded ID for testing
  
  // Data for ConnectionPanel (hoisted from ConnectionPanel)
  const designComponentsForPanel = useDesignStore(panelSelector, componentsEqualityFn);
  const connectionManagerData = useConnectionManager();

  useEffect(() => {
    const currentRackProfilesSource = activeDesignFromStore?.rackProfiles || initializedRackProfiles;
    if (currentRackProfilesSource.length > 0 && 
        (!selectedRackId || !currentRackProfilesSource.find(r => r.id === selectedRackId))) {
      setSelectedRackId(currentRackProfilesSource[0].id);
    } else if (currentRackProfilesSource.length === 0 && selectedRackId) {
      setSelectedRackId(null);
    }
  }, [activeDesignFromStore?.rackProfiles, initializedRackProfiles, selectedRackId]);
  
  useEffect(() => {
    if (selectedRackId && activeDesignFromStore) {
      try {
        const stats = analyzeRackLayout(selectedRackId);
        setRackStats(stats);
      } catch (error) {
        console.error(`Error analyzing rack layout for ${selectedRackId}:`, error);
        setRackStats(null);
      }
    } else {
      setRackStats(null);
    }
  }, [selectedRackId, activeDesignFromStore]);

  const handleDeviceClick = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setIsConnectionDialogOpen(true);
  }, []);

  const handleCloseConnectionDialog = useCallback(() => {
    setIsConnectionDialogOpen(false);
    setSelectedDeviceId(null);
  }, []);
  
  const currentDisplayRackProfiles = useMemo((): RackProfileInitializationData[] => {
    const profilesFromStore = activeDesignFromStore?.rackProfiles;
    if (profilesFromStore) {
      return profilesFromStore.map(r => ({
        id: r.id,
        name: r.name,
        azName: initializedRackProfiles.find(irp => irp.availabilityZoneId === r.availabilityZoneId)?.azName || 
                initializedAzNames.find(azName => azName === r.availabilityZoneId) ||
                r.availabilityZoneId || 
                (r.rackType === 'Core' ? 'Core' : 'Unknown AZ'),
        availabilityZoneId: r.availabilityZoneId,
        rackType: r.rackType
      }));
    }
    return initializedRackProfiles;
  }, [activeDesignFromStore?.rackProfiles, initializedRackProfiles, initializedAzNames]);

  const uniqueAzNamesForFilter = useMemo(() => {
    return [...new Set(currentDisplayRackProfiles.map(r => r.azName).filter(Boolean))] as string[];
  }, [currentDisplayRackProfiles]);

  const filteredRacks = useMemo(() => currentDisplayRackProfiles.filter(
    rack => selectedAZ === 'all' || rack.availabilityZoneId === selectedAZ || rack.azName === selectedAZ
  ), [currentDisplayRackProfiles, selectedAZ]);
  
  const selectedRackDetails = useMemo(() => currentDisplayRackProfiles.find(r => r.id === selectedRackId), [currentDisplayRackProfiles, selectedRackId]);

  const handleAutoPlaceDevices = () => {
    setIsPlacing(true);
    
    try {
      const report = AutomatedPlacementService.placeAllDesignDevices();
      setPlacementReport(report);
      setIsPlacementDialogOpen(true);
      
      if (report.success) {
        toast.success(`Successfully placed ${report.placedDevices} devices`);
      } else {
        toast.warning(`Placed ${report.placedDevices} devices, but ${report.failedDevices} failed`);
      }
    } catch (error) {
      console.error("Error during auto-placement:", error);
      toast.error("An error occurred during auto-placement");
    } finally {
      setIsPlacing(false);
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
          availabilityZones={uniqueAzNamesForFilter}
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
                selectedRack={selectedRackDetails}
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

      {/* Connection Management Dialog */}
      <Dialog 
        open={isConnectionDialogOpen} 
        // onOpenChange={setIsConnectionDialogOpen} // Temporarily remove onOpenChange
      >
        <DialogContent className="sm:max-w-[600px]">
          {selectedDeviceId && (
            <ConnectionPanel 
              deviceId={selectedDeviceId}
              onClose={handleCloseConnectionDialog}
              // Pass data from hoisted hooks
              designComponents={designComponentsForPanel}
              connections={connectionManagerData.connections}
              addConnection={connectionManagerData.addConnection}
              removeConnection={connectionManagerData.removeConnection}
              // getConnectedPort will be defined inside ConnectionPanel using these props
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Placement Report Dialog */}
      <AlertDialog open={isPlacementDialogOpen} onOpenChange={setIsPlacementDialogOpen}>
        <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Device Placement Report</AlertDialogTitle>
            <AlertDialogDescription>
              Results of automated device placement
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {placementReport && (
            <div className="py-4">
              <div className="flex justify-between mb-4">
                <span>Total devices: {placementReport.totalDevices}</span>
                <span className="text-green-600">Placed: {placementReport.placedDevices}</span>
                <span className="text-red-600">Failed: {placementReport.failedDevices}</span>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rack</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AZ</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {placementReport.items.map((item, index) => (
                      <tr key={index} className={item.status === 'failed' ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.deviceName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold 
                            ${item.status === 'placed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.rackId ? currentDisplayRackProfiles.find(r => r.id === item.rackId)?.name : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.ruPosition || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.azId ? (item.azId === 'default' ? 'Default' : currentDisplayRackProfiles.find(r => r.availabilityZoneId === item.azId)?.azName || item.azId) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {item.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndProvider>
  );
};
