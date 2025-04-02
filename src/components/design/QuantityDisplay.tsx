
import React from 'react';
import { CalculationBreakdown } from './CalculationBreakdown';
import { Info } from 'lucide-react';

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
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">Required:</span>
      <CalculationBreakdown roleId={roleId} roleName={roleName}>
        <div className="cursor-pointer underline text-primary hover:text-primary/80 flex items-center">
          {quantity}
          <Info className="h-4 w-4 ml-1 text-blue-500" />
        </div>
      </CalculationBreakdown>
    </div>
  );
};
