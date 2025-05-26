
import React from 'react';
import { RackFilterControls } from './RackFilterControls';
import { RackHorizontalScroller } from './RackHorizontalScroller';

interface RackScrollerBlockProps {
  selectedAZ: string | 'all';
  setSelectedAZ: (az: string | 'all') => void;
  availabilityZones: any;
  selectedRackId: string | null;
  setSelectedRackId: (id: string) => void;
  filteredRacks: Array<{ id: string; name: string; azName?: string; availabilityZoneId?: string }>;
  scrollPosition: number;
  setScrollPosition: (v: number) => void;
  scrollStep: number;
  azNameMap: Record<string, string>;
}

export const RackScrollerBlock: React.FC<RackScrollerBlockProps> = ({
  selectedAZ,
  setSelectedAZ,
  availabilityZones,
  selectedRackId,
  setSelectedRackId,
  filteredRacks,
  scrollPosition,
  setScrollPosition,
  scrollStep,
  azNameMap
}) => (
  <>
    <RackFilterControls
      selectedAZ={selectedAZ}
      setSelectedAZ={setSelectedAZ}
      availabilityZones={availabilityZones}
      selectedRackId={selectedRackId}
      setSelectedRackId={setSelectedRackId}
      filteredRacks={filteredRacks}
    />
    <RackHorizontalScroller
      racks={filteredRacks.map(rack => ({
        id: rack.id,
        name: rack.name,
        azName: rack.azName,
        availabilityZoneId: rack.availabilityZoneId
      }))}
      selectedRackId={selectedRackId}
      setSelectedRackId={setSelectedRackId}
      scrollPosition={scrollPosition}
      setScrollPosition={setScrollPosition}
      scrollStep={scrollStep}
      azNameMap={azNameMap}
    />
  </>
);
