import { InfrastructureComponent } from './component-types';
import { DesignRequirements } from './requirements-types';
import { ComponentRole } from './roles-types';
import { RackProfile, ClusterAZAssignment, RowLayoutConfiguration } from './rack-types';
import { ConnectionRule } from './connection-rule-types';
import { NetworkConnection } from './connection-types';
import { ComponentWithPlacement } from '../service-types';

// Infrastructure Design interface
export interface InfrastructureDesign {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  requirements: DesignRequirements;
  components: (InfrastructureComponent | ComponentWithPlacement)[];
  componentRoles?: ComponentRole[];
  selectedDisksByRole?: Record<string, { diskId: string, quantity: number }[]>;
  selectedGPUsByRole?: Record<string, { gpuId: string, quantity: number }[]>;
  selectedCassettesByRole?: Record<string, { cassetteId: string, quantity: number }[]>;
  // User and sharing properties
  user_id?: string | null;
  is_public?: boolean;
  sharing_id?: string | null;
  // Rack layout information - match DB: rackprofiles
  rackprofiles?: RackProfile[];
  // Connection information
  connections?: Connection[];
  // Connection rules
  connectionRules?: ConnectionRule[];
  // Physical network connections
  networkConnections?: NetworkConnection[]; // NEW
  // Placement rules for auto-placement
  placementRules?: ClusterAZAssignment[];
  // Row layout configuration for physical positioning
  rowLayout?: RowLayoutConfiguration;
}

// Workspace types for component positioning
export interface ComponentWithPosition {
  id: string;
  position: { x: number; y: number };
  component: InfrastructureComponent;
}

// Connection interface
export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  sourcePortId?: string;
  targetPortId?: string;
  cableId?: string;
}
