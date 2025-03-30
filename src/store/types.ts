
import { 
  ComponentRole, 
  DesignRequirements, 
  InfrastructureComponent, 
  InfrastructureDesign
} from '@/types/infrastructure';
import { ComponentWithPosition } from '@/types/workspace';

// Base state shared by all store slices
export interface BaseState {
  // Selected component ID
  selectedComponentId: string | null;
  // Currently editing component ID
  editingComponentId: string | null;
}

// Design state slice
export interface DesignState extends BaseState {
  // Design requirements
  requirements: DesignRequirements;
  // Saved designs
  savedDesigns: InfrastructureDesign[];
  // Currently active design
  activeDesign: InfrastructureDesign | null;
}

// Workspace state slice
export interface WorkspaceState extends BaseState {
  // Components placed in the workspace
  placedComponents: Record<string, InfrastructureComponent>;
  // Components with position in the workspace
  workspaceComponents: ComponentWithPosition[];
}

// Component Library state slice
export interface ComponentLibraryState {
  // All available component templates
  componentTemplates: InfrastructureComponent[];
}

// Requirements slice interface - needed to define the structure
export interface RequirementsState {
  // Component roles based on requirements
  componentRoles: ComponentRole[];
}

// Combined store state
export interface StoreState extends 
  DesignState, 
  WorkspaceState, 
  ComponentLibraryState,
  RequirementsState {
    // Add any additional properties that need to be combined
}
