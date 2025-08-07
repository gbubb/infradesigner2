/**
 * Utility to help organize imports consistently
 * Order: External packages → Internal imports → Types
 */

export interface ImportGroup {
  external: string[];
  internal: string[];
  types: string[];
  other: string[];
}

/**
 * Parse imports and group them by category
 */
export function groupImports(imports: string[]): ImportGroup {
  const groups: ImportGroup = {
    external: [],
    internal: [],
    types: [],
    other: []
  };

  imports.forEach(line => {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) return;
    
    // Check if it's a type import
    const isTypeImport = trimmed.startsWith('import type') || 
                        trimmed.includes('import { type') ||
                        trimmed.includes('import type {');
    
    // Check import source
    if (trimmed.includes("from '") || trimmed.includes('from "')) {
      const sourceMatch = trimmed.match(/from ['"](.+)['"]/);
      if (sourceMatch) {
        const source = sourceMatch[1];
        
        if (source.startsWith('@/')) {
          // Internal import
          if (isTypeImport || source.includes('/types/')) {
            groups.types.push(trimmed);
          } else {
            groups.internal.push(trimmed);
          }
        } else if (source.startsWith('.')) {
          // Relative import
          if (isTypeImport || source.includes('/types')) {
            groups.types.push(trimmed);
          } else {
            groups.internal.push(trimmed);
          }
        } else {
          // External package
          groups.external.push(trimmed);
        }
      }
    } else {
      // Other (side-effect imports, etc.)
      groups.other.push(trimmed);
    }
  });

  return groups;
}

/**
 * Sort imports within each group alphabetically
 */
export function sortImportGroup(imports: string[]): string[] {
  return imports.sort((a, b) => {
    // Extract the module name for comparison
    const getModuleName = (imp: string) => {
      const match = imp.match(/from ['"](.+)['"]/);
      return match ? match[1] : imp;
    };
    
    return getModuleName(a).localeCompare(getModuleName(b));
  });
}

/**
 * Organize imports according to the standard convention
 */
export function organizeImports(imports: string[]): string[] {
  const groups = groupImports(imports);
  
  const organized: string[] = [];
  
  // Add external imports
  if (groups.external.length > 0) {
    organized.push(...sortImportGroup(groups.external));
  }
  
  // Add blank line between groups
  if (groups.external.length > 0 && (groups.internal.length > 0 || groups.types.length > 0)) {
    organized.push('');
  }
  
  // Add internal imports
  if (groups.internal.length > 0) {
    organized.push(...sortImportGroup(groups.internal));
  }
  
  // Add blank line before types if there are any
  if ((groups.external.length > 0 || groups.internal.length > 0) && groups.types.length > 0) {
    organized.push('');
  }
  
  // Add type imports
  if (groups.types.length > 0) {
    organized.push(...sortImportGroup(groups.types));
  }
  
  // Add other imports at the end
  if (groups.other.length > 0) {
    if (organized.length > 0) {
      organized.push('');
    }
    organized.push(...groups.other);
  }
  
  return organized;
}

/**
 * Example usage:
 * 
 * const imports = [
 *   "import React from 'react';",
 *   "import { ComponentType } from '@/types/infrastructure';",
 *   "import { useState } from 'react';",
 *   "import { Button } from '@/components/ui/button';",
 *   "import type { User } from '@/types/user';",
 * ];
 * 
 * const organized = organizeImports(imports);
 * // Result:
 * // import React from 'react';
 * // import { useState } from 'react';
 * // 
 * // import { Button } from '@/components/ui/button';
 * // 
 * // import { ComponentType } from '@/types/infrastructure';
 * // import type { User } from '@/types/user';
 */