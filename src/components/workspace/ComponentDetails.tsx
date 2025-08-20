
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Trash2, Copy, Edit, Save, X } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { ComponentFormFields } from './details/ComponentFormFields';
import { ComponentDetailsDisplay } from './details/ComponentDetailsDisplay';
import { EditFormValues } from './details/types';

interface ComponentDetailsProps {
  open: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

export const ComponentDetails: React.FC<ComponentDetailsProps> = ({ open, onClose, onDelete }) => {
  const { 
    selectedComponentId, 
    placedComponents, 
    removeComponent, 
    duplicateComponent, 
    startEditingComponent, 
    editingComponentId,
    cancelEditingComponent,
    updateComponent
  } = useDesignStore();
  
  const component = selectedComponentId ? placedComponents[selectedComponentId] : null;
  const isEditing = editingComponentId === selectedComponentId;
  
  const [editForm, setEditForm] = useState<EditFormValues>({});
  
  if (!component) {
    return null;
  }

  const handleDelete = () => {
    if (selectedComponentId) {
      removeComponent(selectedComponentId);
      onClose();
    }
  };

  const handleDuplicate = () => {
    if (selectedComponentId) {
      duplicateComponent(selectedComponentId);
      onClose();
    }
  };

  const handleEdit = () => {
    if (selectedComponentId) {
      setEditForm({
        name: component.name,
        manufacturer: component.manufacturer,
        model: component.model,
        cost: component.cost,
        powerRequired: ('powerTypical' in component && component.powerTypical) || 
                      ('powerPeak' in component && component.powerPeak) || 
                      ('powerIdle' in component && component.powerIdle) || 
                      0,
      });
      startEditingComponent(selectedComponentId);
    }
  };

  const handleSave = () => {
    if (selectedComponentId && Object.keys(editForm).length > 0) {
      updateComponent(selectedComponentId, editForm);
    }
  };

  const handleCancel = () => {
    cancelEditingComponent();
    setEditForm({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    
    if (name === 'cost' || name === 'powerRequired') {
      parsedValue = parseFloat(value) || 0;
    }
    
    setEditForm({
      ...editForm,
      [name]: parsedValue
    });
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Component" : component.name}</SheetTitle>
        </SheetHeader>
        
        <div className="py-4">
          {isEditing ? (
            <ComponentFormFields 
              editForm={editForm}
              handleInputChange={handleInputChange}
            />
          ) : (
            <ComponentDetailsDisplay 
              component={component}
              isEditing={isEditing}
            />
          )}
        </div>
        
        <SheetFooter className="flex justify-between sm:justify-between">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
