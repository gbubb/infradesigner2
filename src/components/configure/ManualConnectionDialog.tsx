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
import { X, Plus, Search, Cable } from "lucide-react";
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
    
    return activeDesign.components
      .filter(c => c.ports && c.ports.length > 0)
      .map(component => ({
        ...component,
        rackProfile: rackInfo.get(component.id)
      }));
  }, [activeDesign]);

  // Get unique AZs
  const availableAZs = useMemo(() => {
    const azs = new Set<string>();
    devicesWithPorts.forEach(device => {
      if (device.rackProfile?.availabilityZone) {
        azs.add(device.rackProfile.availabilityZone);
      }
    });
    return Array.from(azs).sort();
  }, [devicesWithPorts]);

  // Get unique port types
  const availablePortTypes = useMemo(() => {
    const types = new Set<string>();
    devicesWithPorts.forEach(device => {
      device.ports?.forEach(port => {
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

  // Filter devices and ports
  const filterPorts = useCallback((search: string, azFilter: string, portTypeFilter: string) => {
    return devicesWithPorts.flatMap(device => {
      const deviceAZ = device.rackProfile?.availabilityZone || "";
      
      // Check AZ filter
      if (azFilter !== "all" && deviceAZ !== azFilter) return [];
      
      // Check search filter
      const searchLower = search.toLowerCase();
      if (searchLower && !device.name.toLowerCase().includes(searchLower)) return [];
      
      // Filter ports by type
      const filteredPorts = (device.ports || []).filter(port => {
        if (portTypeFilter !== "all" && port.type !== portTypeFilter) return false;
        // Only show unconnected ports
        return !isPortConnected(device.id, port.id);
      });
      
      return filteredPorts.map(port => ({
        deviceId: device.id,
        deviceName: device.name,
        portId: port.id,
        portName: port.name,
        portType: port.type || "Unknown",
        portSpeed: port.speed,
        az: deviceAZ
      }));
    });
  }, [devicesWithPorts, isPortConnected]);

  const sourcePorts = useMemo(() => 
    filterPorts(sourceSearch, sourceAZFilter, sourcePortTypeFilter),
    [sourceSearch, sourceAZFilter, sourcePortTypeFilter, filterPorts]
  );

  const destinationPorts = useMemo(() => 
    filterPorts(destinationSearch, destinationAZFilter, destinationPortTypeFilter),
    [destinationSearch, destinationAZFilter, destinationPortTypeFilter, filterPorts]
  );

  // Handle port selection
  const handlePortClick = (port: PortSelection, side: 'source' | 'destination') => {
    if (side === 'source') {
      setSelectedSourcePorts([...selectedSourcePorts, port]);
    } else {
      setSelectedDestinationPorts([...selectedDestinationPorts, port]);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Manual Network Connections</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Top Half - Port Selection */}
          <div className="flex-1 min-h-0">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Source Side */}
              <div className="flex flex-col h-full">
                <div className="space-y-2 mb-3">
                  <Label>Source Ports</Label>
                  <Input
                    placeholder="Search devices..."
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    className="h-8"
                  />
                  <div className="flex gap-2">
                    <Select value={sourceAZFilter} onValueChange={setSourceAZFilter}>
                      <SelectTrigger className="h-8">
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
                      <SelectTrigger className="h-8">
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
                
                <ScrollArea className="flex-1 border rounded-md p-2">
                  {sourcePorts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">No available ports</div>
                  ) : (
                    <div className="space-y-2">
                      {sourcePorts.map((port, idx) => (
                        <div
                          key={`${port.deviceId}-${port.portId}-${idx}`}
                          className="p-2 border rounded cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handlePortClick(port, 'source')}
                        >
                          <div className="font-medium text-sm">{port.deviceName}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{port.portName}</span>
                            <Badge variant="outline" className="text-xs">{port.portType}</Badge>
                            {port.az && <Badge variant="secondary" className="text-xs">{port.az}</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                
                {/* Selected source ports */}
                {selectedSourcePorts.length > 0 && (
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    <div className="text-xs font-medium mb-1">Selected: {selectedSourcePorts.length}</div>
                  </div>
                )}
              </div>
              
              {/* Destination Side */}
              <div className="flex flex-col h-full">
                <div className="space-y-2 mb-3">
                  <Label>Destination Ports</Label>
                  <Input
                    placeholder="Search devices..."
                    value={destinationSearch}
                    onChange={(e) => setDestinationSearch(e.target.value)}
                    className="h-8"
                  />
                  <div className="flex gap-2">
                    <Select value={destinationAZFilter} onValueChange={setDestinationAZFilter}>
                      <SelectTrigger className="h-8">
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
                      <SelectTrigger className="h-8">
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
                
                <ScrollArea className="flex-1 border rounded-md p-2">
                  {destinationPorts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">No available ports</div>
                  ) : (
                    <div className="space-y-2">
                      {destinationPorts.map((port, idx) => (
                        <div
                          key={`${port.deviceId}-${port.portId}-${idx}`}
                          className="p-2 border rounded cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handlePortClick(port, 'destination')}
                        >
                          <div className="font-medium text-sm">{port.deviceName}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{port.portName}</span>
                            <Badge variant="outline" className="text-xs">{port.portType}</Badge>
                            {port.az && <Badge variant="secondary" className="text-xs">{port.az}</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                
                {/* Selected destination ports */}
                {selectedDestinationPorts.length > 0 && (
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    <div className="text-xs font-medium mb-1">Selected: {selectedDestinationPorts.length}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Bottom Half - Connection Definitions */}
          <div className="flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <Label>Connection Definitions ({connections.length})</Label>
            </div>
            
            <ScrollArea className="h-full border rounded-md p-2">
              {connections.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Cable className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select ports above to create connections</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {connections.map((conn) => (
                    <div key={conn.id} className="flex items-center gap-2 p-2 border rounded">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{conn.source?.deviceName}</div>
                          <div className="text-xs text-muted-foreground">
                            {conn.source?.portName} ({conn.source?.portType})
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{conn.destination?.deviceName}</div>
                          <div className="text-xs text-muted-foreground">
                            {conn.destination?.portName} ({conn.destination?.portType})
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">{conn.mediaType}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
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
        
        <DialogFooter>
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