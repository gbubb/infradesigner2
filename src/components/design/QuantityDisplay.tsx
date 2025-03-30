
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
      {quantity}
    </CalculationBreakdown>
  );
};
