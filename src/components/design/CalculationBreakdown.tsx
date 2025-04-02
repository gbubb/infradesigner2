
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
import { Card } from '@/components/ui/card';

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
  const componentRoles = useDesignStore(state => state.componentRoles);
  const calculateRequiredQuantity = useDesignStore(state => state.calculateRequiredQuantity);
  
  const role = componentRoles.find(r => r.id === roleId);
  const clusterName = role?.clusterInfo?.clusterName;
  
  // Force calculation to ensure we have fresh breakdown
  if (role && role.assignedComponentId) {
    calculateRequiredQuantity(roleId, role.assignedComponentId);
  }
  
  // Now get the breakdown after calculation
  const breakdownSteps = getCalculationBreakdown(roleId);
  const hasBreakdown = breakdownSteps && breakdownSteps.length > 0;
  
  // Build the title with cluster name if available
  const titleText = clusterName 
    ? `Calculation Breakdown for ${roleName} (${clusterName})` 
    : `Calculation Breakdown for ${roleName}`;
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>
            How the required quantity was calculated
          </DialogDescription>
        </DialogHeader>
        
        {hasBreakdown ? (
          <div className="space-y-2 py-4">
            <Card className="p-4 bg-slate-50">
              <ol className="list-decimal list-inside space-y-2">
                {breakdownSteps.map((step, index) => (
                  <li key={index} className="text-sm mb-2">
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
            <div className="mt-4 text-sm text-muted-foreground border-t pt-4">
              {role?.role === 'storageNode' ? (
                <p>Note: For storage calculations, the effective capacity factors in both the storage pool type efficiency and the maximum recommended fill percentage.</p>
              ) : (role?.role === 'computeNode' || role?.role === 'gpuNode') ? (
                <p>Note: For redundancy calculations, we ensure that additional nodes are evenly distributed across all availability zones by rounding up to the nearest multiple of the total AZ count.</p>
              ) : (
                <p>Note: For redundancy calculations, we ensure that additional nodes are evenly distributed across all availability zones by rounding up to the nearest multiple of the total AZ count.</p>
              )}
            </div>
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
