
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SwitchRole } from '@/types/infrastructure';
import { PortSpeed } from '@/types/infrastructure/port-types';

interface SwitchFormFieldsProps {
  formValues: any;
  onChange: (name: string, value: any) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SwitchFormFields: React.FC<SwitchFormFieldsProps> = ({ 
  formValues, 
  onChange, 
  onInputChange 
}) => {
  // Log the current form values for debugging
  console.log("SwitchFormFields - Current values:", formValues);
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="switchRole">Switch Role</Label>
        <Select
          value={formValues.switchRole || ''}
          onValueChange={(value) => {
            console.log("Switch role selected:", value);
            onChange('switchRole', value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(SwitchRole).map((role) => (
              <SelectItem key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="cost">Cost ($)</Label>
        <Input
          id="cost"
          name="cost"
          type="number"
          value={formValues.cost !== undefined ? formValues.cost : 0}
          onChange={onInputChange}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="powerRequired">Power (W)</Label>
        <Input
          id="powerRequired"
          name="powerRequired"
          type="number"
          value={formValues.powerRequired !== undefined ? formValues.powerRequired : 0}
          onChange={onInputChange}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ruSize">RU Size</Label>
          <Input
            id="ruSize"
            name="ruSize"
            type="number"
            value={formValues.ruSize || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="portSpeedType">Port Speed</Label>
          <Select
            value={formValues.portSpeedType || ''}
            onValueChange={(value) => {
              console.log("Port speed selected:", value);
              onChange('portSpeedType', value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select speed" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PortSpeed).map((speed) => (
                <SelectItem key={speed} value={speed}>
                  {speed}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="portsProvidedQuantity">Ports Provided</Label>
          <Input
            id="portsProvidedQuantity"
            name="portsProvidedQuantity"
            type="number"
            value={formValues.portsProvidedQuantity || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="layer">Switch Layer</Label>
          <Select
            value={formValues.layer?.toString() || '2'}
            onValueChange={(value) => onChange('layer', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select layer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">Layer 2</SelectItem>
              <SelectItem value="3">Layer 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
