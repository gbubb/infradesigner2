
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

  // Determine a specific note based on the role type
  const getContextNote = () => {
    if (role?.role === 'storageNode') {
      return "For storage calculations, the effective capacity factors in both the storage pool type efficiency and the maximum recommended fill percentage.";
    } else if (role?.role === 'computeNode') {
      return "For compute nodes, we calculate based on both CPU and memory requirements, using the higher of the two values.";
    } else if (role?.role === 'gpuNode') {
      return "For GPU nodes, we calculate based on both CPU and memory requirements, plus additional nodes for redundancy.";
    } else {
      return "For redundancy calculations, we ensure that additional nodes are evenly distributed across all availability zones by rounding up to the nearest multiple of the total AZ count.";
    }
  };
  
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
              <p>{getContextNote()}</p>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            <p>No detailed calculation available for this component.</p>
            <p className="mt-2">Try assigning a component to see the calculation breakdown.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
