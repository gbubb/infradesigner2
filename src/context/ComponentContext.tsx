
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
  const componentTemplates = useDesignStore(state => state.componentTemplates);
  const addComponentTemplate = useDesignStore(state => state.addComponentTemplate);
  const updateComponentTemplate = useDesignStore(state => state.updateComponentTemplate);
  const cloneComponentTemplate = useDesignStore(state => state.cloneComponentTemplate);
  const deleteComponentTemplate = useDesignStore(state => state.deleteComponentTemplate);
  const setDefaultComponent = useDesignStore(state => state.setDefaultComponent);

  // Debug logging
  React.useEffect(() => {
    console.log('ComponentProvider - templates updated:', componentTemplates.length);
  }, [componentTemplates]);

  return (
    <ComponentContext.Provider value={{
      componentTemplates,
      addComponentTemplate,
      updateComponentTemplate,
      cloneComponentTemplate,
      deleteComponentTemplate,
      setDefaultComponent,
    }}>
      {children}
    </ComponentContext.Provider>
  );
};

