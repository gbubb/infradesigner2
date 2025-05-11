
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConnectionManager } from '@/hooks/design/useConnectionManager';

interface ConnectionPanelProps {
  deviceId: string;
  onClose: () => void;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ deviceId, onClose }) => {
  const { getDeviceConnections } = useConnectionManager();
  const [activeTab, setActiveTab] = useState<'info' | 'connections'>('info');
  
  const deviceConnections = getDeviceConnections(deviceId);
  
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
            variant={activeTab === 'info' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('info')}
          >
            Device Info
          </Button>
          <Button 
            variant={activeTab === 'connections' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('connections')}
          >
            Connections ({deviceConnections.length})
          </Button>
        </div>
        
        {activeTab === 'info' && (
          <div className="space-y-2">
            <p>Device ID: {deviceId}</p>
            <p>This is basic device information.</p>
          </div>
        )}
        
        {activeTab === 'connections' && (
          <div className="space-y-4">
            {deviceConnections.length === 0 ? (
              <p className="text-muted-foreground">No connections found for this device.</p>
            ) : (
              <div className="space-y-2">
                {deviceConnections.map(conn => (
                  <div key={conn.cableId || `${conn.sourceDeviceId}-${conn.destinationDeviceId}`} 
                    className="p-2 border rounded-md">
                    <p>Connected to: {conn.sourceDeviceId === deviceId ? 
                      conn.destinationDeviceId : conn.sourceDeviceId}</p>
                    <p className="text-xs text-muted-foreground">
                      Cable ID: {conn.cableId || 'Not assigned'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
