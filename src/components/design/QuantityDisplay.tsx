
import React from 'react';
import { CalculationBreakdown } from './CalculationBreakdown';
import { Calculator } from 'lucide-react';
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
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1 bg-white hover:bg-blue-50 text-blue-600 border-blue-200"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Calculator className="h-3.5 w-3.5" />
          <span>View</span>
          <CalculationBreakdown roleId={roleId} roleName={roleName} />
        </Button>
      </div>
    </div>
  );
};
