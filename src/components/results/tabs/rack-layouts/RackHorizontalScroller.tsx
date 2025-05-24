import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, HardDrive, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RackHorizontalScrollerProps {
  racks: Array<{ id: string; name: string; azName?: string; availabilityZoneId?: string }>;
  selectedRackId: string | null;
  setSelectedRackId: (id: string) => void;
  scrollPosition: number;
  setScrollPosition: (position: number) => void;
  scrollStep: number;
  azNameMap: Record<string,string>; // <-- new prop
}

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
            <div key={`rack-card-${rack.id}`} className="flex-shrink-0">
              <Card 
                className={`w-[130px] h-[280px] cursor-pointer ${selectedRackId === rack.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedRackId(rack.id)}
              >
                <CardContent className="p-2 flex flex-col items-center">
                  <div className="bg-muted w-full h-[220px] rounded relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      { // use string match to compare
                        (azNameMap[rack.availabilityZoneId ?? ''] || rack.azName) === 'Core'
                        ? <Database className="h-10 w-10 text-muted-foreground" />
                        : <HardDrive className="h-10 w-10 text-muted-foreground" />
                      }
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <div className="font-medium text-xs truncate w-full">{getDisplayRackName(rack.name)}</div>
                    <div className="text-xs text-muted-foreground">
                      {azNameMap[rack.availabilityZoneId ?? ''] || rack.azName || '—'}
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
