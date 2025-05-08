
import React, { useState, useCallback, useMemo } from 'react';
import { useConnectionManager } from '@/hooks/design/useConnectionManager';
import { useDesignStore } from '@/store/designStore';
import { InfrastructureComponent, ComponentType, Port } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ConnectionPanelProps {
  deviceId: string;
  onClose: () => void;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ deviceId, onClose }) => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const { connections, addConnection, removeConnection } = useConnectionManager();
  
  const [selectedPortId, setSelectedPortId] = useState<string>('');
  const [targetDeviceId, setTargetDeviceId] = useState<string>('');
  const [targetPortId, setTargetPortId] = useState<string>('');
  const [selectedCableId, setSelectedCableId] = useState<string>('');
  
  const sourceDevice = useMemo(() => {
    return activeDesign?.components.find(component => component.id === deviceId);
  }, [activeDesign, deviceId]);
  
  const deviceConnections = useMemo(() => {
    return connections.filter(conn => 
      conn.sourceDeviceId === deviceId || conn.destinationDeviceId === deviceId
    );
  }, [connections, deviceId]);
  
  const availableDevices = useMemo(() => {
    if (!activeDesign || !sourceDevice) return [];
    
    // Filter out the source device itself
    return activeDesign.components.filter(component => 
      component.id !== deviceId && component.ports && component.ports.length > 0
    );
  }, [activeDesign, deviceId, sourceDevice]);
  
  const availableCables = useMemo(() => {
    if (!activeDesign) return [];
    
    return activeDesign.components.filter(component => 
      component.type === ComponentType.Cable
    );
  }, [activeDesign]);
  
  const targetDevice = useMemo(() => {
    if (!targetDeviceId) return null;
    return activeDesign?.components.find(component => component.id === targetDeviceId);
  }, [activeDesign, targetDeviceId]);
  
  const getAvailablePorts = useCallback((device?: InfrastructureComponent | null) => {
    if (!device || !device.ports) return [];
    
    return device.ports.filter(port => !port.connectedToPortId);
  }, []);
  
  const sourcePorts = useMemo(() => {
    return getAvailablePorts(sourceDevice);
  }, [sourceDevice, getAvailablePorts]);
  
  const targetPorts = useMemo(() => {
    return getAvailablePorts(targetDevice);
  }, [targetDevice, getAvailablePorts]);
  
  const getConnectedPort = useCallback((deviceId: string, portId: string) => {
    const connection = connections.find(conn => 
      (conn.sourceDeviceId === deviceId && conn.sourcePortId === portId) || 
      (conn.destinationDeviceId === deviceId && conn.destinationPortId === portId)
    );
    
    if (!connection) return null;
    
    // Get the device and port on the other end
    const isSource = connection.sourceDeviceId === deviceId && connection.sourcePortId === portId;
    const otherDeviceId = isSource ? connection.destinationDeviceId : connection.sourceDeviceId;
    const otherPortId = isSource ? connection.destinationPortId : connection.sourcePortId;
    const cableId = connection.cableId;
    
    // Get component details
    const otherDevice = activeDesign?.components.find(c => c.id === otherDeviceId);
    const otherPort = otherDevice?.ports?.find(p => p.id === otherPortId);
    const cable = activeDesign?.components.find(c => c.id === cableId);
    
    return {
      deviceId: otherDeviceId,
      deviceName: otherDevice?.name || 'Unknown Device',
      portId: otherPortId,
      portName: otherPort?.id || 'Unknown Port',
      cableId,
      cableName: cable?.name || 'Unknown Cable'
    };
  }, [connections, activeDesign]);
  
  const handleCreateConnection = useCallback(() => {
    if (!selectedPortId || !targetDeviceId || !targetPortId || !selectedCableId) {
      toast.error("Please select all required fields");
      return;
    }
    
    const result = addConnection(
      deviceId, 
      selectedPortId, 
      targetDeviceId, 
      targetPortId, 
      selectedCableId
    );
    
    if (result.success) {
      toast.success("Connection created successfully");
      // Reset form
      setSelectedPortId('');
      setTargetDeviceId('');
      setTargetPortId('');
      setSelectedCableId('');
    } else {
      toast.error(`Failed to create connection: ${result.error}`);
    }
  }, [deviceId, selectedPortId, targetDeviceId, targetPortId, selectedCableId, addConnection]);
  
  const handleRemoveConnection = useCallback((sourceDeviceId: string, sourcePortId: string, destinationDeviceId: string, destinationPortId: string) => {
    const result = removeConnection(sourceDeviceId, sourcePortId, destinationDeviceId, destinationPortId);
    
    if (result.success) {
      toast.success("Connection removed successfully");
    } else {
      toast.error(`Failed to remove connection: ${result.error}`);
    }
  }, [removeConnection]);
  
  if (!sourceDevice) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground">Device not found</p>
          <Button variant="outline" onClick={onClose} className="mt-2">Close</Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Device Connections: {sourceDevice.name}</span>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Connected Ports */}
          <div>
            <h3 className="text-lg font-medium mb-2">Connected Ports</h3>
            {sourceDevice.ports && sourceDevice.ports.some(port => port.connectedToPortId) ? (
              <div className="space-y-2">
                {sourceDevice.ports.filter(port => port.connectedToPortId).map((port) => {
                  const connectedTo = getConnectedPort(deviceId, port.id);
                  return (
                    <div key={port.id} className="flex items-center justify-between bg-muted p-2 rounded">
                      <div>
                        <div className="font-medium text-sm">Port: {port.id}</div>
                        {connectedTo && (
                          <div className="text-xs text-muted-foreground">
                            Connected to {connectedTo.deviceName} ({connectedTo.portName}) 
                            via {connectedTo.cableName}
                          </div>
                        )}
                      </div>
                      {connectedTo && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleRemoveConnection(
                            deviceId, 
                            port.id, 
                            connectedTo.deviceId, 
                            connectedTo.portId
                          )}
                        >
                          Disconnect
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">No connected ports</p>
            )}
          </div>
          
          {/* Create New Connection */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Create New Connection</h3>
            
            <div className="space-y-4">
              {/* Source Port Selection */}
              <div>
                <Label htmlFor="sourcePort">Source Port</Label>
                <Select 
                  value={selectedPortId} 
                  onValueChange={setSelectedPortId}
                >
                  <SelectTrigger id="sourcePort" className="w-full">
                    <SelectValue placeholder="Select a port" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourcePorts.length === 0 ? (
                      <SelectItem value="none" disabled>No available ports</SelectItem>
                    ) : (
                      sourcePorts.map(port => (
                        <SelectItem key={port.id} value={port.id}>
                          {port.id} - {port.connectorType} ({port.speed})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Target Device Selection */}
              <div>
                <Label htmlFor="targetDevice">Target Device</Label>
                <Select 
                  value={targetDeviceId} 
                  onValueChange={(value) => {
                    setTargetDeviceId(value);
                    setTargetPortId('');
                  }}
                >
                  <SelectTrigger id="targetDevice" className="w-full">
                    <SelectValue placeholder="Select a device" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDevices.length === 0 ? (
                      <SelectItem value="none" disabled>No available devices</SelectItem>
                    ) : (
                      availableDevices.map(device => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name} ({device.type})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Target Port Selection */}
              <div>
                <Label htmlFor="targetPort">Target Port</Label>
                <Select 
                  value={targetPortId} 
                  onValueChange={setTargetPortId}
                  disabled={!targetDeviceId}
                >
                  <SelectTrigger id="targetPort" className="w-full">
                    <SelectValue placeholder="Select a port" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetPorts.length === 0 ? (
                      <SelectItem value="none" disabled>No available ports</SelectItem>
                    ) : (
                      targetPorts.map(port => (
                        <SelectItem key={port.id} value={port.id}>
                          {port.id} - {port.connectorType} ({port.speed})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Cable Selection */}
              <div>
                <Label htmlFor="cable">Cable</Label>
                <Select 
                  value={selectedCableId} 
                  onValueChange={setSelectedCableId}
                >
                  <SelectTrigger id="cable" className="w-full">
                    <SelectValue placeholder="Select a cable" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCables.length === 0 ? (
                      <SelectItem value="none" disabled>No cables available</SelectItem>
                    ) : (
                      availableCables.map(cable => (
                        <SelectItem key={cable.id} value={cable.id}>
                          {cable.name} - {cable.connectorA_Type}/{cable.connectorB_Type}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleCreateConnection}
                disabled={!selectedPortId || !targetDeviceId || !targetPortId || !selectedCableId}
              >
                Create Connection
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
