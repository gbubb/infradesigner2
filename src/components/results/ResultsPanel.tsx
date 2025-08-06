import React, { useCallback, useEffect, useState } from 'react';
import { useDesignStore, manualRecalculateDesign } from '@/store/designStore';
import { IntelligentDesignUpdater } from '@/store/calculations/intelligentDesignUpdater';
import { toast } from 'sonner';
import { LoadingSpinner } from './LoadingSpinner';
import { ResultsHeader } from './ResultsHeader';
import { ResultsTabs } from './tabs/ResultsTabs';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { RackProfile } from '@/types/infrastructure';

export const ResultsPanel: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const saveDesign = useDesignStore(state => state.saveDesign);
  const componentRoles = useDesignStore(state => state.componentRoles);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasCalculated, setHasCalculated] = useState(false);
  
  // Use memoized design calculations through dedicated hook
  const { designErrors, hasValidDesign } = useDesignCalculations();
  
  // Only recalculate when the design is invalid or missing components
  useEffect(() => {
    if (!hasCalculated) {
      setIsLoading(true);
      
      // Use a short delay to ensure store is fully initialized
      const timer = setTimeout(() => {
        try {
          // Only recalculate if the design is invalid (no components or component roles)
          // Also check if we have rack profiles with devices - if so, avoid recalculation to preserve layouts
          const hasRackLayouts = activeDesign?.rackprofiles && 
            Array.isArray(activeDesign.rackprofiles) && 
            activeDesign.rackprofiles.some((rack: RackProfile) => rack.devices && rack.devices.length > 0);
          
          const needsRecalculation = (!hasValidDesign || !componentRoles || componentRoles.length === 0) && !hasRackLayouts;
          
          if (needsRecalculation) {
            console.log("Results: Recalculating design because it's invalid or missing components");
            // Force recalculation of the design
            manualRecalculateDesign();
            
            // Save the design to ensure it's persisted
            if (activeDesign) {
              saveDesign();
            }
          } else {
            console.log("Results: Design is already valid, skipping recalculation to preserve rack layouts and Row Layout configurations");
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
  }, [activeDesign, activeDesign?.id, hasCalculated, hasValidDesign, componentRoles, saveDesign]);
  
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
