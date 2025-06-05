import React, { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { X, Cable, ChevronRight } from "lucide-react";
import { InfrastructureComponent, Port, NetworkConnection, ComponentType } from "@/types/infrastructure";
import { CableMediaType, PortSpeed } from "@/types/infrastructure/port-types";
import { useDesignStore } from "@/store/designStore";

interface ManualConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (connections: NetworkConnection[]) => void;
}

interface PortSelection {
  deviceId: string;
  deviceName: string;
  portId: string;
  portName: string;
  portType: string;
  portSpeed?: PortSpeed;
  az?: string;
}

interface ConnectionDefinition {
  id: string;
  source?: PortSelection;
  destination?: PortSelection;
  mediaType?: CableMediaType;
}

interface DeviceWithPorts {
  device: InfrastructureComponent;
  ports: Port[];
  az?: string;
}

const ManualConnectionDialog: React.FC<ManualConnectionDialogProps> = ({ open, onClose, onSave }) => {
  const { activeDesign } = useDesignStore();
  const [sourceSearch, setSourceSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [sourceAZFilter, setSourceAZFilter] = useState<string>("all");
  const [destinationAZFilter, setDestinationAZFilter] = useState<string>("all");
  const [sourcePortTypeFilter, setSourcePortTypeFilter] = useState<string>("all");
  const [destinationPortTypeFilter, setDestinationPortTypeFilter] = useState<string>("all");
  const [selectedSourcePorts, setSelectedSourcePorts] = useState<PortSelection[]>([]);
  const [selectedDestinationPorts, setSelectedDestinationPorts] = useState<PortSelection[]>([]);
  const [connections, setConnections] = useState<ConnectionDefinition[]>([]);

  // Get all devices with ports and their rack information
  const devicesWithPorts = useMemo(() => {
    if (!activeDesign) return [];
    
    // Get rack information for devices
    const rackInfo = new Map<string, { rackId: string; az?: string }>();
    activeDesign.rackprofiles?.forEach(rack => {
      rack.devices.forEach(device => {
        rackInfo.set(device.deviceId, {
          rackId: rack.id,
          az: rack.availabilityZone
        });
      });
    });
    
    const devices: DeviceWithPorts[] = [];
    activeDesign.components.forEach(component => {
      if (component.ports && component.ports.length > 0) {
        const rackData = rackInfo.get(component.id);
        devices.push({
          device: component,
          ports: component.ports,
          az: rackData?.az
        });
      }
    });
    
    return devices;
  }, [activeDesign]);

  // Get unique AZs
  const availableAZs = useMemo(() => {
    const azs = new Set<string>();
    devicesWithPorts.forEach(({ az }) => {
      if (az) azs.add(az);
    });
    return Array.from(azs).sort();
  }, [devicesWithPorts]);

  // Get unique port types
  const availablePortTypes = useMemo(() => {
    const types = new Set<string>();
    devicesWithPorts.forEach(({ ports }) => {
      ports.forEach(port => {
        if (port.type) types.add(port.type);
      });
    });
    return Array.from(types).sort();
  }, [devicesWithPorts]);

  // Check if a port is already connected
  const isPortConnected = useCallback((deviceId: string, portId: string) => {
    // Check existing connections in design
    const existingConnections = activeDesign?.networkConnections || [];
    const isConnectedInDesign = existingConnections.some(conn => 
      (conn.sourceDeviceId === deviceId && conn.sourcePortId === portId) ||
      (conn.destinationDeviceId === deviceId && conn.destinationPortId === portId)
    );
    
    // Check pending connections
    const isConnectedInPending = connections.some(conn => 
      (conn.source?.deviceId === deviceId && conn.source?.portId === portId) ||
      (conn.destination?.deviceId === deviceId && conn.destination?.portId === portId)
    );
    
    // Check selected ports
    const isInSelectedSource = selectedSourcePorts.some(p => p.deviceId === deviceId && p.portId === portId);
    const isInSelectedDest = selectedDestinationPorts.some(p => p.deviceId === deviceId && p.portId === portId);
    
    return isConnectedInDesign || isConnectedInPending || isInSelectedSource || isInSelectedDest;
  }, [activeDesign?.networkConnections, connections, selectedSourcePorts, selectedDestinationPorts]);

  // Filter devices based on criteria
  const filterDevices = useCallback((search: string, azFilter: string, portTypeFilter: string): DeviceWithPorts[] => {
    return devicesWithPorts.filter(({ device, ports, az }) => {
      // Check AZ filter
      if (azFilter !== "all" && az !== azFilter) return false;
      
      // Check search filter
      const searchLower = search.toLowerCase();
      if (searchLower && !device.name.toLowerCase().includes(searchLower)) return false;
      
      // Check if device has ports matching the port type filter
      if (portTypeFilter !== "all") {
        const hasMatchingPort = ports.some(port => port.type === portTypeFilter && !isPortConnected(device.id, port.id));
        if (!hasMatchingPort) return false;
      }
      
      // Check if device has any available ports
      const hasAvailablePorts = ports.some(port => !isPortConnected(device.id, port.id));
      return hasAvailablePorts;
    });
  }, [devicesWithPorts, isPortConnected]);

  const filteredSourceDevices = useMemo(() => 
    filterDevices(sourceSearch, sourceAZFilter, sourcePortTypeFilter),
    [sourceSearch, sourceAZFilter, sourcePortTypeFilter, filterDevices]
  );

  const filteredDestinationDevices = useMemo(() => 
    filterDevices(destinationSearch, destinationAZFilter, destinationPortTypeFilter),
    [destinationSearch, destinationAZFilter, destinationPortTypeFilter, filterDevices]
  );

  // Handle port selection
  const handlePortClick = (device: InfrastructureComponent, port: Port, az: string | undefined, side: 'source' | 'destination') => {
    const portSelection: PortSelection = {
      deviceId: device.id,
      deviceName: device.name,
      portId: port.id,
      portName: port.name,
      portType: port.type || "Unknown",
      portSpeed: port.speed,
      az
    };

    if (side === 'source') {
      setSelectedSourcePorts([...selectedSourcePorts, portSelection]);
    } else {
      setSelectedDestinationPorts([...selectedDestinationPorts, portSelection]);
    }
    
    // Auto-create connections when both sides have selections
    tryCreateConnections();
  };

  // Try to create connections from selected ports
  const tryCreateConnections = () => {
    const newConnections: ConnectionDefinition[] = [];
    
    // Create connections pairing source and destination ports
    const sourcesToUse = [...selectedSourcePorts];
    const destinationsToUse = [...selectedDestinationPorts];
    
    while (sourcesToUse.length > 0 && destinationsToUse.length > 0) {
      const source = sourcesToUse.shift()!;
      const destination = destinationsToUse.shift()!;
      
      newConnections.push({
        id: `conn-${Date.now()}-${Math.random()}`,
        source,
        destination,
        mediaType: determineMediaType(source.portType, destination.portType)
      });
    }
    
    if (newConnections.length > 0) {
      setConnections([...connections, ...newConnections]);
      // Clear used selections
      setSelectedSourcePorts(sourcesToUse);
      setSelectedDestinationPorts(destinationsToUse);
    }
  };

  // Determine media type based on port types
  const determineMediaType = (sourceType: string, destType: string): CableMediaType => {
    if (sourceType.includes("RJ45") || destType.includes("RJ45")) {
      return CableMediaType.Copper;
    }
    return CableMediaType.Fiber;
  };

  // Remove a connection
  const removeConnection = (id: string) => {
    setConnections(connections.filter(c => c.id !== id));
  };

  // Save all connections
  const handleSave = () => {
    if (connections.length === 0) {
      toast.error("No connections to save");
      return;
    }
    
    const networkConnections: NetworkConnection[] = connections
      .filter(c => c.source && c.destination)
      .map(c => ({
        id: `nc-${Date.now()}-${Math.random()}`,
        connectionId: `MANUAL-${Date.now()}`,
        sourceDeviceId: c.source!.deviceId,
        sourcePortId: c.source!.portId,
        destinationDeviceId: c.destination!.deviceId,
        destinationPortId: c.destination!.portId,
        mediaType: c.mediaType,
        status: 'planned' as const,
        notes: 'Manually created connection'
      }));
    
    onSave(networkConnections);
    toast.success(`Created ${networkConnections.length} connections`);
    onClose();
  };

  // Helper to render device with ports
  const renderDeviceWithPorts = (
    { device, ports, az }: DeviceWithPorts, 
    side: 'source' | 'destination',
    portTypeFilter: string
  ) => {
    const availablePorts = ports.filter(port => {
      if (portTypeFilter !== "all" && port.type !== portTypeFilter) return false;
      return !isPortConnected(device.id, port.id);
    });

    if (availablePorts.length === 0) return null;

    return (
      <div key={device.id} className="border rounded-lg p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">{device.name}</div>
          {az && <Badge variant="secondary" className="text-xs">{az}</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {availablePorts.map(port => (
            <Button
              key={port.id}
              variant="outline"
              size="sm"
              className="h-7 text-xs justify-start"
              onClick={() => handlePortClick(device, port, az, side)}
            >
              <span className="truncate">{port.name}</span>
              {port.type && (
                <Badge variant="outline" className="ml-1 text-xs h-4 px-1">
                  {port.type}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Create Manual Network Connections</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          {/* Top Half - Port Selection */}
          <div className="flex-1 flex flex-col min-h-0 border-b">
            <div className="grid grid-cols-2 gap-0 h-full">
              {/* Source Side */}
              <div className="flex flex-col h-full border-r">
                <div className="p-4 border-b bg-muted/50">
                  <Label className="text-sm font-medium mb-2 block">Source Ports</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search devices..."
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      className="h-8"
                    />
                    <div className="flex gap-2">
                      <Select value={sourceAZFilter} onValueChange={setSourceAZFilter}>
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue placeholder="All AZs" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All AZs</SelectItem>
                          {availableAZs.map(az => (
                            <SelectItem key={az} value={az}>{az}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={sourcePortTypeFilter} onValueChange={setSourcePortTypeFilter}>
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue placeholder="All Port Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Port Types</SelectItem>
                          {availablePortTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {selectedSourcePorts.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Selected: {selectedSourcePorts.length} port{selectedSourcePorts.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  {filteredSourceDevices.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No available devices/ports</div>
                  ) : (
                    filteredSourceDevices.map(deviceData => 
                      renderDeviceWithPorts(deviceData, 'source', sourcePortTypeFilter)
                    )
                  )}
                </ScrollArea>
              </div>
              
              {/* Destination Side */}
              <div className="flex flex-col h-full">
                <div className="p-4 border-b bg-muted/50">
                  <Label className="text-sm font-medium mb-2 block">Destination Ports</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search devices..."
                      value={destinationSearch}
                      onChange={(e) => setDestinationSearch(e.target.value)}
                      className="h-8"
                    />
                    <div className="flex gap-2">
                      <Select value={destinationAZFilter} onValueChange={setDestinationAZFilter}>
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue placeholder="All AZs" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All AZs</SelectItem>
                          {availableAZs.map(az => (
                            <SelectItem key={az} value={az}>{az}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={destinationPortTypeFilter} onValueChange={setDestinationPortTypeFilter}>
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue placeholder="All Port Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Port Types</SelectItem>
                          {availablePortTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {selectedDestinationPorts.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Selected: {selectedDestinationPorts.length} port{selectedDestinationPorts.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  {filteredDestinationDevices.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No available devices/ports</div>
                  ) : (
                    filteredDestinationDevices.map(deviceData => 
                      renderDeviceWithPorts(deviceData, 'destination', destinationPortTypeFilter)
                    )
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
          
          {/* Bottom Half - Connection Definitions */}
          <div className="h-[40%] flex flex-col">
            <div className="p-4 border-b bg-muted/50">
              <Label className="text-sm font-medium">Connection Definitions ({connections.length})</Label>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              {connections.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Cable className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select ports above to create connections</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {connections.map((conn) => (
                    <div key={conn.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                        <div className="text-sm">
                          <div className="font-medium">{conn.source?.deviceName}</div>
                          <div className="text-xs text-muted-foreground">
                            {conn.source?.portName} 
                            {conn.source?.portType && (
                              <Badge variant="outline" className="ml-1 text-xs h-4 px-1">
                                {conn.source.portType}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm text-right">
                          <div className="font-medium">{conn.destination?.deviceName}</div>
                          <div className="text-xs text-muted-foreground">
                            {conn.destination?.portName}
                            {conn.destination?.portType && (
                              <Badge variant="outline" className="ml-1 text-xs h-4 px-1">
                                {conn.destination.portType}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">{conn.mediaType}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => removeConnection(conn.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={connections.length === 0}>
            Save {connections.length} Connection{connections.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualConnectionDialog;