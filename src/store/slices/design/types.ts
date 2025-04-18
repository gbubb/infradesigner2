
import { InfrastructureComponent, InfrastructureDesign } from '@/types/infrastructure';
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
  purgeAllDesigns: () => Promise<void>;
}

