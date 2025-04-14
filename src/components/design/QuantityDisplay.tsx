import React from 'react';
import { CalculationBreakdown } from './CalculationBreakdown';
import { Info } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface QuantityDisplayProps {
  roleId: string;
  roleName: string;
  quantity: number;
}

export const QuantityDisplay: React.FC<QuantityDisplayProps> = ({
  roleId,
  roleName,
  quantity
}) => {
  return (
    <div className="flex justify-between items-center space-x-2">
      <span className="text-muted-foreground">Required:</span>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-medium">
          {quantity}
        </Badge>
        <CalculationBreakdown roleId={roleId} roleName={roleName} />
      </div>
    </div>
  );
};
