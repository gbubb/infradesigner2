
import { 
  InfrastructureComponent, 
  InfrastructureDesign, 
  DesignRequirements, 
  ComponentRole, 
  StorageClusterRequirement, 
  ClusterInfo, 
  ComputeClusterRequirement, 
  ComponentType 
} from '@/types/infrastructure';

export interface StoreState {
  // Component templates
  componentTemplates: InfrastructureComponent[];
  
  // Component roles for requirement calculation
  componentRoles: ComponentRole[];
  
  // Selected disks for storage nodes (key is roleId, value is array of disk configs)
  selectedDisksByRole: Record<string, { diskId: string, quantity: number }[]>;

  // Selected disks for storage clusters (key is storageClusterId, value is array of disk configs)
  // Used for hyper-converged storage clusters to allow different disk configs per cluster
  selectedDisksByStorageCluster: Record<string, { diskId: string, quantity: number }[]>;

  // Selected disks for storage pools (key is storagePoolId, value is array of disk configs)
  // Used for shared storage infrastructure supporting multiple logical clusters
  selectedDisksByStoragePool: Record<string, { diskId: string, quantity: number }[]>;

  // Selected GPUs for compute nodes (key is roleId, value is array of GPU configs)
  selectedGPUsByRole: Record<string, { gpuId: string, quantity: number }[]>;
  
  // Selected cassettes for patch panels (key is roleId, value is array of cassette configs)
  selectedCassettesByRole: Record<string, { cassetteId: string, quantity: number }[]>;
  
  // Requirements
  requirements: DesignRequirements;
  
  // Calculation breakdowns for role calculations
  calculationBreakdowns: Record<string, string[]>;
  
  // Designs
  savedDesigns: InfrastructureDesign[];
  activeDesign: InfrastructureDesign | null;
  
  // Workspace components
  placedComponents: Record<string, InfrastructureComponent>;
  workspaceComponents: InfrastructureComponent[];
  selectedComponentId: string | null;
  
  // Editing state
  editingComponentId: string | null;
  
  // Methods
  calculateComponentRoles: () => void;
  calculateRequiredQuantity: (roleId: string, componentId: string) => number;
  
  // Default component methods
  getDefaultComponent: (type: ComponentType, role: string) => InfrastructureComponent | undefined;
  setDefaultComponent: (type: ComponentType, role: string, id: string) => void;
  
  // Design methods
  saveDesign: () => void;
  createNewDesign: (name: string, description?: string) => void;
  updateDesign: (id: string, updates: Partial<InfrastructureDesign>) => void;
  deleteDesign: (id: string) => void;
  setActiveDesign: (id: string) => void;
  updateActiveDesign: (components: InfrastructureComponent[]) => void;
  loadDesignsFromDB: () => Promise<void>;
  
  // Component library methods
  initializeComponentTemplates: () => void;
  loadComponentsFromDB: () => Promise<void>;
  saveAllComponentsToDB: () => Promise<void>;
  addComponentTemplate: (component: InfrastructureComponent) => void;
  updateComponentTemplate: (id: string, updates: Partial<InfrastructureComponent>) => void;
  cloneComponentTemplate: (id: string) => void;
  deleteComponentTemplate: (id: string) => void;
}

// Define individual slice states if needed
export type RequirementsState = StoreState;
export type DesignState = StoreState;
export type WorkspaceState = StoreState;
export type ComponentLibraryState = StoreState;
