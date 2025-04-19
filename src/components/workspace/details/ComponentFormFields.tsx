
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EditFormValues } from './types';

interface ComponentFormFieldsProps {
  editForm: EditFormValues;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ComponentFormFields: React.FC<ComponentFormFieldsProps> = ({
  editForm,
  handleInputChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={editForm.name || ''}
          onChange={handleInputChange}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="manufacturer">Manufacturer</Label>
        <Input
          id="manufacturer"
          name="manufacturer"
          value={editForm.manufacturer || ''}
          onChange={handleInputChange}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          name="model"
          value={editForm.model || ''}
          onChange={handleInputChange}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cost">Cost ($)</Label>
          <Input
            id="cost"
            name="cost"
            type="number"
            value={editForm.cost || 0}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="powerRequired">Power (W)</Label>
          <Input
            id="powerRequired"
            name="powerRequired"
            type="number"
            value={editForm.powerRequired || 0}
            onChange={handleInputChange}
          />
        </div>
      </div>
    </div>
  );
};
