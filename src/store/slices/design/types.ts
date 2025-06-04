
import { InfrastructureComponent, InfrastructureDesign, ClusterAZAssignment } from '@/types/infrastructure';
import { StoreState } from '../../types';

export interface DesignSlice {
  savedDesigns: InfrastructureDesign[];
  activeDesign: InfrastructureDesign | null;
  createNewDesign: (name: string, description?: string, existingDesign?: InfrastructureDesign) => string;
  updateActiveDesign: (components: InfrastructureComponent[]) => void;
  updateDesign: (id: string, updates: Partial<InfrastructureDesign>) => void;
  deleteDesign: (id: string) => void;
  setActiveDesign: (id: string) => void;
  saveDesign: () => void;
  exportDesign: () => void;
  importDesign: (file: File) => Promise<void>;
  loadDesignsFromDB: () => Promise<void>;
  loadSharedDesign: (sharingId: string) => Promise<boolean>;
  togglePublicAccess: (id: string) => Promise<void>;
  purgeAllDesigns: () => Promise<void>;
  updatePlacementRules: (rules: ClusterAZAssignment[]) => Promise<void>;
}
