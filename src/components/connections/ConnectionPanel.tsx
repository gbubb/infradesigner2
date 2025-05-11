import React, { useState, useCallback, useMemo } from 'react';
// Removed: import { useConnectionManager } from '@/hooks/design/useConnectionManager';
// Removed: import { useDesignStore } from '@/store/designStore';
import { InfrastructureComponent, ComponentType, Port } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
// Removed: import { StoreState } from '@/store/types';

interface ConnectionPanelProps {
  deviceId: string;
  onClose: () => void;
  // Props passed from RackLayoutsTab
  designComponents: InfrastructureComponent[];
  connections: Array<{
    sourceDeviceId: string;
    sourcePortId: string;
    destinationDeviceId: string;
    destinationPortId: string;
    cableId: string;
  }>;
  addConnection: (sourceDeviceId: string, sourcePortId: string, destinationDeviceId: string, destinationPortId: string, cableId: string) => { success: boolean; error?: string };
  removeConnection: (sourceDeviceId: string, sourcePortId: string, destinationDeviceId: string, destinationPortId: string) => { success: boolean; error?: string };
}

// Removed: panelSelector and componentsEqualityFn (they are in RackLayoutsTab now)

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ 
  deviceId, 
  onClose, 
  designComponents, 
  connections, 
  addConnection, 
  removeConnection 
}) => {
  // Local state for form inputs remains
  const [selectedPortId, setSelectedPortId] = useState<string>('');
  const [targetDeviceId, setTargetDeviceId] = useState<string>('');
  const [targetPortId, setTargetPortId] = useState<string>('');
  const [selectedCableId, setSelectedCableId] = useState<string>('');
  
  const sourceDevice = useMemo(() => {
    return designComponents.find(component => component.id === deviceId);
  }, [designComponents, deviceId]);
  
  // deviceConnections now uses the `connections` prop
  const deviceConnections = useMemo(() => {
    return connections.filter(conn => 
      conn.sourceDeviceId === deviceId || conn.destinationDeviceId === deviceId
    );
  }, [connections, deviceId]);
  
  const availableDevices = useMemo(() => {
    if (!sourceDevice) return [];
    return designComponents.filter(component => 
      component.id !== deviceId && component.ports && component.ports.length > 0
    );
  }, [designComponents, deviceId, sourceDevice]);
  
  const availableCables = useMemo(() => {
    return designComponents.filter(component => 
      component.type === ComponentType.Cable
    );
  }, [designComponents]);
  
  const targetDevice = useMemo(() => {
    if (!targetDeviceId) return null;
    return designComponents.find(component => component.id === targetDeviceId);
  }, [designComponents, targetDeviceId]);
  
  const getAvailablePorts = useCallback((device?: InfrastructureComponent | null) => {
    if (!device || !device.ports) return [];
    return device.ports.filter(port => !port.connectedToPortId);
  }, []);
  
  const sourcePorts = useMemo(() => getAvailablePorts(sourceDevice), [sourceDevice, getAvailablePorts]);
  const targetPorts = useMemo(() => getAvailablePorts(targetDevice), [targetDevice, getAvailablePorts]);
  
  const getConnectedPort = useCallback((currentDeviceId: string, currentPortId: string) => {
    const connection = connections.find(conn => 
      (conn.sourceDeviceId === currentDeviceId && conn.sourcePortId === currentPortId) || 
      (conn.destinationDeviceId === currentDeviceId && conn.destinationPortId === currentPortId)
    );
    if (!connection) return null;
    const isSource = connection.sourceDeviceId === currentDeviceId && connection.sourcePortId === currentPortId;
    const otherDeviceId = isSource ? connection.destinationDeviceId : connection.sourceDeviceId;
    const otherPortId = isSource ? connection.destinationPortId : connection.sourcePortId;
    const cableId = connection.cableId;
    const otherDevice = designComponents.find(c => c.id === otherDeviceId);
    const otherPort = otherDevice?.ports?.find(p => p.id === otherPortId);
    const cableInfo = designComponents.find(c => c.id === cableId);
    return {
      deviceId: otherDeviceId, deviceName: otherDevice?.name || 'Unknown Device',
      portId: otherPortId, portName: otherPort?.id || 'Unknown Port',
      cableId, cableName: cableInfo?.name || 'Unknown Cable'
    };
  }, [connections, designComponents]);

  const handleCreateConnection = useCallback(() => {
    if (!selectedPortId || !targetDeviceId || !targetPortId || !selectedCableId) {
      toast.error("Please select all required fields"); return;
    }
    const result = addConnection(deviceId, selectedPortId, targetDeviceId, targetPortId, selectedCableId);
    if (result.success) {
      toast.success("Connection created successfully");
      setSelectedPortId(''); setTargetDeviceId(''); setTargetPortId(''); setSelectedCableId('');
    } else { toast.error(`Failed to create connection: ${result.error}`); }
  }, [deviceId, selectedPortId, targetDeviceId, targetPortId, selectedCableId, addConnection]);

  const handleRemoveConnectionActual = useCallback((sDeviceId: string, sPortId: string, dDeviceId: string, dPortId: string) => {
    const result = removeConnection(sDeviceId, sPortId, dDeviceId, dPortId);
    if (result.success) toast.success("Connection removed successfully");
    else toast.error(`Failed to remove connection: ${result.error}`);
  }, [removeConnection]);

  if (!sourceDevice) {
    return (
      <Card><CardContent className="p-4"><p className="text-muted-foreground">Device not found</p><Button variant="outline" onClick={onClose} className="mt-2">Close</Button></CardContent></Card>
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
          {/* Connected Ports - RESTORED */}
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
                          onClick={() => handleRemoveConnectionActual(deviceId, port.id, connectedTo.deviceId, connectedTo.portId)}
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
          
          {/* Create New Connection - Section to be restored next */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Create New Connection (Form commented out)</h3>
             {/* FORM CONTENT WILL BE RESTORED HERE */}
             <p className="text-sm text-muted-foreground">Form for creating connections will be restored here.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
