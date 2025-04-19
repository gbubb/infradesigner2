
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import { renderComponentSpecificDetails } from './componentTypeDetails';

interface ComponentDetailsDisplayProps {
  component: InfrastructureComponent;
  isEditing: boolean;
}

export const ComponentDetailsDisplay: React.FC<ComponentDetailsDisplayProps> = ({
  component,
  isEditing
}) => {
  if (isEditing) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-gray-500">Manufacturer</div>
        <div>{component.manufacturer}</div>
        
        <div className="text-gray-500">Model</div>
        <div>{component.model}</div>
        
        <div className="text-gray-500">Cost</div>
        <div>${component.cost}</div>
        
        <div className="text-gray-500">Power</div>
        <div>{component.powerRequired} W</div>
      </div>
      
      <Separator className="my-4" />
      
      {renderComponentSpecificDetails(component)}
    </>
  );
};
