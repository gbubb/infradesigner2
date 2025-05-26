import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Server } from 'lucide-react';

interface RackPropertiesCardProps {
  rack: {
    id: string;
    name: string;
    azName?: string;
    availabilityZoneId?: string;
    rackType?: string;
  } | undefined;
  azNameMap: Record<string, string>;
}

export const RackPropertiesCard: React.FC<RackPropertiesCardProps> = ({ rack, azNameMap }) => {
  let displayAzName = 'N/A';

  if (rack) {
    if (rack.availabilityZoneId && azNameMap && azNameMap[rack.availabilityZoneId]) {
      displayAzName = azNameMap[rack.availabilityZoneId];
    } else if (rack.azName) {
      displayAzName = rack.azName;
    } else if (rack.availabilityZoneId) {
      displayAzName = rack.availabilityZoneId;
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Rack Properties
        </h3>
        
        {rack ? (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Rack Name:</div>
            <div className="font-medium">{rack.name}</div>
            
            <div className="text-muted-foreground">Rack ID:</div>
            <div className="font-medium truncate">{rack.id}</div>
            
            <div className="text-muted-foreground">Availability Zone:</div>
            <div className="font-medium">{displayAzName}</div>
            
            <div className="text-muted-foreground">Rack Type:</div>
            <div className="font-medium">{rack.rackType || 'Standard'}</div>
          </div>
        ) : (
          <p className="text-muted-foreground">No rack selected</p>
        )}
      </CardContent>
    </Card>
  );
};
