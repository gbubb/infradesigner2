
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';

export const useComponentsByType = () => {
  const { activeDesign, componentTemplates } = useDesignStore();
  
  // Component types grouping
  const componentsByType = useMemo(() => {
    if (!activeDesign?.components) return {} as Record<ComponentType, any[]>;
    
    return activeDesign.components.reduce((groups, component) => {
      const type = component.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(component);
      return groups;
    }, {} as Record<ComponentType, any[]>);
  }, [activeDesign]);

  // Find default component for each type/role combination
  const findDefaultComponent = (type: ComponentType, role: string) => {
    // First, check for components with explicit role property matching
    const exactRoleMatch = componentTemplates.find(component => 
      component.type === type && 
      component.role === role && 
      component.isDefault
    );

    if (exactRoleMatch) return exactRoleMatch;

    // If no exact role match with default flag, check for implicit roles
    // based on serverRole or switchRole properties
    const implicitRoleMatch = componentTemplates.find(component => {
      if (component.type !== type) return false;
      
      // For servers, check serverRole
      if (type === ComponentType.Server) {
        const server = component as any;
        // Map DeviceRoleType to ServerRole
        const serverRoleMap: Record<string, string> = {
          'computeNode': 'compute',
          'gpuNode': 'gpu',
          'storageNode': 'storage',
          'controllerNode': 'controller',
          'infrastructureNode': 'controller'
        };
        return server.serverRole === serverRoleMap[role] && component.isDefault;
      }
      
      // For switches, check switchRole
      if (type === ComponentType.Switch) {
        const networkSwitch = component as any;
        // Map DeviceRoleType to SwitchRole
        const switchRoleMap: Record<string, string> = {
          'managementSwitch': 'management',
          'leafSwitch': 'leaf',
          'borderLeafSwitch': 'leaf',
          'spineSwitch': 'spine',
          'storageSwitch': 'leaf'
        };
        return networkSwitch.switchRole === switchRoleMap[role] && component.isDefault;
      }
      
      return false;
    });

    if (implicitRoleMatch) return implicitRoleMatch;

    // If still no match, just return any component of this type and role, default or not
    const anyMatchingComponent = componentTemplates.find(component => {
      if (component.type !== type) return false;
      
      if (type === ComponentType.Server) {
        const server = component as any;
        const serverRoleMap: Record<string, string> = {
          'computeNode': 'compute',
          'gpuNode': 'gpu',
          'storageNode': 'storage',
          'controllerNode': 'controller',
          'infrastructureNode': 'controller'
        };
        return server.serverRole === serverRoleMap[role];
      }
      
      if (type === ComponentType.Switch) {
        const networkSwitch = component as any;
        const switchRoleMap: Record<string, string> = {
          'managementSwitch': 'management',
          'leafSwitch': 'leaf',
          'borderLeafSwitch': 'leaf',
          'spineSwitch': 'spine',
          'storageSwitch': 'leaf'
        };
        return networkSwitch.switchRole === switchRoleMap[role];
      }
      
      return false;
    });

    return anyMatchingComponent;
  };

  // Check if a component is the default for its type/role combination
  const isDefaultForTypeAndRole = (componentId: string) => {
    const component = componentTemplates.find(c => c.id === componentId);
    if (!component) return false;
    
    // First check if this component has isDefault flag set
    if (component.isDefault) return true;
    
    // Determine role from component properties if not explicitly set
    const role = component.role || 
                (component as any).serverRole || 
                (component as any).switchRole || 
                'default';
    
    // Find all components with the same type and role
    const sameTypeAndRole = componentTemplates.filter(
      c => c.type === component.type && 
           (c.role === role || 
            (c as any).serverRole === (component as any).serverRole ||
            (c as any).switchRole === (component as any).switchRole)
    );
    
    // If there's only one of this type+role, it's effectively the default
    if (sameTypeAndRole.length === 1) return true;
    
    // If multiple exist, check if this specific one is marked as default
    return component.isDefault === true;
  };

  return {
    componentsByType,
    findDefaultComponent,
    isDefaultForTypeAndRole
  };
};
