
import React from 'react';
import { RackView } from '@/components/visualization/RackView';
import { DevicePalette } from '@/components/palette/DevicePalette';
import { RackUtilizationCard } from './RackUtilizationCard';
import { RackPropertiesCard } from './RackPropertiesCard';

interface RackDetailViewProps {
  rackProfileId: string;
  onDeviceClick: (deviceId: string) => void;
  rackStats: {
    totalRU: number;
    usedRU: number;
    availableRU: number;
    utilizationPercentage: number;
    deviceCount: number;
  } | null;
  selectedRack: {
    id: string;
    name: string;
    azName: string;
  } | undefined;
}

export const RackDetailView: React.FC<RackDetailViewProps> = ({
  rackProfileId,
  onDeviceClick,
  rackStats,
  selectedRack
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Rack visualization - takes 7 columns */}
      <div className="md:col-span-7">
        <div className="flex justify-center">
          <RackView 
            rackProfileId={rackProfileId}
            height={700}
            width={300}
            showLabels={true}
            labelInterval={5}
            onDeviceClick={onDeviceClick}
          />
        </div>
      </div>
      
      {/* Device palette and rack info - takes 5 columns */}
      <div className="md:col-span-5">
        <div className="space-y-6">
          {/* Device Palette for drag and drop */}
          <DevicePalette />
          
          {/* Rack Utilization Card */}
          <RackUtilizationCard rackStats={rackStats} />
          
          {/* Rack Properties */}
          <RackPropertiesCard rack={selectedRack} />
        </div>
      </div>
    </div>
  );
};
