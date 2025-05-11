import React, { useState, useCallback, useMemo } from 'react';
import { useConnectionManager } from '@/hooks/design/useConnectionManager';
import { useDesignStore } from '@/store/designStore';
import { InfrastructureComponent, ComponentType, Port } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { StoreState } from '@/store/types';

interface ConnectionPanelProps {
  deviceId: string;
  onClose: () => void;
}

const panelSelector = (state: StoreState) => state.activeDesign?.components || [];
const componentsEqualityFn = (oldComponents: InfrastructureComponent[], newComponents: InfrastructureComponent[]): boolean => {
  if (oldComponents === newComponents) return true;
  if (oldComponents.length !== newComponents.length) return false;
  return JSON.stringify(oldComponents) === JSON.stringify(newComponents);
};

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ deviceId, onClose }) => {
  const designComponents = useDesignStore(panelSelector, componentsEqualityFn);
  const { connections, removeConnection } = useConnectionManager();
  
  const sourceDevice = useMemo(() => {
    return designComponents.find(component => component.id === deviceId);
  }, [designComponents, deviceId]);
  
  const getConnectedPort = useCallback((connectedDeviceId: string, portId: string) => {
    const connection = connections.find(conn => 
      (conn.sourceDeviceId === connectedDeviceId && conn.sourcePortId === portId) || 
      (conn.destinationDeviceId === connectedDeviceId && conn.destinationPortId === portId)
    );
    if (!connection) return null;
    const isSource = connection.sourceDeviceId === connectedDeviceId && connection.sourcePortId === portId;
    const otherDeviceId = isSource ? connection.destinationDeviceId : connection.sourceDeviceId;
    const otherPortId = isSource ? connection.destinationPortId : connection.sourcePortId;
    const cableId = connection.cableId;
    const otherDevice = designComponents.find(c => c.id === otherDeviceId);
    const otherPort = otherDevice?.ports?.find(p => p.id === otherPortId);
    const cableInfo = designComponents.find(c => c.id === cableId);
    return {
      deviceId: otherDeviceId,
      deviceName: otherDevice?.name || 'Unknown Device',
      portId: otherPortId,
      portName: otherPort?.id || 'Unknown Port',
      cableId,
      cableName: cableInfo?.name || 'Unknown Cable'
    };
  }, [connections, designComponents]);

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
          
          <p className="text-muted-foreground p-4 border-t mt-4">
            Create connection form is temporarily removed for debugging.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
