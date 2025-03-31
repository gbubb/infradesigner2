
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

  // Check if a component is the default for its type/role combination
  const isDefaultForTypeAndRole = (componentId: string) => {
    const component = componentTemplates.find(c => c.id === componentId);
    if (!component) return false;
    
    // Find all components with the same type and role
    const sameTypeAndRole = componentTemplates.filter(
      c => c.type === component.type && c.role === component.role
    );
    
    // If there's only one of this type+role, it's effectively the default
    if (sameTypeAndRole.length === 1) return true;
    
    // Check if this component is marked as default
    return component.isDefault === true;
  };

  return {
    componentsByType,
    findDefaultComponent,
    isDefaultForTypeAndRole
  };
};
