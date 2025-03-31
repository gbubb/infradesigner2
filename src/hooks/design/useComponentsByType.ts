
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';

export const useComponentsByType = () => {
  const { activeDesign } = useDesignStore();
  
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

  return {
    componentsByType
  };
};
