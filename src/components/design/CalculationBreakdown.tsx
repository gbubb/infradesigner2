
import React, { useState, useCallback, useEffect } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [breakdownSteps, setBreakdownSteps] = useState<string[]>([]);
  const [forceUpdate, setForceUpdate] = useState(false); // Added to force re-renders
  
  const role = componentRoles.find(r => r.id === roleId);
  const clusterName = role?.clusterInfo?.clusterName;
  const roleType = role?.role || '';
  
  // Update breakdown steps whenever the dialog state changes or when forceUpdate changes
  useEffect(() => {
    if (isOpen && role && role.assignedComponentId) {
      // Get the breakdown steps
      const steps = getCalculationBreakdown(roleId);
      if (steps && steps.length > 0) {
        setBreakdownSteps(steps);
      } else {
        // If no breakdown steps available, force a calculation
        calculateRequiredQuantity(roleId, role.assignedComponentId);
        // Use setTimeout to ensure state updates have propagated
        setTimeout(() => {
          const freshSteps = getCalculationBreakdown(roleId);
          setBreakdownSteps(freshSteps || []);
        }, 100); // Increased timeout for better reliability
      }
    }
  }, [isOpen, role, roleId, getCalculationBreakdown, calculateRequiredQuantity, forceUpdate]);
  
  // Handle calculation when dialog opens
  const handleDialogOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    
    if (open && role && role.assignedComponentId) {
      // Force calculation to ensure we have fresh breakdown
      calculateRequiredQuantity(roleId, role.assignedComponentId);
      
      // Use setTimeout to ensure state updates have propagated
      setTimeout(() => {
        // Force an update to trigger the effect
        setForceUpdate(prev => !prev);
      }, 50);
    }
  }, [roleId, role, calculateRequiredQuantity]);
  
  // Build the title with cluster name if available
  const titleText = clusterName 
    ? `Calculation Breakdown for ${roleName} (${clusterName})` 
    : `Calculation Breakdown for ${roleName}`;

  // Determine a specific note based on the role type
  const getContextNote = () => {
    if (roleType === 'storageNode') {
      return "For storage calculations, the effective capacity factors in both the storage pool type efficiency and the maximum recommended fill percentage.";
    } else if (roleType === 'computeNode') {
      return "For compute nodes, we calculate based on both CPU and memory requirements, using the higher of the two values. Nodes are evenly distributed across availability zones.";
    } else if (roleType === 'gpuNode') {
      return "For GPU nodes, we calculate based on both CPU and memory requirements, plus additional nodes for redundancy. Nodes are evenly distributed across availability zones.";
    } else if (roleType.includes('Switch')) {
      return "For switches, the calculation ensures even distribution across racks and availability zones based on the network topology.";
    } else {
      return "For redundancy calculations, we ensure that additional nodes are evenly distributed across all availability zones by rounding up to the nearest multiple of the total AZ count.";
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
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
        
        {breakdownSteps && breakdownSteps.length > 0 ? (
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
