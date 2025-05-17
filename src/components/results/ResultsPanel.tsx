import React, { useCallback, useEffect, useState } from 'react';
import { useDesignStore, manualRecalculateDesign } from '@/store/designStore';
import { toast } from 'sonner';
import { LoadingSpinner } from './LoadingSpinner';
import { ResultsHeader } from './ResultsHeader';
import { ResultsTabs } from './tabs/ResultsTabs';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';

export const ResultsPanel: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const saveDesign = useDesignStore(state => state.saveDesign);
  const componentRoles = useDesignStore(state => state.componentRoles);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasCalculated, setHasCalculated] = useState(false);
  
  // Use memoized design calculations through dedicated hook
  const { designErrors, hasValidDesign } = useDesignCalculations();
  
  // Force recalculation when the component mounts, but only once
  useEffect(() => {
    if (!hasCalculated) {
      setIsLoading(true);
      
      // Use a short delay to ensure store is fully initialized
      const timer = setTimeout(() => {
        try {
          // Force recalculation of the design
          manualRecalculateDesign();
          
          // Save the design to ensure it's persisted, but only if it exists
          if (activeDesign) {
            saveDesign();
          }
          
          setHasCalculated(true);
        } catch (error) {
          console.error("Error during initial calculation:", error);
          toast.error("Failed to calculate design. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [activeDesign?.id, hasCalculated, saveDesign]);
  
  // Handle manual recalculation
  const handleRecalculate = useCallback(() => {
    setIsLoading(true);
    
    try {
      manualRecalculateDesign();
      
      if (activeDesign) {
        saveDesign();
      }
      
      setHasCalculated(true);
      toast.success("Design recalculated successfully");
    } catch (error) {
      console.error("Error during manual recalculation:", error);
      toast.error("Failed to recalculate design. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [activeDesign, saveDesign]);

  // Force recalculation of all assigned components
  const handleForceFullRecalculation = useCallback(() => {
    setIsLoading(true);
    
    try {
      // Get assigned roles
      const assignedRoles = componentRoles.filter(role => role.assignedComponentId);
      console.log(`Force recalculating ${assignedRoles.length} assigned components`);
      
      // Recalculate each role one by one with logging
      const { calculateRequiredQuantity } = useDesignStore.getState();
      assignedRoles.forEach(role => {
        if (role.assignedComponentId) {
          console.log(`Recalculating ${role.role} (${role.id})`);
          const newQuantity = calculateRequiredQuantity(role.id, role.assignedComponentId);
          console.log(`New quantity for ${role.role}: ${newQuantity}`);
        }
      });
      
      // Final recalculation and save
      manualRecalculateDesign();
      
      if (activeDesign) {
        saveDesign();
      }
      
      toast.success(`Recalculated ${assignedRoles.length} components`);
    } catch (error) {
      console.error("Error during force recalculation:", error);
      toast.error("Failed to recalculate components. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [componentRoles, activeDesign, saveDesign]);
  
  // Derived state
  const hasNoDesign = !hasValidDesign;

  // Show loading state while calculating
  if (isLoading) {
    return (
      <div className="w-full p-6">
        <ResultsHeader 
          onRecalculate={handleRecalculate}
          onForceFullRecalculation={handleForceFullRecalculation}
        />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      <ResultsHeader 
        onRecalculate={handleRecalculate}
        onForceFullRecalculation={handleForceFullRecalculation}
      />
      <ResultsTabs 
        designErrors={designErrors}
        hasNoDesign={hasNoDesign}
      />
    </div>
  );
};
