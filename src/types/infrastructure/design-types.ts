
import { InfrastructureComponent } from './component-types';
import { DesignRequirements } from './requirements-types';
import { ComponentRole } from './roles-types';
import { RackProfile } from './rack-types';
import { ConnectionRule } from './connection-rule-types';

// Infrastructure Design interface
export interface InfrastructureDesign {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  requirements: DesignRequirements;
  components: InfrastructureComponent[];
  componentRoles?: ComponentRole[];
  selectedDisksByRole?: Record<string, { diskId: string, quantity: number }[]>;
  selectedGPUsByRole?: Record<string, { gpuId: string, quantity: number }[]>;
  selectedCassettesByRole?: Record<string, { cassetteId: string, quantity: number }[]>;
  // User and sharing properties
  user_id?: string | null;
  is_public?: boolean;
  sharing_id?: string | null;
  // Rack layout information
  rackProfiles?: RackProfile[];
  // Connection information
  connections?: Connection[];
  // Connection rules
  connectionRules?: ConnectionRule[];
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
