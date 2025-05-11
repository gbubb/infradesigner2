
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { HardDrive } from 'lucide-react';

interface RackUtilizationCardProps {
  rackStats: {
    totalRU: number;
    usedRU: number;
    availableRU: number;
    utilizationPercentage: number;
    deviceCount: number;
  } | null;
}

export const RackUtilizationCard: React.FC<RackUtilizationCardProps> = ({ rackStats }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Rack Utilization
        </h3>
        
        {rackStats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Total RU:</div>
              <div className="font-medium">{rackStats.totalRU}U</div>
              
              <div className="text-muted-foreground">Used RU:</div>
              <div className="font-medium">{rackStats.usedRU}U</div>
              
              <div className="text-muted-foreground">Available RU:</div>
              <div className="font-medium">{rackStats.availableRU}U</div>
              
              <div className="text-muted-foreground">Device Count:</div>
              <div className="font-medium">{rackStats.deviceCount}</div>
              
              <div className="text-muted-foreground">Utilization:</div>
              <div className="font-medium">{rackStats.utilizationPercentage.toFixed(1)}%</div>
            </div>
            
            {/* Progress bar for utilization */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${rackStats.utilizationPercentage}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No utilization data available</p>
        )}
      </CardContent>
    </Card>
  );
};
