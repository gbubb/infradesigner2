
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDesignStore } from '@/store/designStore';

interface CalculationBreakdownProps {
  roleId: string;
  roleName: string;
  children: React.ReactNode;
}

export const CalculationBreakdown: React.FC<CalculationBreakdownProps> = ({ 
  roleId, 
  roleName,
  children 
}) => {
  const getCalculationBreakdown = useDesignStore(state => state.getCalculationBreakdown);
  
  const breakdownSteps = getCalculationBreakdown(roleId);
  const hasBreakdown = breakdownSteps && breakdownSteps.length > 0;
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Calculation Breakdown for {roleName}</DialogTitle>
          <DialogDescription>
            How the required quantity was calculated
          </DialogDescription>
        </DialogHeader>
        
        {hasBreakdown ? (
          <div className="space-y-2 py-4">
            <ol className="list-decimal list-inside space-y-2">
              {breakdownSteps.map((step, index) => (
                <li key={index} className="text-sm">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            No detailed calculation available for this component.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
