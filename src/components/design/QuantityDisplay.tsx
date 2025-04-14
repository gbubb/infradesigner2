import React from 'react';
import { CalculationBreakdown } from './CalculationBreakdown';
import { Badge } from '../ui/badge';

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
        <CalculationBreakdown roleId={roleId} roleName={roleName}>
          <Badge variant="outline" className="font-medium cursor-help">
            {quantity}
          </Badge>
        </CalculationBreakdown>
      </div>
    </div>
  );
};
