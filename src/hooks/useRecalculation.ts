
import { useCallback } from 'react';
import { useDesignStore, manualRecalculateDesign } from '@/store/designStore';
import { toast } from 'sonner';

export const useRecalculation = () => {
  const { activeDesign, saveDesign, componentRoles } = useDesignStore();
  
  const handleRecalculate = useCallback(() => {
    try {
      manualRecalculateDesign();
      
      if (activeDesign) {
        saveDesign();
      }
      
      toast.success("Design recalculated successfully");
    } catch (error) {
      console.error("Error during manual recalculation:", error);
      toast.error("Failed to recalculate design. Please try again.");
    }
  }, [activeDesign, saveDesign]);

  const handleForceFullRecalculation = useCallback(() => {
    try {
      const assignedRoles = componentRoles.filter(role => role.assignedComponentId);
      console.log(`Force recalculating ${assignedRoles.length} assigned components`);
      
      const { calculateRequiredQuantity } = useDesignStore.getState();
      assignedRoles.forEach(role => {
        if (role.assignedComponentId) {
          console.log(`Recalculating ${role.role} (${role.id})`);
          const newQuantity = calculateRequiredQuantity(role.id, role.assignedComponentId);
          console.log(`New quantity for ${role.role}: ${newQuantity}`);
        }
      });
      
      manualRecalculateDesign();
      
      if (activeDesign) {
        saveDesign();
      }
      
      toast.success(`Recalculated ${assignedRoles.length} components`);
    } catch (error) {
      console.error("Error during force recalculation:", error);
      toast.error("Failed to recalculate components. Please try again.");
    }
  }, [componentRoles, activeDesign, saveDesign]);
  
  return {
    handleRecalculate,
    handleForceFullRecalculation
  };
};
