
import React from 'react';
import { CalculationBreakdown } from './CalculationBreakdown';
import { Info, Calculator } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

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
        <CalculationBreakdown roleId={roleId} roleName={roleName}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-blue-50 text-blue-500">
                  <Calculator className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>View calculation breakdown</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CalculationBreakdown>
      </div>
    </div>
  );
};
