
/**
 * Utility helpers to classify component types for placement.
 */

export function getTypeKey(component: any): string {
  return (
    component.namingPrefix ||
    component.typePrefix ||
    component.type ||
    (component.role && component.role.toLowerCase())
  ).toString().toLowerCase();
}

export function isCoreNetwork(component: any): boolean {
  const coreKeys = ['firewall', 'spineswitch', 'borderleafswitch', 'border-switch', 'spine-switch', 'router', 'core'];
  const typeStr = (
    (component.role ? component.role.toLowerCase() : '')
    + ' '
    + (component.type ? String(component.type).toLowerCase() : '')
  );
  return coreKeys.some(key => typeStr.includes(key));
}
