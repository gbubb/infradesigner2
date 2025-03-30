
import React, { useState, useRef } from 'react';
import { useDesignStore } from '@/store/designStore';
import { InfrastructureComponent } from '@/types/infrastructure';
import { PlacedComponent } from './PlacedComponent';
import { ComponentDetails } from './ComponentDetails';

export const Workspace: React.FC = () => {
  const { 
    placedComponents, 
    addComponent, 
    removeComponent, 
    updateComponentPosition,
    selectedComponentId,
    selectComponent
  } = useDesignStore();
  
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Handle component drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      // Get the component data
      const componentData = e.dataTransfer.getData('component');
      if (!componentData) return;
      
      const component = JSON.parse(componentData) as InfrastructureComponent;
      
      // Calculate drop position relative to the workspace
      const workspaceRect = workspaceRef.current?.getBoundingClientRect();
      if (!workspaceRect) return;
      
      const x = e.clientX - workspaceRect.left;
      const y = e.clientY - workspaceRect.top;
      
      // Add the component to the design
      addComponent(component, { x, y });
    } catch (error) {
      console.error('Error dropping component:', error);
    }
  };
  
  // Handle dragover to allow dropping
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // Handle component selection
  const handleComponentClick = (id: string) => {
    selectComponent(id);
    setIsDetailsOpen(true);
  };
  
  return (
    <div className="flex h-full">
      <div 
        ref={workspaceRef}
        className="flex-1 h-full workspace-grid p-6 overflow-auto relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => selectComponent(null)}
      >
        {Object.entries(placedComponents).map(([id, component]) => (
          <PlacedComponent 
            key={id}
            component={{ id, component, position: { x: 0, y: 0 } }} // Default position, should be updated
            isSelected={selectedComponentId === id}
            onClick={(e) => {
              e.stopPropagation();
              handleComponentClick(id);
            }}
            onPositionChange={(position) => updateComponentPosition(id, position)}
          />
        ))}
        
        {Object.keys(placedComponents).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="mb-2">Drag components from the library to start designing</p>
              <p className="text-sm">or create a new design from the top menu</p>
            </div>
          </div>
        )}
      </div>
      
      <ComponentDetails 
        open={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)}
        onDelete={selectedComponentId ? () => removeComponent(selectedComponentId) : undefined}
      />
    </div>
  );
};
