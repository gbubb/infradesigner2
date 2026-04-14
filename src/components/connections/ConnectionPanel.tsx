import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConnectionManager } from '@/hooks/design/useConnectionManager';
import { useDesignStore } from '@/store/designStore';
import { Badge } from '@/components/ui/badge';

interface ConnectionPanelProps {
  deviceId: string;
  onClose: () => void;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ deviceId, onClose }) => {
  const { getDeviceConnections, getConnection } = useConnectionManager();
  const [activeTab, setActiveTab] = useState<'info' | 'connections'>('info');
  const { activeDesign } = useDesignStore();
  
  const deviceConnections = getDeviceConnections(deviceId);
  const rackProfiles = activeDesign?.rackprofiles || [];

  // Helper to find device placement
  const getDevicePlacementInfo = (devId: string) => {
    for (const rack of rackProfiles) {
      const deviceInRack = rack.devices.find(d => d.deviceId === devId);
      if (deviceInRack) {
        // Use Row Layout friendly name as the authoritative source
        const rackName = activeDesign?.rowLayout?.rackProperties?.[rack.id]?.friendlyName || rack.name;
        return `Rack: ${rackName}, RU: ${deviceInRack.ruPosition}`;
      }
    }
    return 'Unplaced';
  };
  
  // Function to determine connection type badge color
  const getConnectionTypeBadge = (cableId: string | undefined) => {
    if (!cableId) return <Badge variant="outline">Direct</Badge>;
    if (cableId.includes('fiber')) return <Badge className="bg-blue-500">Fiber</Badge>;
    if (cableId.includes('copper')) return <Badge className="bg-amber-500">Copper</Badge>;
    return <Badge>Standard</Badge>;
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Device: {deviceId}</span>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Button 
            variant={activeTab === 'info' ? 'default' : 'outline-solid'} 
            onClick={() => setActiveTab('info')}
          >
            Device Info
          </Button>
          <Button 
            variant={activeTab === 'connections' ? 'default' : 'outline-solid'} 
            onClick={() => setActiveTab('connections')}
          >
            Connections ({deviceConnections.length})
          </Button>
        </div>
        
        {activeTab === 'info' && (
          <div className="space-y-2">
            <p className="font-medium">Device ID: {deviceId}</p>
            <p className="text-sm text-muted-foreground">Placement: {getDevicePlacementInfo(deviceId)}</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="p-2 bg-muted rounded">
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm">Active</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-sm font-medium">Type</p>
                <p className="text-sm">Network Device</p>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'connections' && (
          <div className="space-y-4">
            {deviceConnections.length === 0 ? (
              <div className="p-4 bg-muted/20 rounded border text-center">
                <p className="text-muted-foreground">No connections found for this device.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deviceConnections.map(conn => {
                  const connectedDeviceId = conn.sourceDeviceId === deviceId ? 
                    conn.destinationDeviceId : conn.sourceDeviceId;
                    
                  return (
                    <div key={conn.cableId || `${conn.sourceDeviceId}-${conn.destinationDeviceId}`} 
                      className="p-3 border rounded-md hover:bg-accent/5">
                      <div className="flex justify-between items-center">
                        <p className="font-medium">Connected to: {connectedDeviceId}</p>
                        {getConnectionTypeBadge(conn.cableId)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Placement: {getDevicePlacementInfo(connectedDeviceId)}
                      </p>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <p>Connection ID: {conn.cableId || 'Direct Connection'}</p>
                        <p>Source: {conn.sourceDeviceId} → Destination: {conn.destinationDeviceId}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
