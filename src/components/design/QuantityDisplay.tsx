
import React from 'react';
import { CalculationBreakdown } from './CalculationBreakdown';

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
    <CalculationBreakdown roleId={roleId} roleName={roleName}>
      <span className="cursor-pointer underline text-primary hover:text-primary/80 flex items-center">
        {quantity}
        <span className="ml-1 text-xs text-muted-foreground">(click for details)</span>
      </span>
    </CalculationBreakdown>
  );
};
