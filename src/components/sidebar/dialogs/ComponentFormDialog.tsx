
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, X } from 'lucide-react';
import { ServerFormFields } from '../forms/ServerFormFields';
import { SwitchFormFields } from '../forms/SwitchFormFields';
import { DiskFormFields } from '../forms/DiskFormFields';
import { ComponentType } from '@/types/infrastructure';

interface ComponentFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formValues: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: any) => void;
  onTypeChange: (value: string) => void;
  onSwitchChange: (checked: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isEditing: boolean;
}

export const ComponentFormDialog: React.FC<ComponentFormDialogProps> = ({
  isOpen,
  onOpenChange,
  formValues,
  onInputChange,
  onSelectChange,
  onTypeChange,
  onSwitchChange,
  onCancel,
  onSubmit,
  isEditing
}) => {
  const renderTypeSpecificFormFields = () => {
    switch(formValues.type) {
      case ComponentType.Server:
        return <ServerFormFields 
                 formValues={formValues} 
                 onChange={onSelectChange} 
                 onInputChange={onInputChange} 
               />;
      case ComponentType.Switch:
        return <SwitchFormFields 
                 formValues={formValues} 
                 onChange={onSelectChange} 
                 onInputChange={onInputChange} 
               />;
      case ComponentType.Disk:
        return <DiskFormFields 
                 formValues={formValues} 
                 onChange={onSelectChange} 
                 onInputChange={onInputChange} 
               />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Component' : 'Add New Component'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update component details' : 'Create a new component for your component library'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="type">Component Type</Label>
              <Select
                value={formValues.type?.toString()}
                onValueChange={onTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ComponentType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formValues.name || ''}
              onChange={onInputChange}
              placeholder="Component name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              id="manufacturer"
              name="manufacturer"
              value={formValues.manufacturer || ''}
              onChange={onInputChange}
              placeholder="Manufacturer"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              name="model"
              value={formValues.model || ''}
              onChange={onInputChange}
              placeholder="Model"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Cost ($)</Label>
              <Input
                id="cost"
                name="cost"
                type="number"
                value={formValues.cost || 0}
                onChange={onInputChange}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="powerRequired">Power (W)</Label>
              <Input
                id="powerRequired"
                name="powerRequired"
                type="number"
                value={formValues.powerRequired || 0}
                onChange={onInputChange}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isDefault"
              checked={formValues.isDefault || false}
              onCheckedChange={onSwitchChange}
            />
            <Label htmlFor="isDefault">Set as default for this type/role</Label>
          </div>
          
          {renderTypeSpecificFormFields()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            <Save className="mr-2 h-4 w-4" />
            {isEditing ? 'Update Component' : 'Add Component'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
