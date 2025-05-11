import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ConnectionPanelProps {
  deviceId: string;
  onClose: () => void;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ deviceId, onClose }) => {
  const handleBasicClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const simulatedDeviceName = `Device ID (Debug): ${deviceId}`;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{simulatedDeviceName}</span>
          <Button variant="outline" size="sm" onClick={handleBasicClose}>Close</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground p-4">
          Connection panel is in MAXIMAL debug mode. No store access.
        </p>
      </CardContent>
    </Card>
  );
};
