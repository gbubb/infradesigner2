
import React, { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RackUtilizationCard } from './RackUtilizationCard';
import { RackPropertiesCard } from './RackPropertiesCard';
import { RackView } from '@/components/visualization/RackView';
import { RackProfile } from '@/types/infrastructure/rack-types';

interface RackDetailViewProps {
  rackProfileId: string;
  onDeviceClick?: (deviceId: string) => void;
  rackStats: {
    totalRU: number;
    usedRU: number;
    availableRU: number;
    utilizationPercentage: number;
    deviceCount: number;
  } | null;
  selectedRack?: RackProfile;
  onDevicePlaced?: () => void;
}

export const RackDetailView: React.FC<RackDetailViewProps> = ({
  rackProfileId,
  onDeviceClick,
  rackStats,
  selectedRack,
  onDevicePlaced
}) => {
  const handleDeviceClick = useCallback((deviceId: string) => {
    if (onDeviceClick) {
      onDeviceClick(deviceId);
    }
  }, [onDeviceClick]);

  const handleDevicePlaced = useCallback(() => {
    if (onDevicePlaced) {
      onDevicePlaced();
    }
  }, [onDevicePlaced]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Rack visualization - takes 3/4 of the space */}
      <div className="lg:col-span-3 order-2 lg:order-1">
        <Card>
          <CardContent className="pt-6">
            <RackView 
              rackId={rackProfileId} 
              onDeviceClick={handleDeviceClick}
              onDevicePlaced={handleDevicePlaced}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Rack info panels - take 1/4 of the space */}
      <div className="lg:col-span-1 space-y-4 order-1 lg:order-2">
        <RackUtilizationCard rackStats={rackStats} />
        <RackPropertiesCard rack={selectedRack} />
      </div>
    </div>
  );
};
