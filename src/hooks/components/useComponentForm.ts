
import { useState } from 'react';
import { toast } from 'sonner';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

export interface ComponentFormValues {
  id?: string;
  type: ComponentType;
  name: string;
  manufacturer: string;
  model: string;
  cost: number;
  powerRequired: number;
  isDefault: boolean;
  [key: string]: any;
}

export const useComponentForm = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [componentForm, setComponentForm] = useState<ComponentFormValues>({
    type: ComponentType.Server,
    name: '',
    manufacturer: '',
    model: '',
    cost: 0,
    powerRequired: 0,
    isDefault: false,
  });

  const resetForm = () => {
    setComponentForm({
      type: ComponentType.Server,
      name: '',
      manufacturer: '',
      model: '',
      cost: 0,
      powerRequired: 0,
      isDefault: false,
    });
    setEditingComponentId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    
    if (['cost', 'powerRequired', 'cpuSockets', 'cpuCoresPerSocket', 'memoryCapacity', 
         'diskSlotQuantity', 'ruSize', 'portsConsumedQuantity', 'portCount', 'portSpeed', 
         'portsProvidedQuantity', 'throughput', 'capacityTB'].includes(name)) {
      parsedValue = parseFloat(value) || 0;
    }
    
    setComponentForm({
      ...componentForm,
      [name]: parsedValue
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setComponentForm({
      ...componentForm,
      [name]: value
    });
  };

  const handleTypeChange = (value: string) => {
    setComponentForm({
      ...componentForm,
      type: value as ComponentType
    });
  };

  const validateForm = () => {
    if (!componentForm.name || !componentForm.manufacturer || !componentForm.model) {
      toast.error("Please fill in all required fields");
      return false;
    }
    return true;
  };

  return {
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editingComponentId,
    setEditingComponentId,
    componentForm,
    setComponentForm,
    resetForm,
    handleInputChange,
    handleSelectChange,
    handleTypeChange,
    validateForm
  };
};
