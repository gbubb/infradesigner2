
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

/**
 * Calculates and updates the role with required count in a single operation
 * This prevents race conditions by doing the assignment and quantity update in one go
 */
export const assignComponentAndCalculateQuantity = (
  componentRoles: ComponentRole[],
  roleId: string,
  componentId: string,
  calculatedQuantity: number
): ComponentRole[] => {
  return componentRoles.map(role => {
    if (role.id === roleId) {
      return {
        ...role,
        assignedComponentId: componentId,
        adjustedRequiredCount: calculatedQuantity
      };
    }
    return role;
  });
};
