
import React from 'react';
import { useDrag } from 'react-dnd';
import { InfrastructureComponent } from '@/types/infrastructure';

interface DragSourceProps {
  component: InfrastructureComponent;
  children: React.ReactNode;
}

export const DragSource: React.FC<DragSourceProps> = ({ component, children }) => {
  let dragRef: React.Ref<HTMLDivElement> | null = null;
  let isDragging = false;

  try {
    // Try to use the drag hook, but gracefully handle if it's not available
    const [dragState, drag] = useDrag({
      type: 'COMPONENT',
      item: { component },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    });
    dragRef = drag;
    isDragging = dragState.isDragging;
  } catch (error) {
    // If DnD context is not available, just render without drag functionality
    console.warn('DnD context not available, rendering without drag functionality');
  }

  return (
    <div 
      ref={dragRef} 
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      {children}
    </div>
  );
};
