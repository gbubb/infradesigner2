import React from 'react';
import { RackView } from '@/components/visualization/RackView';
import { RackUtilizationCard } from './RackUtilizationCard';
import { RackPropertiesCard } from './RackPropertiesCard';
import { RackPowerCard } from './RackPowerCard';
import { useDesignStore } from '@/store/designStore';

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
    azName?: string;
    availabilityZoneId?: string;
  } | undefined;
  azNameMap: Record<string, string>;
}

export const RackDetailView: React.FC<RackDetailViewProps> = ({
  rackProfileId,
  onDeviceClick,
  rackStats,
  selectedRack,
  azNameMap
}) => {
  const { activeDesign } = useDesignStore();
  const powerPerRack = activeDesign?.requirements?.physicalConstraints?.powerPerRackWatts || 5000;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Rack visualization - takes 7 columns */}
      <div className="md:col-span-7 flex justify-center items-center h-full">
        {/* Ensure rack view is always centered in its column with margin auto */}
        <div className="flex justify-center mx-auto w-full">
          <RackView 
            rackProfileId={rackProfileId}
            height={700}
            width={300}
            showLabels={true}
            labelInterval={5}
            onDeviceClick={onDeviceClick}
            onDeviceRemoved={() => {
              // This will trigger a refresh of the stats when a device is removed
              console.log("Device removed from rack view");
            }}
          />
        </div>
      </div>
      {/* Rack info - takes 5 columns */}
      <div className="md:col-span-5">
        <div className="space-y-6">
          {/* Rack Utilization Card */}
          <RackUtilizationCard rackStats={rackStats} />
          {/* Rack Power Card */}
          <RackPowerCard rackProfileId={rackProfileId} powerCapacity={powerPerRack} />
          {/* Rack Properties */}
          <RackPropertiesCard rack={selectedRack} azNameMap={azNameMap} />
        </div>
      </div>
    </div>
  );
};
