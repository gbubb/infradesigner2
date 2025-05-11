
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ConnectionPanelProps {
  deviceId: string;
  onClose: () => void;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ deviceId, onClose }) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Device Connections: {deviceId}</span>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <p>Connection panel content (simplified for debugging)</p>
        </div>
      </CardContent>
    </Card>
  );
};
