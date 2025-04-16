
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
  
  const handleOpenDialog = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setCalculatedQuantity(null);
    setBreakdownSteps([]);
    
    try {
      // Get calculation breakdown from store
      if (role?.assignedComponentId) {
        const breakdownData = store.getCalculationBreakdown(roleId);
        const quantity = store.calculateRequiredQuantity(roleId, role.assignedComponentId);
        
        if (breakdownData && breakdownData.length > 0) {
          setBreakdownSteps(breakdownData);
          setCalculatedQuantity(quantity);
        } else if (role.calculationSteps && role.calculationSteps.length > 0) {
          // Use the calculation steps stored in the role if available
          setBreakdownSteps(role.calculationSteps);
          setCalculatedQuantity(quantity);
        } else {
          // Fallback if no breakdown is available
          setBreakdownSteps([
            `Role: ${roleName}`,
            `Component: ${role.assignedComponentId ? 'Assigned' : 'None'}`,
            `Calculated quantity: ${quantity || 'N/A'}`
          ]);
          setCalculatedQuantity(quantity);
        }
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
