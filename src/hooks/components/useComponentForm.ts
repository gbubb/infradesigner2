import { useState } from 'react';
import { toast } from 'sonner';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';
import { useDesignStore } from '@/store/designStore';

export interface ComponentFormValues {
  id?: string;
  type: ComponentType;
  name: string;
  manufacturer: string;
  model: string;
  cost: number;
  powerRequired: number;
  isDefault: boolean;
  // Add special fields for switch components
  switchRole?: string;
  portSpeedType?: string;
  portsProvidedQuantity?: number;
  layer?: number;
  // Add naming and placement fields
  namingPrefix?: string;
  placement?: {
    validRUStart: number;
    validRUEnd: number;
    preferredRU?: number;
    preferredRack?: number;
  };
  // For form fields
  validRUStart?: number;
  validRUEnd?: number;
  preferredRU?: number;
  preferredRack?: number;
  [key: string]: any;
}

export const useComponentForm = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const physicalConstraints = useDesignStore((state) => 
    state.activeDesign?.requirements?.physicalConstraints);
  const maxRackUnits = physicalConstraints?.rackUnitsPerRack || 42;
  
  const defaultFormState: ComponentFormValues = {
    type: ComponentType.Server,
    name: '',
    manufacturer: '',
    model: '',
    cost: 0,
    powerRequired: 0,
    isDefault: false,
    namingPrefix: '',
    validRUStart: 1,
    validRUEnd: maxRackUnits,
    preferredRU: 1,
    preferredRack: 1,
    // Default values for switches
    switchRole: '',
    portSpeedType: '',
    portsProvidedQuantity: 0,
    layer: 2,
    // Disk-specific fields
    capacityTB: 1,
    formFactor: '',  // Will use common values in the dialog/form.
    interface: '',   // Will use common values in the dialog/form.
    diskType: '',
  };
  
  const [componentForm, setComponentForm] = useState<ComponentFormValues>({...defaultFormState});

  const resetForm = () => {
    console.log('Resetting form to default state');
    setComponentForm({...defaultFormState});
    setEditingComponentId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;

    // This check ensures correct type for disk capacity fields
    if (['cost', 'powerRequired', 'cpuSockets', 'cpuCoresPerSocket', 'memoryCapacity', 
         'diskSlotQuantity', 'ruSize', 'portsConsumedQuantity', 'portCount', 'portSpeed', 
         'portsProvidedQuantity', 'throughput', 'capacityTB', 'cassetteCapacity', 
         'portQuantity', 'length', 'validRUStart', 'validRUEnd', 'preferredRU', 'preferredRack', 'rpm', 'iops', 'readSpeed', 'writeSpeed'].includes(name)) {
      parsedValue = value === '' ? 0 : parseFloat(value);
    }
    
    console.log(`Setting ${name} to ${parsedValue}`);
    
    setComponentForm(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    console.log(`Setting ${name} to ${value}`);
    setComponentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTypeChange = (value: string) => {
    console.log(`Changing type to ${value}`);
    setComponentForm(prev => ({
      ...prev,
      type: value as ComponentType
    }));
  };

  const validateForm = () => {
    const missingFields = [];
    
    if (!componentForm.name) missingFields.push('Name');
    if (!componentForm.manufacturer) missingFields.push('Manufacturer');
    if (!componentForm.model) missingFields.push('Model');
    if (componentForm.cost === undefined || componentForm.cost === null) missingFields.push('Cost');
    
    // For switch components, also require switchRole
    if (componentForm.type === ComponentType.Switch && !componentForm.switchRole) {
      missingFields.push('Switch Role');
    }
    
    if (missingFields.length > 0) {
      // Log the form state for debugging
      console.log("Form validation failed. Current form state:", componentForm);
      console.log("Missing fields:", missingFields);
      
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return false;

    }
    
    // Validate RU range
    if (componentForm.validRUStart && componentForm.validRUEnd) {
      if (componentForm.validRUStart > componentForm.validRUEnd) {
        toast.error("RU range start must be less than or equal to RU range end");
        return false;
      }
      
      if (componentForm.validRUStart < 1 || componentForm.validRUEnd > maxRackUnits) {
        toast.error(`Valid RU range must be between 1 and ${maxRackUnits}`);
        return false;
      }
    }
    
    return true;
  };

  // Process form values before submission
  const processFormForSubmission = (form: ComponentFormValues) => {
    console.log('Processing form for submission:', form);
    
    // Create placement object from form fields
    const placement = {
      validRUStart: form.validRUStart || 1,
      validRUEnd: form.validRUEnd || maxRackUnits,
      preferredRU: form.preferredRU,
      preferredRack: form.preferredRack
    };
    
    // Create cleaned component object with all fields preserved
    const component = {
      ...form,
      placement
    };
    
    // Remove form-specific fields
    delete component.validRUStart;
    delete component.validRUEnd;
    delete component.preferredRU;
    delete component.preferredRack;
    
    console.log('Processed component:', component);
    return component;
  };

  // Close dialogs and reset form properly
  const handleCloseAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(false);
  };
  
  const handleCloseEditDialog = () => {
    resetForm();
    setIsEditDialogOpen(false);
  };

  return {
    isAddDialogOpen,
    setIsAddDialogOpen,
    handleCloseAddDialog,
    isEditDialogOpen,
    setIsEditDialogOpen,
    handleCloseEditDialog,
    editingComponentId,
    setEditingComponentId,
    componentForm,
    setComponentForm,
    resetForm,
    handleInputChange,
    handleSelectChange,
    handleTypeChange,
    validateForm,
    processFormForSubmission
  };
};

