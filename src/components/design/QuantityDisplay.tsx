
import React from 'react';
import { CalculationBreakdown } from './CalculationBreakdown';
import { Info } from 'lucide-react';
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
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">Required:</span>
      <CalculationBreakdown roleId={roleId} roleName={roleName}>
        <div className="cursor-pointer flex items-center group">
          <Badge variant="outline" className="group-hover:bg-accent transition-colors">
            {quantity}
            <Info className="h-3.5 w-3.5 ml-1 text-blue-500" />
          </Badge>
        </div>
      </CalculationBreakdown>
    </div>
  );
};
