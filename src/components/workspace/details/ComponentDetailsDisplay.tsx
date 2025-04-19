
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { InfrastructureComponent } from '@/types/infrastructure';
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
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="font-medium text-muted-foreground">Manufacturer</div>
        <div className="font-normal">{component.manufacturer}</div>
        
        <div className="font-medium text-muted-foreground">Model</div>
        <div className="font-normal">{component.model}</div>
        
        <div className="font-medium text-muted-foreground">Cost</div>
        <div className="font-normal">${component.cost}</div>
        
        <div className="font-medium text-muted-foreground">Power</div>
        <div className="font-normal">{component.powerRequired} W</div>
      </div>
      
      <Separator className="my-4" />
      
      {renderComponentSpecificDetails(component)}
    </>
  );
};
