
import React from 'react';
import { useDrag } from 'react-dnd';
import { InfrastructureComponent } from '@/types/infrastructure';

interface DragSourceProps {
  component: InfrastructureComponent;
  children: React.ReactNode;
}

export const DragSource: React.FC<DragSourceProps> = ({ component, children }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'COMPONENT',
    item: { component },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  return (
    <div 
      ref={drag} 
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      {children}
    </div>
  );
};
