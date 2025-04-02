import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ComponentType, 
  ComponentCategory, 
  InfrastructureComponent,
  ServerRole,
  DiskSlotType,
  NetworkPortType,
  SwitchRole,
  PortSpeed,
  Server,
  Switch as NetworkSwitch,
  Router,
  Firewall,
  Disk,
  DiskType,
  componentTypeToCategory
} from '@/types/infrastructure';
import { useDesignStore } from '@/store/designStore';
import { useComponentsByType } from '@/hooks/design/useComponentsByType';
import { ComponentFormDialog } from './dialogs/ComponentFormDialog';
import { DeleteConfirmationDialog } from './dialogs/DeleteConfirmationDialog';
import { ComponentsTable } from './tables/ComponentsTable';
import { CategoryFilter } from './filters/CategoryFilter';

interface ComponentFormValues {
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

export const ComponentLibrary: React.FC = () => {
  const { 
    componentTemplates,
    addComponentTemplate,
    updateComponentTemplate,
    cloneComponentTemplate,
    deleteComponentTemplate,
    setDefaultComponent
  } = useDesignStore();

  const { isDefaultForTypeAndRole } = useComponentsByType();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
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
  
  const [deleteComponentId, setDeleteComponentId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const filteredComponents = componentTemplates.filter(component => {
    const matchesSearch = 
      component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || 
      componentTypeToCategory[component.type] === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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

  const openEditDialog = (component: InfrastructureComponent) => {
    setEditingComponentId(component.id);
    setComponentForm({
      ...component
    } as ComponentFormValues);
    setIsEditDialogOpen(true);
  };

  const handleToggleDefault = (componentId: string, isDefault: boolean) => {
    if (isDefault) {
      const component = componentTemplates.find(c => c.id === componentId);
      if (component) {
        setDefaultComponent(component.type, component.role || '', componentId);
      }
    } else {
      // Only allow turning off default if there are other components of same type and role
      const component = componentTemplates.find(c => c.id === componentId);
      if (component) {
        const sameTypeAndRole = componentTemplates.filter(
          c => c.type === component.type && c.role === component.role && c.id !== componentId
        );
        
        if (sameTypeAndRole.length > 0) {
          updateComponentTemplate(componentId, { isDefault: false });
        } else {
          toast.warning("At least one component must be default for each type/role combination");
        }
      }
    }
  };

  const handleAddComponent = () => {
    if (!componentForm.name || !componentForm.manufacturer || !componentForm.model) {
      toast.error("Please fill in all required fields");
      return;
    }

    const baseComponent = {
      id: componentForm.id || undefined,
      type: componentForm.type,
      name: componentForm.name,
      manufacturer: componentForm.manufacturer,
      model: componentForm.model,
      cost: componentForm.cost || 0,
      powerRequired: componentForm.powerRequired || 0,
      isDefault: componentForm.isDefault,
    };
    
    let component: InfrastructureComponent;
    
    switch (componentForm.type) {
      case ComponentType.Server:
        component = {
          ...baseComponent,
          type: ComponentType.Server,
          rackUnitsConsumed: componentForm.ruSize || 1,
          cpuModel: componentForm.cpuModel || "Generic CPU",
          cpuCount: componentForm.cpuCount || 1,
          coreCount: componentForm.coreCount || 8,
          memoryGB: componentForm.memoryGB || 32,
          serverRole: componentForm.serverRole || ServerRole.Compute,
          cpuSockets: componentForm.cpuSockets || 1,
          cpuCoresPerSocket: componentForm.cpuCoresPerSocket || 4,
          memoryCapacity: componentForm.memoryCapacity || 32,
          diskSlotType: componentForm.diskSlotType || DiskSlotType.TwoPointFive,
          diskSlotQuantity: componentForm.diskSlotQuantity || 8,
          ruSize: componentForm.ruSize || 1,
          networkPortType: componentForm.networkPortType || NetworkPortType.SFP,
          portsConsumedQuantity: componentForm.portsConsumedQuantity || 2
        } as Server;
        break;
      case ComponentType.Switch:
        component = {
          ...baseComponent,
          type: ComponentType.Switch,
          rackUnitsConsumed: componentForm.ruSize || 1,
          portCount: componentForm.portCount || 24,
          portSpeed: componentForm.portSpeed || 10,
          layer: componentForm.layer || 2,
          switchRole: componentForm.switchRole || SwitchRole.Access,
          ruSize: componentForm.ruSize || 1,
          portSpeedType: componentForm.portSpeedType || PortSpeed.TenG,
          portsProvidedQuantity: componentForm.portsProvidedQuantity || 24
        } as NetworkSwitch;
        break;
      case ComponentType.Router:
        component = {
          ...baseComponent,
          type: ComponentType.Router,
          rackUnitsConsumed: componentForm.rackUnitsConsumed || 1,
          portCount: componentForm.portCount || 8,
          portSpeed: componentForm.portSpeed || 10,
          throughput: componentForm.throughput || 40,
          supportedProtocols: ['BGP', 'OSPF']
        } as Router;
        break;
      case ComponentType.Firewall:
        component = {
          ...baseComponent,
          type: ComponentType.Firewall,
          rackUnitsConsumed: componentForm.rackUnitsConsumed || 1,
          portCount: componentForm.portCount || 8,
          portSpeed: componentForm.portSpeed || 10,
          throughput: componentForm.throughput || 10,
          connectionPerSecond: componentForm.connectionPerSecond || 10000,
          concurrentConnections: componentForm.concurrentConnections || 100000,
          features: ['IPS', 'VPN']
        } as Firewall;
        break;
      case ComponentType.Disk:
        component = {
          ...baseComponent,
          type: ComponentType.Disk,
          capacityTB: componentForm.capacityTB || 1,
          formFactor: componentForm.formFactor || '2.5"',
          interface: componentForm.interface || 'SATA',
          diskType: componentForm.diskType || DiskType.SATASSD,
          rpm: componentForm.rpm,
          iops: componentForm.iops,
          readSpeed: componentForm.readSpeed,
          writeSpeed: componentForm.writeSpeed
        } as Disk;
        break;
      default:
        component = {
          ...baseComponent
        } as InfrastructureComponent;
    }

    if (editingComponentId) {
      updateComponentTemplate(editingComponentId, component);
      setIsEditDialogOpen(false);
    } else {
      addComponentTemplate(component);
      setIsAddDialogOpen(false);
    }
    
    resetForm();
  };

  const openDeleteConfirmation = (id: string) => {
    setDeleteComponentId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteComponentId) {
      deleteComponentTemplate(deleteComponentId);
      setIsDeleteDialogOpen(false);
      setDeleteComponentId(null);
    }
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Component Library</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Component
            </Button>
          </DialogTrigger>
          <ComponentFormDialog 
            isOpen={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            formValues={componentForm}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onTypeChange={handleTypeChange}
            onSwitchChange={(checked) => {
              setComponentForm({
                ...componentForm,
                isDefault: checked
              });
            }}
            onCancel={() => {
              resetForm();
              setIsAddDialogOpen(false);
            }}
            onSubmit={handleAddComponent}
            isEditing={false}
          />
        </Dialog>
      </div>
      
      <div className="flex items-center space-x-4 mb-6">
        <Input
          type="search"
          placeholder="Search components..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <CategoryFilter 
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </div>
      
      <ComponentsTable 
        components={filteredComponents}
        isDefaultForTypeAndRole={isDefaultForTypeAndRole}
        onToggleDefault={handleToggleDefault}
        onEdit={openEditDialog}
        onClone={cloneComponentTemplate}
        onDelete={openDeleteConfirmation}
      />

      <ComponentFormDialog 
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        formValues={componentForm}
        onInputChange={handleInputChange}
        onSelectChange={handleSelectChange}
        onTypeChange={handleTypeChange}
        onSwitchChange={(checked) => {
          setComponentForm({
            ...componentForm,
            isDefault: checked
          });
        }}
        onCancel={() => {
          resetForm();
          setIsEditDialogOpen(false);
        }}
        onSubmit={handleAddComponent}
        isEditing={true}
      />
      
      <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
