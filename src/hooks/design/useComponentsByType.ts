
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType, Server, Switch, InfrastructureComponent } from '@/types/infrastructure';

export const useComponentsByType = () => {
  const { activeDesign, componentTemplates } = useDesignStore();
  
  // Component types grouping - includes attached disks as separate entries
  const componentsByType = useMemo(() => {
    if (!activeDesign?.components) return {} as Record<ComponentType, InfrastructureComponent[]>;
    
    const groups = activeDesign.components.reduce((acc, component) => {
      const type = component.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(component);
      
      // Also add attached disks as separate entries in the Disk category
      if ('attachedDisks' in component && Array.isArray(component.attachedDisks)) {
        const attachedDisks = component.attachedDisks as Array<InfrastructureComponent & { quantity?: number }>;
        attachedDisks.forEach(disk => {
          if (!acc[ComponentType.Disk]) {
            acc[ComponentType.Disk] = [];
          }
          // Create a disk entry with proper quantity
          acc[ComponentType.Disk].push({
            ...disk,
            quantity: disk.quantity || 1
          });
        });
      }
      
      return acc;
    }, {} as Record<ComponentType, InfrastructureComponent[]>);
    
    return groups;
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
        // Use type assertion to safely access serverRole
        const server = component as Server;
        if (!('serverRole' in server)) return false;
        
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
        // Use type assertion to safely access switchRole
        const networkSwitch = component as Switch;
        if (!('switchRole' in networkSwitch)) return false;
        
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
        // Use type assertion to safely access serverRole
        const server = component as Server;
        if (!('serverRole' in server)) return false;
        
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
        // Use type assertion to safely access switchRole
        const networkSwitch = component as Switch;
        if (!('switchRole' in networkSwitch)) return false;
        
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
    
    // Determine role based on component type
    let role = component.role || 'default';
    
    if (component.type === ComponentType.Server) {
      // Use safe type checking
      const serverComponent = component as Server;
      if ('serverRole' in serverComponent && serverComponent.serverRole) {
        role = serverComponent.serverRole;
      }
    }
    
    if (component.type === ComponentType.Switch) {
      // Use safe type checking
      const switchComponent = component as Switch;
      if ('switchRole' in switchComponent && switchComponent.switchRole) {
        role = switchComponent.switchRole;
      }
    }
    
    // Find all components with the same type and role
    const sameTypeAndRole = componentTemplates.filter(c => {
      if (c.type !== component.type) return false;
      
      // Determine role of the component being compared
      let compareRole = c.role || 'default';
      
      if (c.type === ComponentType.Server) {
        const serverComponent = c as Server;
        if ('serverRole' in serverComponent && serverComponent.serverRole) {
          compareRole = serverComponent.serverRole;
        }
      }
      
      if (c.type === ComponentType.Switch) {
        const switchComponent = c as Switch;
        if ('switchRole' in switchComponent && switchComponent.switchRole) {
          compareRole = switchComponent.switchRole;
        }
      }
      
      return compareRole === role;
    });
    
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
