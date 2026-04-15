/**
 * Runtime type guards for validating data at application boundaries
 */

import {
  InfrastructureComponent,
  InfrastructureDesign,
  DesignRequirements,
  ComponentRole,
  ConnectionRule
} from '@/types/infrastructure';
import { PlacedComponent } from '@/types/placement';

/**
 * Type guard for InfrastructureComponent
 * Validates that an object has the required structure of a component
 */
export function isInfrastructureComponent(obj: unknown): obj is InfrastructureComponent {
  if (!obj || typeof obj !== 'object') return false;
  
  const component = obj as Record<string, unknown>;
  
  return (
    typeof component.id === 'string' &&
    typeof component.name === 'string' &&
    typeof component.type === 'string' &&
    typeof component.category === 'string' &&
    typeof component.price === 'number' &&
    typeof component.powerConsumption === 'number' &&
    typeof component.rackUnits === 'number' &&
    (component.isCustom === undefined || typeof component.isCustom === 'boolean')
  );
}

/**
 * Type guard for InfrastructureDesign
 * Validates the structure of a design object
 */
export function isInfrastructureDesign(obj: unknown): obj is InfrastructureDesign {
  if (!obj || typeof obj !== 'object') return false;
  
  const design = obj as Record<string, unknown>;
  
  return (
    typeof design.id === 'string' &&
    typeof design.name === 'string' &&
    Array.isArray(design.components) &&
    design.components.every(isInfrastructureComponent) &&
    (design.description === undefined || typeof design.description === 'string') &&
    (design.totalCost === undefined || typeof design.totalCost === 'number') &&
    (design.totalPower === undefined || typeof design.totalPower === 'number')
  );
}

/**
 * Type guard for DesignRequirements
 * Validates user input requirements
 */
export function isDesignRequirements(obj: unknown): obj is DesignRequirements {
  if (!obj || typeof obj !== 'object') return false;
  
  const req = obj as Record<string, unknown>;
  
  return (
    req.computeRequirements !== undefined &&
    typeof req.computeRequirements === 'object' &&
    req.storageRequirements !== undefined &&
    typeof req.storageRequirements === 'object' &&
    req.networkRequirements !== undefined &&
    typeof req.networkRequirements === 'object'
  );
}

/**
 * Type guard for ComponentRole
 * Validates component role structure
 */
export function isComponentRole(obj: unknown): obj is ComponentRole {
  if (!obj || typeof obj !== 'object') return false;
  
  const role = obj as Record<string, unknown>;
  
  return (
    typeof role.id === 'string' &&
    typeof role.name === 'string' &&
    typeof role.role === 'string' &&
    typeof role.category === 'string' &&
    typeof role.requiredCount === 'number'
  );
}

/**
 * Type guard for ConnectionRule
 * Validates connection rule structure
 */
export function isConnectionRule(obj: unknown): obj is ConnectionRule {
  if (!obj || typeof obj !== 'object') return false;
  
  const rule = obj as Record<string, unknown>;
  
  return (
    typeof rule.id === 'string' &&
    typeof rule.name === 'string' &&
    rule.sourceDevice !== undefined &&
    typeof rule.sourceDevice === 'object' &&
    rule.targetDevice !== undefined &&
    typeof rule.targetDevice === 'object' &&
    typeof rule.priority === 'number'
  );
}

/**
 * Type guard for PlacedComponent
 * Validates placed component in rack layout
 */
export function isPlacedComponent(obj: unknown): obj is PlacedComponent {
  if (!obj || typeof obj !== 'object') return false;
  
  const placed = obj as Record<string, unknown>;
  
  return (
    typeof placed.id === 'string' &&
    typeof placed.componentId === 'string' &&
    typeof placed.rackId === 'string' &&
    typeof placed.position === 'number' &&
    typeof placed.rackUnits === 'number' &&
    (placed.orientation === undefined || 
     placed.orientation === 'front' || 
     placed.orientation === 'rear')
  );
}

/**
 * Type guard for array of items
 * Validates that all items in array match the provided type guard
 */
export function isArrayOf<T>(
  arr: unknown,
  itemGuard: (item: unknown) => item is T
): arr is T[] {
  return Array.isArray(arr) && arr.every(itemGuard);
}

/**
 * Safe JSON parse with type validation
 * Returns typed data or null if invalid
 */
export function safeJsonParse<T>(
  json: string,
  typeGuard: (obj: unknown) => obj is T
): T | null {
  try {
    const parsed = JSON.parse(json);
    return typeGuard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Validates API response structure
 * Use at API boundaries to ensure data integrity
 */
export function validateApiResponse<T>(
  response: unknown,
  typeGuard: (obj: unknown) => obj is T,
  errorMessage = 'Invalid API response structure'
): T {
  if (!typeGuard(response)) {
    console.error('Validation failed for:', response);
    throw new Error(errorMessage);
  }
  return response;
}

/**
 * Validates and filters array items
 * Returns only items that match the type guard
 */
export function filterValidItems<T>(
  items: unknown[],
  typeGuard: (item: unknown) => item is T
): T[] {
  return items.filter(typeGuard);
}