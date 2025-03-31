
import { InfrastructureComponent, InfrastructureDesign, DesignRequirements, ComponentRole, StorageClusterRequirement, ClusterInfo, ComputeClusterRequirement } from '@/types/infrastructure';

export interface StoreState {
  // Component templates
  componentTemplates: InfrastructureComponent[];
  
  // Component roles for requirement calculation
  componentRoles: ComponentRole[];
  
  // Selected disks for storage nodes (key is roleId, value is array of disk configs)
  selectedDisksByRole: Record<string, { diskId: string, quantity: number }[]>;
  
  // Selected GPUs for compute nodes (key is roleId, value is array of GPU configs)
  selectedGPUsByRole: Record<string, { gpuId: string, quantity: number }[]>;
  
  // Requirements
  requirements: DesignRequirements;
  
  // Calculation breakdowns for role calculations
  calculationBreakdowns: Record<string, string[]>;
  
  // Designs
  savedDesigns: InfrastructureDesign[];
  activeDesign: InfrastructureDesign | null;
  
  // Workspace components
  placedComponents: Record<string, InfrastructureComponent>;
  workspaceComponents: any[]; // this should be more specific
  selectedComponentId: string | null;
  
  // Editing state
  editingComponentId: string | null;
  
  // Function to update selected disks for a role
  updateSelectedDisksForRole: (roleId: string, disks: { diskId: string, quantity: number }[]) => void;
}

// Define individual slice states if needed
export interface RequirementsState extends StoreState {}
export interface DesignState extends StoreState {}
export interface WorkspaceState extends StoreState {}
export interface ComponentLibraryState extends StoreState {}
