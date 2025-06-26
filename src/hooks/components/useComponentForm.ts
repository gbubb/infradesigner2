import { useState } from 'react';
import { toast } from 'sonner';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';
import { Port, PortRole, PortSpeed, MediaType, ConnectorType } from '@/types/infrastructure/port-types';
import { useDesignStore } from '@/store/designStore';
import { v4 as uuidv4 } from 'uuid';

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
  // Detailed port array
  ports: Port[];
  // Component-specific fields
  serverRole?: string;
  capacityTB?: number;
  formFactor?: string;
  interface?: string;
  diskType?: string;
  cpuSockets?: number;
  cpuCoresPerSocket?: number;
  cpuModel?: string;
  memoryCapacity?: number;
  memoryType?: string;
  diskSlotQuantity?: number;
  diskSlotType?: string;
  coreCount?: number;
  ruSize?: number;
  portsConsumedQuantity?: number;
  networkPortType?: string;
  portCount?: number;
  layer3Capable?: boolean;
  throughput?: number;
  rpm?: number;
  iops?: number;
  readSpeed?: number;
  writeSpeed?: number;
  breakoutCompatible?: boolean;
  isBreakout?: boolean;
  // New CPU fields
  cpuTdpWatts?: number;
  cpuFrequencyBaseGhz?: number;
  cpuFrequencyTurboGhz?: number;
  // New Memory fields
  memoryDimmSlotCapacity?: number;
  memoryDimmSlotsConsumed?: number;
  memoryDimmSize?: number;
  memoryDimmFrequencyMhz?: number;
  // PCIe slots
  pcieSlots?: any;  // Array of {quantity: number, formFactor: string}
  // Existing GPU fields
  gpuSupported?: boolean;
  gpuSlots?: number;
  connectorB_Quantity?: number;
  maxDistanceMeters?: number;
  frontPortQuantity?: number;
  backPortQuantity?: number;
  connectionPerSecond?: number;
  concurrentConnections?: number;
  cassetteCapacity?: number;
  portQuantity?: number;
  length?: number;
  portType?: ConnectorType;
  connectorA_Type?: ConnectorType;
  connectorB_Type?: ConnectorType;
  mediaType?: MediaType;
  frontPortType?: ConnectorType;
  backPortType?: ConnectorType;
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
    // Component-specific defaults will be set conditionally
    switchRole: undefined,
    portSpeedType: undefined,
    portsProvidedQuantity: undefined,
    layer: undefined,
    // Disk-specific fields
    capacityTB: 1,
    formFactor: '',
    interface: '',
    diskType: '',
    // New: detailed network ports
    ports: [],
    // Transceiver specific
    breakoutCompatible: false,
    // Cable specific
    isBreakout: false,
    connectorB_Quantity: 4,
  };
  
  const [componentForm, setComponentForm] = useState<ComponentFormValues>({...defaultFormState});

  const resetForm = () => {
    console.log('Resetting form to default state');
    setComponentForm({...defaultFormState});
    setEditingComponentId(null);
  };

  // --- PORT HANDLING LOGIC ---
  const addPort = () => {
    // Prevent adding ports to cables
    if (componentForm.type === 'Cable') return;
    const newPort: Port = {
      id: uuidv4(),
      name: '',
      speed: PortSpeed.Speed1G,
      mediaType: MediaType.Copper,
      connectorType: ConnectorType.RJ45,
      role: undefined,
    };
    setComponentForm(prev => ({
      ...prev,
      ports: [...(prev.ports || []), newPort]
    }));
  };

  const removePort = (index: number) => {
    // Prevent removing ports if it's not a cable
    if (componentForm.type === 'Cable') return;
    setComponentForm(prev => ({
      ...prev,
      ports: prev.ports.filter((_, i) => i !== index)
    }));
  };

  const updatePort = (index: number, field: keyof Port, value: string | number | PortRole | PortSpeed | MediaType | ConnectorType | undefined) => {
    // Prevent updating ports if it's a cable
    if (componentForm.type === 'Cable') return;
    setComponentForm(prev => ({
      ...prev,
      ports: prev.ports.map((port, i) =>
        i === index ? { ...port, [field]: value } : port
      ),
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;

    // This check ensures correct type for disk capacity fields
    if (['cost', 'powerRequired', 'cpuSockets', 'cpuCoresPerSocket', 'memoryCapacity', 
         'diskSlotQuantity', 'ruSize', 'portsConsumedQuantity', 'portCount', 'portSpeed', 
         'portsProvidedQuantity', 'throughput', 'capacityTB', 'cassetteCapacity', 
         'portQuantity', 'length', 'validRUStart', 'validRUEnd', 'preferredRU', 'preferredRack', 
         'rpm', 'iops', 'readSpeed', 'writeSpeed', 'connectorB_Quantity', 'maxDistanceMeters',
         'frontPortQuantity', 'backPortQuantity', 'connectionPerSecond', 'concurrentConnections'].includes(name)) {
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
    // Reset form to defaults when type changes to prevent cross-contamination
    const newDefaults = {...defaultFormState};
    setComponentForm(prev => ({
      ...newDefaults,
      type: value as ComponentType,
      // Preserve basic fields that apply to all components
      name: prev.name,
      manufacturer: prev.manufacturer,
      model: prev.model,
      cost: prev.cost,
      powerRequired: prev.powerRequired,
      isDefault: prev.isDefault,
      namingPrefix: prev.namingPrefix,
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
    // Create placement object only if validRUStart and validRUEnd are both defined and type is not Cable
    let placement;
    if (
      form.type !== "Cable" &&
      form.validRUStart !== undefined &&
      form.validRUEnd !== undefined
    ) {
      placement = {
        validRUStart: form.validRUStart,
        validRUEnd: form.validRUEnd,
      };
      if (form.preferredRU !== undefined) {
        placement.preferredRU = form.preferredRU;
      }
      if (form.preferredRack !== undefined) {
        placement.preferredRack = form.preferredRack;
      }
    }

    const component = {
      ...form,
      ...(placement ? { placement } : {}), // Only add placement if it exists
    };

    // Remove irrelevant port fields for Cable type:
    if (component.type === "Cable") {
      delete component.ports;
    }
    
    // Remove temporary placement fields
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
    processFormForSubmission,
    // Port handling:
    addPort,
    removePort,
    updatePort,
  };
};
