/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

interface ComponentContextType {
  componentTemplates: InfrastructureComponent[];
  addComponentTemplate: (component: InfrastructureComponent) => void;
  updateComponentTemplate: (id: string, updates: Partial<InfrastructureComponent>) => void;
  cloneComponentTemplate: (id: string) => void;
  deleteComponentTemplate: (id: string) => void;
  setDefaultComponent: (type: ComponentType, role: string, id: string) => void;
}

const ComponentContext = createContext<ComponentContextType | undefined>(undefined);

export const ComponentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const componentTemplates = useDesignStore(state => state.componentTemplates);
  const addComponentTemplate = useDesignStore(state => state.addComponentTemplate);
  const updateComponentTemplate = useDesignStore(state => state.updateComponentTemplate);
  const cloneComponentTemplate = useDesignStore(state => state.cloneComponentTemplate);
  const deleteComponentTemplate = useDesignStore(state => state.deleteComponentTemplate);
  const setDefaultComponent = useDesignStore(state => state.setDefaultComponent);

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

// Export hook separately to avoid fast-refresh warning
export const useComponentContext = () => {
  const context = useContext(ComponentContext);
  if (!context) {
    throw new Error('useComponentContext must be used within a ComponentProvider');
  }
  return context;
};