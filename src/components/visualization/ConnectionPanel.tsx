import React, { useState, useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useConnectionManager } from '@/hooks/design/useConnectionManager';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComponentType, ConnectorType } from '@/types/infrastructure/component-types';
import { Port } from '@/types/infrastructure/port-types';
import { Link, Unlink } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectionPanelProps {
  selectedDeviceId: string | null;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ selectedDeviceId }) => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const { addConnection, removeConnection, getDeviceConnections } = useConnectionManager();
  
  const [sourcePortId, setSourcePortId] = useState<string>('');
  const [targetDeviceId, setTargetDeviceId] = useState<string>('');
  const [targetPortId, setTargetPortId] = useState<string>('');
  const [cableId, setCableId] = useState<string>('');
  
  const [connections, setConnections] = useState<Array<{
    sourceDeviceId: string;
    sourcePortId: string;
    destinationDeviceId: string;
    destinationPortId: string;
    cableId: string;
  }>>([]);
  
  // Get the selected device details
  const selectedDevice = selectedDeviceId 
    ? activeDesign?.components.find(comp => comp.id === selectedDeviceId)
    : null;
  
  // Get all other devices that can be connected (have ports)
  const connectableDevices = activeDesign?.components.filter(comp => 
    comp.id !== selectedDeviceId && 
    comp.ports && 
    comp.ports.length > 0
  ) || [];
  
  // Get available cables
  const availableCables = activeDesign?.components.filter(comp => 
    comp.type === ComponentType.Cable
  ) || [];
  
  // Get ports for selected device and target device
  const sourcePorts = selectedDevice?.ports || [];
  const targetPorts = activeDesign?.components.find(comp => comp.id === targetDeviceId)?.ports || [];
  
  // Reset form when selected device changes
  useEffect(() => {
    setSourcePortId('');
    setTargetDeviceId('');
    setTargetPortId('');
    setCableId('');
    
    if (selectedDeviceId && activeDesign) {
      // Get existing connections for this device
      const deviceConnections = getDeviceConnections(selectedDeviceId);
      setConnections(deviceConnections);
    } else {
      setConnections([]);
    }
  }, [selectedDeviceId, activeDesign]);
  
  // Reset target port when target device changes
  useEffect(() => {
    setTargetPortId('');
  }, [targetDeviceId]);
  
  // Handle connection creation
  const handleCreateConnection = () => {
    if (!selectedDeviceId || !sourcePortId || !targetDeviceId || !targetPortId || !cableId) {
      toast.error('Please select all required fields');
      return;
    }
    
    const result = addConnection(
      selectedDeviceId,
      sourcePortId,
      targetDeviceId,
      targetPortId,
      cableId
    );
    
    if (result.success) {
      toast.success('Connection created successfully');
      
      // Update connections list
      if (selectedDeviceId) {
        const deviceConnections = getDeviceConnections(selectedDeviceId);
        setConnections(deviceConnections);
      }
      
      // Reset form
      setSourcePortId('');
      setTargetDeviceId('');
      setTargetPortId('');
      setCableId('');
    } else {
      toast.error(`Failed to create connection: ${result.error}`);
    }
  };
  
  // Handle connection removal
  const handleRemoveConnection = (
    sourceDeviceId: string, 
    sourcePortId: string, 
    destinationDeviceId: string, 
    destinationPortId: string
  ) => {
    const result = removeConnection(
      sourceDeviceId,
      sourcePortId,
      destinationDeviceId,
      destinationPortId
    );
    
    if (result.success) {
      toast.success('Connection removed successfully');
      
      // Update connections list
      if (selectedDeviceId) {
        const deviceConnections = getDeviceConnections(selectedDeviceId);
        setConnections(deviceConnections);
      }
    } else {
      toast.error(`Failed to remove connection: ${result.error}`);
    }
  };
  
  // Get device name by ID
  const getDeviceName = (deviceId: string) => {
    return activeDesign?.components.find(comp => comp.id === deviceId)?.name || 'Unknown Device';
  };
  
  // Get port label
  const getPortLabel = (deviceId: string, portId: string) => {
    const device = activeDesign?.components.find(comp => comp.id === deviceId);
    const port = device?.ports?.find(p => p.id === portId);
    return port ? `${port.role || 'Port'} (${port.connectorType}, ${port.speed})` : 'Unknown Port';
  };
  
  // Get cable name by ID
  const getCableName = (cableId: string) => {
    return activeDesign?.components.find(comp => comp.id === cableId)?.name || 'Unknown Cable';
  };
  
  if (!selectedDevice) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Select a device to manage connections</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-medium mb-4">
          Device Connections: {selectedDevice.name}
        </h3>
        
        <div className="space-y-6">
          {/* Existing connections */}
          {connections.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Existing Connections</h4>
              
              <div className="space-y-2">
                {connections.map((conn, index) => {
                  const isSource = conn.sourceDeviceId === selectedDeviceId;
                  const otherDeviceId = isSource ? conn.destinationDeviceId : conn.sourceDeviceId;
                  const sourcePort = getPortLabel(conn.sourceDeviceId, conn.sourcePortId);
                  const destinationPort = getPortLabel(conn.destinationDeviceId, conn.destinationPortId);
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 border rounded">
                      <div className="text-sm">
                        <span className="font-medium">{getDeviceName(conn.sourceDeviceId)}</span>
                        <span className="mx-1 text-gray-500">→</span>
                        <span className="text-xs text-gray-600">{sourcePort}</span>
                        <span className="mx-2 text-gray-500">to</span>
                        <span className="font-medium">{getDeviceName(conn.destinationDeviceId)}</span>
                        <span className="mx-1 text-gray-500">→</span>
                        <span className="text-xs text-gray-600">{destinationPort}</span>
                        <div className="text-xs text-gray-500">
                          Cable: {getCableName(conn.cableId)}
                        </div>
                      </div>
                      
                      <Button 
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveConnection(
                          conn.sourceDeviceId, 
                          conn.sourcePortId, 
                          conn.destinationDeviceId, 
                          conn.destinationPortId
                        )}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No connections for this device</p>
          )}
          
          {/* New connection form */}
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium">Create New Connection</h4>
            
            <div className="space-y-4">
              {/* Source Port */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Source Port</label>
                <Select value={sourcePortId} onValueChange={setSourcePortId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select port" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourcePorts.map(port => (
                      <SelectItem 
                        key={port.id} 
                        value={port.id}
                        disabled={!!port.connectedToPortId}
                      >
                        {port.role || 'Port'} ({port.connectorType}, {port.speed})
                        {port.connectedToPortId && ' (Connected)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Target Device */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Target Device</label>
                <Select value={targetDeviceId} onValueChange={setTargetDeviceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectableDevices.map(device => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name} ({device.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Target Port */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Target Port</label>
                <Select 
                  value={targetPortId} 
                  onValueChange={setTargetPortId}
                  disabled={!targetDeviceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select port" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetPorts.map(port => (
                      <SelectItem 
                        key={port.id} 
                        value={port.id}
                        disabled={!!port.connectedToPortId}
                      >
                        {port.role || 'Port'} ({port.connectorType}, {port.speed})
                        {port.connectedToPortId && ' (Connected)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Cable Selection */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cable</label>
                <Select value={cableId} onValueChange={setCableId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cable" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCables.map(cable => (
                      <SelectItem key={cable.id} value={cable.id}>
                        {cable.name} ({cable.connectorA_Type}-{cable.connectorB_Type}, {cable.length}m)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Create Connection Button */}
              <Button 
                className="w-full"
                onClick={handleCreateConnection}
                disabled={!sourcePortId || !targetDeviceId || !targetPortId || !cableId}
              >
                <Link className="h-4 w-4 mr-2" />
                Create Connection
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
