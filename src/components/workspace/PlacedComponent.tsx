
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import { ComponentWithPosition } from '@/types/workspace';
import { 
  Server, 
  Network, 
  HardDrive, 
  Router,
  Shield
} from 'lucide-react';

interface PlacedComponentProps {
  component: ComponentWithPosition;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onPositionChange: (position: { x: number; y: number }) => void;
}

// Helper function to get the icon based on component type
const getComponentIcon = (type: ComponentType) => {
  switch (type) {
    case ComponentType.Server:
      return <Server className="h-10 w-10 text-infra-component-server" />;
    case ComponentType.Switch:
      return <Network className="h-10 w-10 text-infra-component-network" />;
    case ComponentType.Router:
      return <Router className="h-10 w-10 text-infra-component-network" />;
    case ComponentType.Firewall:
      return <Shield className="h-10 w-10 text-infra-component-security" />;
    case ComponentType.Disk:
      return <HardDrive className="h-10 w-10 text-infra-component-storage" />;
    default:
      return <Server className="h-10 w-10 text-gray-400" />;
  }
};

export const PlacedComponent: React.FC<PlacedComponentProps> = ({ 
  component, 
  isSelected,
  onClick,
  onPositionChange
}) => {
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(component.position);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const componentRef = useRef<HTMLDivElement>(null);

  // Update local position when component position changes
  useEffect(() => {
    setPosition(component.position);
  }, [component.position]);

  // Start dragging with mouse position offset
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Only left mouse button
    
    setDragging(true);
    const rect = componentRef.current?.getBoundingClientRect();
    if (rect) {
      setOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    
    const parentRect = componentRef.current?.parentElement?.getBoundingClientRect();
    if (!parentRect) return;
    
    const newX = e.clientX - parentRect.left - offset.x;
    const newY = e.clientY - parentRect.top - offset.y;
    
    setPosition({ x: newX, y: newY });
  }, [dragging, offset.x, offset.y]);

  // End dragging and update position
  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setDragging(false);
      onPositionChange(position);
    }
  }, [dragging, position, onPositionChange]);

  // Add and remove event listeners
  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, position, handleMouseMove, handleMouseUp]);

  // Get role information
  const getRoleInfo = (component: InfrastructureComponent) => {
    if (component.type === ComponentType.Server && 'serverRole' in component && component.serverRole) {
      return `${component.serverRole} Server`;
    }
    if (component.type === ComponentType.Switch && 'switchRole' in component && component.switchRole) {
      return `${component.switchRole} Switch`;
    }
    return component.type;
  };

  return (
    <div
      ref={componentRef}
      className={`absolute w-40 p-3 bg-white border rounded-md ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : 'shadow-sm'
      } cursor-move flex flex-col items-center`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: dragging ? 100 : isSelected ? 10 : 1
      }}
      onClick={onClick}
      onMouseDown={handleMouseDown}
    >
      <div className="mb-2">{getComponentIcon(component.component.type)}</div>
      <h3 className="text-sm font-medium truncate w-full text-center">{component.component.name}</h3>
      <p className="text-xs text-gray-500 mt-1">{component.component.manufacturer} {component.component.model}</p>
      <p className="text-xs text-blue-500 mt-0.5">{getRoleInfo(component.component)}</p>
      <div className="mt-2 text-xs text-gray-500 flex justify-between w-full">
        <span>${component.component.cost}</span>
        <span>{component.component.powerRequired}W</span>
      </div>
    </div>
  );
};
