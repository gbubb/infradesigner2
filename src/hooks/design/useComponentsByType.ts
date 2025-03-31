
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';

export const useComponentsByType = () => {
  const { activeDesign, componentTemplates } = useDesignStore();
  
  // Component types grouping
  const componentsByType = useMemo(() => {
    if (!activeDesign?.components) return {};
    
    return activeDesign.components.reduce((groups, component) => {
      const type = component.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(component);
      return groups;
    }, {} as Record<string, any[]>);
  }, [activeDesign]);

  // Find default component for each type/role combination
  const findDefaultComponent = (type: ComponentType, role: string) => {
    return componentTemplates.find(component => 
      component.type === type && 
      component.role === role && 
      component.isDefault
    );
  };

  return {
    componentsByType,
    findDefaultComponent
  };
};
