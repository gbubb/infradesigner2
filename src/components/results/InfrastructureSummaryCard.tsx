
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InfrastructureSummaryProps {
  totalServers: number;
  totalLeafSwitches: number;
  totalMgmtSwitches: number;
  totalRackUnits: number;
  totalPower: number;
}

export const InfrastructureSummaryCard: React.FC<InfrastructureSummaryProps> = ({
  totalServers,
  totalLeafSwitches,
  totalMgmtSwitches,
  totalRackUnits,
  totalPower
}) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Infrastructure Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Servers:</span>
            <span className="font-medium">{totalServers}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Data Plane Switches:</span>
            <span className="font-medium">{totalLeafSwitches}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Management Switches:</span>
            <span className="font-medium">{totalMgmtSwitches}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Rack Units:</span>
            <span className="font-medium">{totalRackUnits} RU</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Power:</span>
            <span className="font-medium">{totalPower.toLocaleString()} W</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
