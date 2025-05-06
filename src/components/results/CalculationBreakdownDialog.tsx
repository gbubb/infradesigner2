import React, { useState } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator } from 'lucide-react';

interface CalculationBreakdownDialogProps {
  roleId: string;
  roleName: string;
  children?: React.ReactNode;
}

export const CalculationBreakdownDialog: React.FC<CalculationBreakdownDialogProps> = ({ 
  roleId, 
  roleName,
  children
}) => {
  const [open, setOpen] = useState(false);
  const [breakdownSteps, setBreakdownSteps] = useState<string[]>([]);
  const [calculatedQuantity, setCalculatedQuantity] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const store = useDesignStore();
  
  const role = store.componentRoles.find(r => r.id === roleId);
  const clusterName = role?.clusterInfo?.clusterName;
  const roleType = role?.role || '';
  
  const handleOpenDialog = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setCalculatedQuantity(null);
    setBreakdownSteps([]);
    
    try {
      // Get calculation breakdown from store or role
      if (role?.assignedComponentId) {
        let displayedSteps: string[] = [];
        
        // If we have calculation steps stored in the role, use those first
        if (role.calculationSteps && role.calculationSteps.length > 0) {
          displayedSteps = [...role.calculationSteps];
        }
        // Otherwise try to get them from the store calculation breakdown
        else {
          const storeBreakdown = store.getCalculationBreakdown(roleId);
          if (storeBreakdown && storeBreakdown.length > 0) {
            displayedSteps = [...storeBreakdown];
          }
        }
        
        // If we still don't have steps, create a basic breakdown
        if (displayedSteps.length === 0) {
          // Create basic breakdown based on role type
          if (roleType === 'managementSwitch') {
            const totalAvailabilityZones = store.requirements.physicalConstraints.totalAvailabilityZones || 1;
            const managementNetwork = store.requirements.networkRequirements.managementNetwork || 'Dual Home';
            
            displayedSteps = [
              `Management Network: ${managementNetwork}`,
              `Management Switches Per AZ: ${managementNetwork.includes("Dual") ? 2 : 1}`,
              `Total Management Switches: ${managementNetwork.includes("Dual") ? 2 : 1} switches/AZ × ${totalAvailabilityZones} AZs = ${(managementNetwork.includes("Dual") ? 2 : 1) * totalAvailabilityZones} switches`
            ];
          } else if (roleType === 'ipmiSwitch') {
            const totalAvailabilityZones = store.requirements.physicalConstraints.totalAvailabilityZones || 1;
            
            displayedSteps = [
              `IPMI Network: Dedicated IPMI switch`,
              `IPMI Switches: 1 switch/AZ × ${totalAvailabilityZones} AZs = ${totalAvailabilityZones} switches`
            ];
          } else {
            displayedSteps = [
              `Role: ${roleName} ${roleType ? `(${roleType})` : ''}`,
              `Component: ${role.assignedComponentId ? 'Assigned' : 'None'}`,
              `Calculated quantity: ${role.adjustedRequiredCount || role.requiredCount || 'N/A'}`
            ];
          }
        }
        
        const quantity = store.calculateRequiredQuantity(roleId, role.assignedComponentId);
        setBreakdownSteps(displayedSteps);
        setCalculatedQuantity(quantity);
      } else {
        setBreakdownSteps(['No component assigned to this role.']);
      }
    } catch (error) {
      console.error('Error fetching calculation breakdown:', error);
      setErrorMessage(`Error loading calculation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setBreakdownSteps(['Failed to load calculation steps.']);
    } finally {
      setIsLoading(false);
    }
    
    setOpen(true);
  };
  
  // Get the current displayed quantity
  const currentDisplayedQuantity = role ? (role.adjustedRequiredCount || role.requiredCount) : null;
  
  // Check for discrepancy between calculated and displayed quantity
  const hasDiscrepancy = calculatedQuantity !== null && 
                         currentDisplayedQuantity !== null && 
                         calculatedQuantity !== currentDisplayedQuantity;
  
  return (
    <>
      {/* Trigger element */}
      {children ? (
        <span onClick={handleOpenDialog}>
          {children}
        </span>
      ) : (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-5 w-5 rounded-full" 
          onClick={handleOpenDialog}
          type="button"
        >
          <Calculator className="h-3 w-3" />
          <span className="sr-only">View calculation</span>
        </Button>
      )}
      
      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Calculation for {roleName} {clusterName ? `(${clusterName})` : ''}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {isLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Loading breakdown...
              </div>
            ) : (
              <>
                {errorMessage && (
                  <Alert variant="destructive" className="mb-2">
                    <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                  </Alert>
                )}

                {hasDiscrepancy && (
                  <Alert className="mb-2">
                    <AlertDescription className="text-xs">
                      <strong>Notice:</strong> Displayed quantity ({currentDisplayedQuantity ?? 'N/A'}) differs from calculated ({calculatedQuantity ?? 'N/A'}). Breakdown reflects calculation.
                    </AlertDescription>
                  </Alert>
                )}

                {breakdownSteps && breakdownSteps.length > 0 ? (
                  <Card className="p-3 bg-slate-50 max-h-[300px] overflow-y-auto">
                    <ol className="list-decimal list-inside space-y-1.5">
                      {breakdownSteps.map((step, index) => (
                        <li key={index} className="text-xs">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </Card>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No detailed calculation available. {!role?.assignedComponentId && "Assign a component."}
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
