
import { ComponentRole } from '@/types/infrastructure';

/**
 * Updates the required count for a role
 */
export const updateRoleRequiredCount = (
  componentRoles: ComponentRole[],
  roleId: string,
  newQuantity: number
): ComponentRole[] => {
  return componentRoles.map(r => {
    if (r.id === roleId) {
      return {
        ...r,
        adjustedRequiredCount: newQuantity
      };
    }
    return r;
  });
};

/**
 * Assigns a component to a role
 */
export const assignComponentToRole = (
  componentRoles: ComponentRole[],
  roleId: string,
  componentId: string
): ComponentRole[] => {
  return componentRoles.map(role => {
    if (role.id === roleId) {
      return {
        ...role,
        assignedComponentId: componentId,
        adjustedRequiredCount: undefined
      };
    }
    return role;
  });
};

/**
 * Gets a role by ID
 */
export const getRoleById = (
  componentRoles: ComponentRole[],
  roleId: string
): ComponentRole | undefined => {
  return componentRoles.find(r => r.id === roleId);
};
