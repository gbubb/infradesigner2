
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

export interface ComponentLibrarySlice {
  componentTemplates: InfrastructureComponent[];
  getDefaultComponent: (type: ComponentType, role: string) => InfrastructureComponent | undefined;
  setDefaultComponent: (type: ComponentType, role: string, id: string) => void;
  initializeComponentTemplates: () => void;
  loadComponentsFromDB: () => Promise<void>;
  saveAllComponentsToDB: () => Promise<void>;
  addComponentTemplate: (component: InfrastructureComponent) => void;
  updateComponentTemplate: (id: string, updates: Partial<InfrastructureComponent>) => void;
  cloneComponentTemplate: (id: string) => void;
  deleteComponentTemplate: (id: string) => void;
}
