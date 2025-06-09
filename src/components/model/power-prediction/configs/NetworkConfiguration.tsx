import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { NetworkPort } from '../types';
import { PortConfigItem } from '../shared/PortConfigItem';

interface NetworkConfigurationProps {
  networkPorts: NetworkPort[];
  onAddPort: () => void;
  onUpdatePort: (id: string, updates: Partial<NetworkPort>) => void;
  onRemovePort: (id: string) => void;
}

export const NetworkConfiguration: React.FC<NetworkConfigurationProps> = ({
  networkPorts,
  onAddPort,
  onUpdatePort,
  onRemovePort
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Network Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={onAddPort}>
            <Plus className="h-4 w-4 mr-1" />
            Add Network Port
          </Button>
        </div>
        
        {networkPorts.map(port => (
          <PortConfigItem
            key={port.id}
            port={port}
            onUpdate={(updates) => onUpdatePort(port.id, updates)}
            onRemove={() => onRemovePort(port.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
};