
import * as React from 'react';

interface DndProviderProps {
  children: React.ReactNode;
}

export const DndProvider: React.FC<DndProviderProps> = ({ children }) => {
  const [DndComponents, setDndComponents] = React.useState<{
    DndProvider: React.ComponentType<{ backend: unknown; children: React.ReactNode }>;
    HTML5Backend: unknown;
  } | null>(null);

  React.useEffect(() => {
    // Dynamically import react-dnd to ensure React is fully loaded first
    Promise.all([
      import('react-dnd'),
      import('react-dnd-html5-backend')
    ]).then(([dndModule, backendModule]) => {
      setDndComponents({
        DndProvider: dndModule.DndProvider,
        HTML5Backend: backendModule.HTML5Backend
      });
    }).catch(error => {
      console.error('Failed to load react-dnd:', error);
    });
  }, []);

  // Render children without DnD during SSR and initial load
  if (!DndComponents) {
    return <>{children}</>;
  }

  const { DndProvider: ReactDndProvider, HTML5Backend } = DndComponents;

  return (
    <ReactDndProvider backend={HTML5Backend}>
      {children}
    </ReactDndProvider>
  );
};
