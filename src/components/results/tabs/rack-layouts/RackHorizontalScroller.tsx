import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, HardDrive, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RackProfile } from '@/types/infrastructure/rack-types';
import { useDesignStore } from '@/store/designStore';
import { getDeviceColor } from '@/components/visualization/rack/rackUtils';
import { ComponentType } from '@/types/infrastructure/component-types';
import { RackService } from '@/services/rackService';

interface RackHorizontalScrollerProps {
  racks: Array<{ id: string; name: string; azName?: string; availabilityZoneId?: string }>;
  selectedRackId: string | null;
  setSelectedRackId: (id: string) => void;
  scrollPosition: number;
  setScrollPosition: (position: number) => void;
  scrollStep: number;
  azNameMap: Record<string, string>;
}

// Component to render a mini rack visualization
const MiniRackVisualization: React.FC<{ rack: { id: string; name: string; azName?: string; availabilityZoneId?: string } }> = ({ rack }) => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  
  // Get rack profile with device information using RackService
  const rackProfile = RackService.getRackProfile(rack.id);
  
  if (!rackProfile || !rackProfile.devices || rackProfile.devices.length === 0) {
    // Empty rack - show placeholder icon
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        {rack.azName === 'Core' ? (
          <Database className="h-8 w-8 text-muted-foreground" />
        ) : (
          <HardDrive className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
    );
  }

  const rackHeight = rackProfile.uHeight || 42; // Default 42U rack
  const deviceHeight = 220 / rackHeight; // Scale devices to fit in the 220px visualization area
  
  return (
    <div className="absolute inset-0 flex flex-col-reverse px-1">
      {rackProfile.devices.map((placedDevice, index) => {
        const component = activeDesign?.components.find(c => c.id === placedDevice.deviceId);
        if (!component) return null;
        
        const ruSize = component.ruSize || 1;
        const height = deviceHeight * ruSize;
        const bottom = deviceHeight * (placedDevice.ruPosition - 1);
        
        return (
          <div
            key={`${placedDevice.deviceId}-${index}`}
            className={`absolute left-1 right-1 border-l-2 ${getDeviceColor(component.type as ComponentType, component)} opacity-80`}
            style={{
              bottom: `${bottom}px`,
              height: `${height}px`,
              minHeight: '2px',
              fontSize: '0.5rem',
              lineHeight: '1',
            }}
            title={`${component.name} (${ruSize}U)`}
          >
            <div className="w-full h-full flex items-center justify-center text-xs font-medium truncate px-0.5">
              {ruSize > 3 ? component.name.substring(0, 8) : ''}
            </div>
          </div>
        );
      })}
      
      {/* Add RU markers for context */}
      <div className="absolute right-0 top-0 bottom-0 w-2 flex flex-col justify-between text-xs text-muted-foreground opacity-50">
        <div style={{ fontSize: '0.4rem' }}>{rackHeight}</div>
        <div style={{ fontSize: '0.4rem' }}>1</div>
      </div>
    </div>
  );
};

export const RackHorizontalScroller: React.FC<RackHorizontalScrollerProps> = ({
  racks,
  selectedRackId,
  setSelectedRackId,
  scrollPosition,
  setScrollPosition,
  scrollStep,
  azNameMap
}) => {
  const handleScrollLeft = () => {
    setScrollPosition(Math.max(0, scrollPosition - scrollStep));
  };
  
  const handleScrollRight = () => {
    setScrollPosition(scrollPosition + scrollStep);
  };

  const getDisplayRackName = (fullName: string) => {
    if (fullName.includes('-Rack')) {
      return fullName.split('-Rack')[1] ? `Rack ${fullName.split('-Rack')[1]}` : fullName;
    } else if (fullName.includes('Rack')) {
      // For names like "Core-Rack1" or just "Rack1"
      const parts = fullName.split('Rack');
      if (parts.length > 1 && parts[1]) return `Rack ${parts[1]}`;
    }
    return fullName; // Fallback
  };

  // Helper to get AZ display name
  const getAZDisplayName = (azName: string | undefined, azId: string | undefined) => {
    // Prefer azName as a key in map (if not a friendly name)
    if (azId && azNameMap[azId]) return azNameMap[azId];
    // Some legacy cases: azName might be a friendly name itself
    if (azName && !azNameMap[azName]) return azName;
    if (azName && azNameMap[azName]) return azNameMap[azName];
    return azId || "Unknown AZ";
  };

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        size="icon" 
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
        onClick={handleScrollLeft}
        disabled={scrollPosition <= 0}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <ScrollArea className="w-full h-[300px] overflow-x-auto border rounded-md">
        <div 
          className="flex space-x-4 p-4" 
          style={{ transform: `translateX(-${scrollPosition}px)`, transition: 'transform 0.3s' }}
        >
          {racks.map(rack => (
            <div key={`rack-card-${rack.id}`} className="shrink-0">
              <Card 
                className={`w-[130px] h-[280px] cursor-pointer ${selectedRackId === rack.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedRackId(rack.id)}
              >
                <CardContent className="p-2 flex flex-col items-center">
                  <div className="bg-muted w-full h-[220px] rounded relative border">
                    <MiniRackVisualization rack={rack} />
                  </div>
                  <div className="text-center mt-2">
                    <div className="font-medium text-xs truncate w-full">{getDisplayRackName(rack.name)}</div>
                    <div className="text-xs text-muted-foreground">
                      {getAZDisplayName(rack.azName, rack.availabilityZoneId)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <Button 
        variant="outline" 
        size="icon" 
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
        onClick={handleScrollRight}
        disabled={scrollPosition >= racks.length * 134 - 800}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
