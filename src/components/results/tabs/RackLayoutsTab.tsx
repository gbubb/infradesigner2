import React, { useState, useEffect, useCallback } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RackView } from '@/components/visualization/RackView';
import { RackService } from '@/services/rackService';
import { analyzeRackLayout } from '@/utils/rackLayoutUtils';
import { HardDrive, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import { DevicePalette } from '@/components/palette/DevicePalette';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ConnectionPanel } from '@/components/connections/ConnectionPanel';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ComponentType } from '@/types/infrastructure/component-types';
import { DeviceRoleType } from '@/types/infrastructure/requirements-types';
import { toast } from 'sonner';

export const RackLayoutsTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const [rackProfiles, setRackProfiles] = useState<Array<{ id: string; name: string; azName: string }>>([]);
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
  const [availabilityZones, setAvailabilityZones] = useState<string[]>([]);
  const [selectedAZ, setSelectedAZ] = useState<string | 'all'>('all');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const scrollStep = 300;
  
  // Initialize racks based on requirements - only run once when component mounts
  useEffect(() => {
    // Skip if already initialized or no active design
    if (initialized || !activeDesign) return;
    
    // Clear existing racks
    RackService.clearAllRackProfiles();
    
    // Calculate number of racks needed based on requirements
    const azCount = activeDesign.requirements.physicalConstraints.totalAvailabilityZones || 3;
    const computeRacksPerAZ = Math.ceil((activeDesign.requirements.physicalConstraints.computeStorageRackQuantity || 6) / azCount);
    const networkCoreRackQuantity = activeDesign.requirements.physicalConstraints.networkCoreRackQuantity || 
      (activeDesign.requirements.networkRequirements.dedicatedNetworkCoreRacks ? 2 : 0);
    
    const newRacks = [];
    const newAvailabilityZones = [];
    
    // Create availability zones
    for (let az = 1; az <= azCount; az++) {
      const azName = `AZ${az}`;
      newAvailabilityZones.push(azName);
      
      // Create compute/storage racks for this AZ
      for (let rack = 1; rack <= computeRacksPerAZ; rack++) {
        const rackName = `${azName}-Rack${rack}`;
        const rackId = RackService.createRackProfile(rackName);
        newRacks.push({ id: rackId, name: rackName, azName });
      }
    }
    
    // Create network core racks if needed
    if (networkCoreRackQuantity > 0) {
      for (let i = 1; i <= networkCoreRackQuantity; i++) {
        const rackName = `Core-Rack${i}`;
        const rackId = RackService.createRackProfile(rackName);
        newRacks.push({ id: rackId, name: rackName, azName: 'Core' });
      }
      
      // Add Core as a separate "AZ" for filtering
      newAvailabilityZones.push('Core');
    }
    
    setRackProfiles(newRacks);
    setAvailabilityZones(newAvailabilityZones);
    
    if (newRacks.length > 0) {
      setSelectedRackId(newRacks[0].id);
    }
    
    // Distribute components across racks
    distributeComponentsAcrossRacks(newRacks);
    
    // Mark as initialized to prevent re-running
    setInitialized(true);
    
  }, [activeDesign, initialized]);
  
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

  // Separate effect for resetting initialization if design changes
  useEffect(() => {
    // If activeDesign ID changes, allow re-initialization
    return () => {
      setInitialized(false);
    };
  }, [activeDesign?.id]);
  
  // Distribute components across racks based on role and AZ
  const distributeComponentsAcrossRacks = (racks: Array<{ id: string; name: string; azName: string }>) => {
    if (!activeDesign || !activeDesign.components || !activeDesign.componentRoles) return;
    
    const azNames = [...new Set(racks.map(rack => rack.azName))].filter(az => az !== 'Core');
    const coreRacks = racks.filter(rack => rack.azName === 'Core');
    
    // Group components by role
    const componentsByRole: Record<string, any[]> = {};
    
    activeDesign.componentRoles.forEach(role => {
      const assignedComponents = activeDesign.components.filter(comp => 
        comp.assignedRoles && comp.assignedRoles.includes(role.id)
      );
      
      if (assignedComponents.length > 0) {
        componentsByRole[role.role] = assignedComponents;
      }
    });
    
    // Distribute components by role and AZ
    Object.entries(componentsByRole).forEach(([roleName, components]) => {
      // Skip components that don't need rack placement
      if (!components.some(comp => comp.ruHeight && comp.ruHeight > 0)) return;
      
      // Get racks per AZ
      const racksByAZ: Record<string, { id: string; name: string }[]> = {};
      azNames.forEach(azName => {
        racksByAZ[azName] = racks.filter(rack => rack.azName === azName);
      });
      
      switch (roleName) {
        case DeviceRoleType.Compute:
        case DeviceRoleType.Controller:
        case DeviceRoleType.Infrastructure:
          // Distribute compute nodes evenly across all AZs
          distributeComponentsEvenly(components, racksByAZ, azNames);
          break;
          
        case DeviceRoleType.Storage:
          // For storage nodes, respect the specific AZ quantity per cluster
          distributeStorageNodes(components, racksByAZ, azNames);
          break;
          
        case DeviceRoleType.LeafSwitch:
        case DeviceRoleType.ManagementSwitch:
        case DeviceRoleType.IPMISwitch:
          // Place switches near the top of each rack in each AZ
          placeNetworkDevicesInAZs(components, racksByAZ, azNames);
          break;
          
        case DeviceRoleType.SpineSwitch:
        case DeviceRoleType.BorderLeafSwitch:
        case DeviceRoleType.Firewall:
          // Place core network devices in core racks
          if (coreRacks.length > 0) {
            placeNetworkDevicesInCoreRacks(components, coreRacks);
          }
          break;
          
        default:
          distributeComponentsEvenly(components, racksByAZ, azNames);
      }
    });
    
    toast.success('Components distributed across racks');
  };
  
  const distributeComponentsEvenly = (
    components: any[], 
    racksByAZ: Record<string, { id: string; name: string }[]>, 
    azNames: string[]
  ) => {
    if (!components.length || !azNames.length) return;
    
    const componentsPerAZ = Math.ceil(components.length / azNames.length);
    
    components.forEach((component, index) => {
      const targetAzIndex = Math.floor(index / componentsPerAZ) % azNames.length;
      const targetAZ = azNames[targetAzIndex];
      const targetRacks = racksByAZ[targetAZ];
      
      if (targetRacks && targetRacks.length) {
        const rackIndex = index % targetRacks.length;
        const result = RackService.placeDevice(targetRacks[rackIndex].id, component.id);
        if (!result.success) {
          console.warn(`Failed to place ${component.name}: ${result.error}`);
        }
      }
    });
  };
  
  const distributeStorageNodes = (
    components: any[], 
    racksByAZ: Record<string, { id: string; name: string }[]>, 
    azNames: string[]
  ) => {
    if (!components.length || !azNames.length) return;
    
    // Group storage nodes by cluster
    const nodesByCluster: Record<string, any[]> = {};
    
    components.forEach(component => {
      if (component.clusterInfo && component.clusterInfo.clusterId) {
        if (!nodesByCluster[component.clusterInfo.clusterId]) {
          nodesByCluster[component.clusterInfo.clusterId] = [];
        }
        nodesByCluster[component.clusterInfo.clusterId].push(component);
      }
    });
    
    // For each cluster, distribute its nodes
    Object.entries(nodesByCluster).forEach(([clusterId, nodes]) => {
      const clusterInfo = nodes[0]?.clusterInfo;
      const storageCluster = activeDesign?.requirements.storageRequirements.storageClusters
        .find(sc => sc.id === clusterId);
      
      const targetAZCount = storageCluster?.availabilityZoneQuantity || azNames.length;
      const effectiveAZCount = Math.min(targetAZCount, azNames.length);
      
      // Place nodes in the first N AZs
      nodes.forEach((node, index) => {
        const azIndex = index % effectiveAZCount;
        const targetAZ = azNames[azIndex];
        const targetRacks = racksByAZ[targetAZ];
        
        if (targetRacks && targetRacks.length) {
          const rackIndex = index % targetRacks.length;
          const result = RackService.placeDevice(targetRacks[rackIndex].id, node.id);
          if (!result.success) {
            console.warn(`Failed to place storage node ${node.name}: ${result.error}`);
          }
        }
      });
    });
  };
  
  const placeNetworkDevicesInAZs = (
    components: any[],
    racksByAZ: Record<string, { id: string; name: string }[]>,
    azNames: string[]
  ) => {
    if (!components.length || !azNames.length) return;
    
    const deviceType = components[0]?.type;
    let ruStartPosition: number;
    
    // Determine starting position based on device type
    switch (deviceType) {
      case ComponentType.Switch:
        ruStartPosition = 42; // Top of rack
        break;
      default:
        ruStartPosition = 40;
        break;
    }
    
    // Group components by AZ
    const componentsPerAZ = Math.ceil(components.length / azNames.length);
    
    components.forEach((component, index) => {
      const targetAzIndex = Math.floor(index / componentsPerAZ) % azNames.length;
      const targetAZ = azNames[targetAzIndex];
      const targetRacks = racksByAZ[targetAZ];
      
      if (targetRacks && targetRacks.length) {
        const rackIndex = index % targetRacks.length;
        const result = RackService.placeDevice(
          targetRacks[rackIndex].id, 
          component.id, 
          ruStartPosition - (index % 4) * (component.ruHeight || 1)
        );
        
        if (!result.success) {
          // Try auto-placement if specific placement fails
          const fallbackResult = RackService.placeDevice(targetRacks[rackIndex].id, component.id);
          if (!fallbackResult.success) {
            console.warn(`Failed to place network device ${component.name}: ${fallbackResult.error}`);
          }
        }
      }
    });
  };
  
  const placeNetworkDevicesInCoreRacks = (components: any[], coreRacks: Array<{ id: string; name: string }>) => {
    if (!components.length || !coreRacks.length) return;
    
    const ruStartPosition = 42; // Start from top of rack
    
    components.forEach((component, index) => {
      const rackIndex = index % coreRacks.length;
      const result = RackService.placeDevice(
        coreRacks[rackIndex].id, 
        component.id,
        ruStartPosition - (index % 10) * (component.ruHeight || 1)
      );
      
      if (!result.success) {
        // Try auto-placement if specific placement fails
        const fallbackResult = RackService.placeDevice(coreRacks[rackIndex].id, component.id);
        if (!fallbackResult.success) {
          console.warn(`Failed to place core network device ${component.name}: ${fallbackResult.error}`);
        }
      }
    });
  };

  const handleDeviceClick = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setIsConnectionDialogOpen(true);
  }, []);

  const handleCloseConnectionDialog = useCallback(() => {
    setIsConnectionDialogOpen(false);
    setSelectedDeviceId(null);
  }, []);
  
  const filteredRacks = rackProfiles.filter(
    rack => selectedAZ === 'all' || rack.azName === selectedAZ
  );
  
  const handleScrollLeft = () => {
    setScrollPosition(Math.max(0, scrollPosition - scrollStep));
  };
  
  const handleScrollRight = () => {
    setScrollPosition(scrollPosition + scrollStep);
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
        
        <div className="flex flex-wrap items-center gap-4">
          <Select 
            value={selectedAZ}
            onValueChange={(value) => setSelectedAZ(value as string)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by AZ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Availability Zones</SelectItem>
              {availabilityZones.map(az => (
                <SelectItem key={az} value={az}>{az}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={selectedRackId || ''}
            onValueChange={(value) => setSelectedRackId(value)}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a rack" />
            </SelectTrigger>
            <SelectContent>
              {filteredRacks.map(rack => (
                <SelectItem key={rack.id} value={rack.id}>{rack.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Horizontal Rack Layout with Scrolling */}
        <div className="relative">
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
            onClick={handleScrollLeft}
            disabled={scrollPosition <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <ScrollArea className="w-full h-[300px] overflow-x-auto border rounded-md">
            <div 
              className="flex space-x-4 p-4" 
              style={{ transform: `translateX(-${scrollPosition}px)`, transition: 'transform 0.3s' }}
            >
              {filteredRacks.map(rack => (
                <div key={rack.id} className="flex-shrink-0">
                  <Card 
                    className={`w-[130px] h-[280px] cursor-pointer ${selectedRackId === rack.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedRackId(rack.id)}
                  >
                    <CardContent className="p-2 flex flex-col items-center">
                      <div className="bg-muted w-full h-[220px] rounded relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          {rack.azName === 'Core' ? (
                            <Database className="h-10 w-10 text-muted-foreground" />
                          ) : (
                            <HardDrive className="h-10 w-10 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="text-center mt-2">
                        <div className="font-medium text-xs truncate w-full">{rack.name}</div>
                        <div className="text-xs text-muted-foreground">{rack.azName}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
            onClick={handleScrollRight}
            disabled={scrollPosition >= filteredRacks.length * 134 - 800}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {selectedRackId && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Rack visualization - takes 7 columns */}
            <div className="md:col-span-7">
              <div className="flex justify-center">
                <RackView 
                  rackProfileId={selectedRackId}
                  height={700}
                  width={300}
                  showLabels={true}
                  labelInterval={5}
                  onDeviceClick={handleDeviceClick}
                />
              </div>
            </div>
            
            {/* Device palette and rack info - takes 5 columns */}
            <div className="md:col-span-5">
              <div className="space-y-6">
                {/* Device Palette for drag and drop */}
                <DevicePalette />
                
                {/* Rack Utilization Card */}
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
                
                {/* Rack Properties */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-medium text-lg mb-4">Rack Properties</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="rackName">Rack Name</Label>
                        <Input 
                          id="rackName" 
                          value={rackProfiles.find(r => r.id === selectedRackId)?.name || ''}
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="azName">Availability Zone</Label>
                        <Input 
                          id="azName" 
                          value={rackProfiles.find(r => r.id === selectedRackId)?.azName || ''}
                          disabled
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connection Management Dialog */}
      <Dialog open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedDeviceId && (
            <ConnectionPanel 
              deviceId={selectedDeviceId}
              onClose={handleCloseConnectionDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </DndProvider>
  );
};
