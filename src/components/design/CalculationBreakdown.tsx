
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
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  const role = componentRoles.find(r => r.id === roleId);
  const clusterName = role?.clusterInfo?.clusterName;
  const roleType = role?.role || '';
  
  // Update breakdown steps whenever the dialog state changes or when role/assignment changes
  useEffect(() => {
    if (isOpen && role && role.assignedComponentId) {
      // Set loading state
      setIsLoading(true);
      
      // First ensure we have a fresh calculation
      const fetchCalculation = async () => {
        console.log(`Calculating for ${roleId} with component ${role.assignedComponentId} (attempt ${attempts + 1})`);
        
        // Force a calculation first 
        calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        // Add a small delay to ensure the calculation has had time to update state
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Now get the breakdown steps
        const steps = getCalculationBreakdown(roleId);
        console.log(`Got breakdown steps for ${roleId}:`, steps?.length || 0);
        
        if (steps && steps.length > 0) {
          setBreakdownSteps(steps);
          setIsLoading(false);
        } else if (attempts < 3) {
          console.log(`No breakdown steps found for ${roleId}, retrying...`);
          // Increment the attempt counter
          setAttempts(prevAttempts => prevAttempts + 1);
          
          // Try again with a longer delay
          setTimeout(() => {
            fetchCalculation();
          }, 300);
        } else {
          // After 3 attempts, stop trying and show whatever we have
          console.log(`Still no breakdown steps after ${attempts} attempts.`);
          setBreakdownSteps(getCalculationBreakdown(roleId) || []);
          setIsLoading(false);
        }
      };
      
      fetchCalculation();
    } else {
      // Reset attempts when dialog closes
      setAttempts(0);
    }
  }, [isOpen, role, roleId, getCalculationBreakdown, calculateRequiredQuantity, attempts]);
  
  // Handle calculation when dialog opens
  const handleDialogOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    
    if (!open) {
      // Reset state when dialog closes
      setAttempts(0);
      setIsLoading(false);
    }
  }, []);
  
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
        
        {isLoading ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
            <p className="text-sm text-muted-foreground">Calculating...</p>
          </div>
        ) : breakdownSteps && breakdownSteps.length > 0 ? (
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
