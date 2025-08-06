
import React, { createContext, useContext } from 'react';
import { useDesignStore } from '@/store/designStore';
import { toast } from 'sonner';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

interface ComponentContextType {
  componentTemplates: InfrastructureComponent[];
  addComponentTemplate: (component: InfrastructureComponent) => void;
  updateComponentTemplate: (id: string, updates: Partial<InfrastructureComponent>) => void;
  cloneComponentTemplate: (id: string) => void;
  deleteComponentTemplate: (id: string) => void;
  setDefaultComponent: (type: ComponentType, role: string, id: string) => void;
}

export const ComponentContext = createContext<ComponentContextType | undefined>(undefined);

export const ComponentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useDesignStore();

  return (
    <ComponentContext.Provider value={{
      componentTemplates: store.componentTemplates,
      addComponentTemplate: store.addComponentTemplate,
      updateComponentTemplate: store.updateComponentTemplate,
      cloneComponentTemplate: store.cloneComponentTemplate,
      deleteComponentTemplate: store.deleteComponentTemplate,
      setDefaultComponent: store.setDefaultComponent,
    }}>
      {children}
    </ComponentContext.Provider>
  );
};

