
import React, { useState, useEffect } from 'react';
import { 
  Server as ServerIcon, 
  Network, 
  HardDrive, 
  Router as RouterIcon, 
  Shield,
  Pencil,
  Trash,
  Copy,
  Save,
  X,
  Plus,
  Zap
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  ComponentType, 
  componentTypeToCategory, 
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
  DiskType
} from '@/types/infrastructure';
import { useDesignStore } from '@/store/designStore';
import { useComponentsByType } from '@/hooks/design/useComponentsByType';

interface ServerFormValues {
  cpuModel?: string;
  cpuCount?: number;
  coreCount?: number; 
  memoryGB?: number;
  serverRole?: ServerRole;
  cpuSockets?: number;
  cpuCoresPerSocket?: number;
  memoryCapacity?: number;
  diskSlotType?: DiskSlotType;
  diskSlotQuantity?: number;
  ruSize?: number;
  networkPortType?: NetworkPortType;
  portsConsumedQuantity?: number;
}

interface SwitchFormValues {
  portCount?: number;
  portSpeed?: number;
  layer?: 2 | 3;
  switchRole?: SwitchRole;
  ruSize?: number;
  portSpeedType?: PortSpeed;
  portsProvidedQuantity?: number;
}

interface RouterFormValues {
  portCount?: number;
  portSpeed?: number;
  throughput?: number;
  supportedProtocols?: string[];
  rackUnitsConsumed?: number;
}

interface FirewallFormValues {
  portCount?: number;
  portSpeed?: number;
  throughput?: number;
  features?: string[];
  rackUnitsConsumed?: number;
}

interface DiskFormValues {
  capacityTB?: number;
  formFactor?: string;
  interface?: string;
  diskType?: DiskType;
  rpm?: number;
  iops?: number;
  readSpeed?: number;
  writeSpeed?: number;
}

type ComponentFormValues = {
  id?: string;
  type: ComponentType;
  name: string;
  manufacturer: string;
  model: string;
  cost: number;
  powerRequired: number;
  isDefault: boolean;
} & Partial<ServerFormValues & SwitchFormValues & RouterFormValues & FirewallFormValues & DiskFormValues>;

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

  const categoryIcons = {
    [ComponentCategory.Compute]: <ServerIcon className="h-5 w-5" />,
    [ComponentCategory.Network]: <Network className="h-5 w-5" />,
    [ComponentCategory.Storage]: <HardDrive className="h-5 w-5" />,
    [ComponentCategory.Security]: <Shield className="h-5 w-5" />,
    [ComponentCategory.Accelerator]: <Zap className="h-5 w-5" />,
    all: <Plus className="h-5 w-5" />
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

  const renderServerFormFields = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="serverRole">Server Role</Label>
          <Select
            value={componentForm.serverRole?.toString() || ''}
            onValueChange={(value) => handleSelectChange('serverRole', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ServerRole).map((role) => (
                <SelectItem key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cpuModel">CPU Model</Label>
            <Input
              id="cpuModel"
              name="cpuModel"
              value={componentForm.cpuModel || ''}
              onChange={handleInputChange}
              placeholder="CPU Model"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cpuSockets">CPU Sockets</Label>
            <Input
              id="cpuSockets"
              name="cpuSockets"
              type="number"
              value={componentForm.cpuSockets || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cpuCoresPerSocket">Cores per Socket</Label>
            <Input
              id="cpuCoresPerSocket"
              name="cpuCoresPerSocket"
              type="number"
              value={componentForm.cpuCoresPerSocket || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="memoryCapacity">Memory (GB)</Label>
            <Input
              id="memoryCapacity"
              name="memoryCapacity"
              type="number"
              value={componentForm.memoryCapacity || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="diskSlotType">Disk Slot Type</Label>
            <Select
              value={componentForm.diskSlotType?.toString() || ''}
              onValueChange={(value) => handleSelectChange('diskSlotType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(DiskSlotType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="diskSlotQuantity">Disk Slots</Label>
            <Input
              id="diskSlotQuantity"
              name="diskSlotQuantity"
              type="number"
              value={componentForm.diskSlotQuantity || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ruSize">RU Size</Label>
            <Input
              id="ruSize"
              name="ruSize"
              type="number"
              value={componentForm.ruSize || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="networkPortType">Network Port Type</Label>
            <Select
              value={componentForm.networkPortType?.toString() || ''}
              onValueChange={(value) => handleSelectChange('networkPortType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(NetworkPortType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="portsConsumedQuantity">Ports Consumed</Label>
            <Input
              id="portsConsumedQuantity"
              name="portsConsumedQuantity"
              type="number"
              value={componentForm.portsConsumedQuantity || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderSwitchFormFields = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="switchRole">Switch Role</Label>
          <Select
            value={componentForm.switchRole?.toString() || ''}
            onValueChange={(value) => handleSelectChange('switchRole', value)}
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
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ruSize">RU Size</Label>
            <Input
              id="ruSize"
              name="ruSize"
              type="number"
              value={componentForm.ruSize || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="portSpeedType">Port Speed</Label>
            <Select
              value={componentForm.portSpeedType?.toString() || ''}
              onValueChange={(value) => handleSelectChange('portSpeedType', value)}
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
              value={componentForm.portsProvidedQuantity || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="layer">Switch Layer</Label>
            <Select
              value={componentForm.layer?.toString() || ''}
              onValueChange={(value) => handleSelectChange('layer', value)}
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

  const renderDiskFormFields = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="capacityTB">Capacity (TB)</Label>
            <Input
              id="capacityTB"
              name="capacityTB"
              type="number"
              value={componentForm.capacityTB || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="diskType">Disk Type</Label>
            <Select
              value={componentForm.diskType?.toString() || ''}
              onValueChange={(value) => handleSelectChange('diskType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(DiskType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="formFactor">Form Factor</Label>
            <Select
              value={componentForm.formFactor?.toString() || ''}
              onValueChange={(value) => handleSelectChange('formFactor', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select form factor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='2.5"'>2.5"</SelectItem>
                <SelectItem value='3.5"'>3.5"</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="interface">Interface</Label>
            <Select
              value={componentForm.interface?.toString() || ''}
              onValueChange={(value) => handleSelectChange('interface', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select interface" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SATA">SATA</SelectItem>
                <SelectItem value="SAS">SAS</SelectItem>
                <SelectItem value="NVMe">NVMe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {componentForm.diskType === DiskType.HDD && (
          <div className="space-y-2">
            <Label htmlFor="rpm">RPM</Label>
            <Input
              id="rpm"
              name="rpm"
              type="number"
              value={componentForm.rpm || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="iops">IOPS</Label>
            <Input
              id="iops"
              name="iops"
              type="number"
              value={componentForm.iops || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="readSpeed">Read Speed (MB/s)</Label>
            <Input
              id="readSpeed"
              name="readSpeed"
              type="number"
              value={componentForm.readSpeed || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="writeSpeed">Write Speed (MB/s)</Label>
            <Input
              id="writeSpeed"
              name="writeSpeed"
              type="number"
              value={componentForm.writeSpeed || 0}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTypeSpecificFormFields = () => {
    switch(componentForm.type) {
      case ComponentType.Server:
        return renderServerFormFields();
      case ComponentType.Switch:
        return renderSwitchFormFields();
      case ComponentType.Disk:
        return renderDiskFormFields();
      default:
        return null;
    }
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

  const [deleteComponentId, setDeleteComponentId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Component</DialogTitle>
              <DialogDescription>
                Create a new component for your component library
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Component Type</Label>
                <Select
                  value={componentForm.type?.toString()}
                  onValueChange={handleTypeChange}
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
              
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={componentForm.name || ''}
                  onChange={handleInputChange}
                  placeholder="Component name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  name="manufacturer"
                  value={componentForm.manufacturer || ''}
                  onChange={handleInputChange}
                  placeholder="Manufacturer"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  name="model"
                  value={componentForm.model || ''}
                  onChange={handleInputChange}
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
                    value={componentForm.cost || 0}
                    onChange={handleInputChange}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="powerRequired">Power (W)</Label>
                  <Input
                    id="powerRequired"
                    name="powerRequired"
                    type="number"
                    value={componentForm.powerRequired || 0}
                    onChange={handleInputChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  name="isDefault"
                  checked={componentForm.isDefault || false}
                  onCheckedChange={(checked) => {
                    setComponentForm({
                      ...componentForm,
                      isDefault: checked
                    });
                  }}
                />
                <Label htmlFor="isDefault">Set as default for this type/role</Label>
              </div>
              
              {renderTypeSpecificFormFields()}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                resetForm();
                setIsAddDialogOpen(false);
              }}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleAddComponent}>
                <Save className="mr-2 h-4 w-4" />
                Add Component
              </Button>
            </DialogFooter>
          </DialogContent>
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
        
        <div className="flex flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            className={selectedCategory === 'all' ? 'bg-primary text-white' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            {categoryIcons.all}
            <span className="ml-1.5">All</span>
          </Button>
          
          {Object.values(ComponentCategory).map((category) => (
            <Button
              key={category}
              variant="outline"
              size="sm"
              className={selectedCategory === category ? 'bg-primary text-white' : ''}
              onClick={() => setSelectedCategory(category)}
            >
              {categoryIcons[category]}
              <span className="ml-1.5">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
            </Button>
          ))}
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Power (W)</TableHead>
              <TableHead className="text-center">Default</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredComponents.length > 0 ? (
              filteredComponents.map((component) => (
                <TableRow key={component.id}>
                  <TableCell className="font-medium">{component.name}</TableCell>
                  <TableCell>{component.type}</TableCell>
                  <TableCell>{component.manufacturer}</TableCell>
                  <TableCell>{component.model}</TableCell>
                  <TableCell className="text-right">${component.cost}</TableCell>
                  <TableCell className="text-right">{component.powerRequired}W</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={isDefaultForTypeAndRole(component.id)}
                      onCheckedChange={(checked) => handleToggleDefault(component.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(component)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => cloneComponentTemplate(component.id)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteConfirmation(component.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No components found matching your criteria
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Component</DialogTitle>
            <DialogDescription>
              Update component details
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                name="name"
                value={componentForm.name || ''}
                onChange={handleInputChange}
                placeholder="Component name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-manufacturer">Manufacturer</Label>
              <Input
                id="edit-manufacturer"
                name="manufacturer"
                value={componentForm.manufacturer || ''}
                onChange={handleInputChange}
                placeholder="Manufacturer"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-model">Model</Label>
              <Input
                id="edit-model"
                name="model"
                value={componentForm.model || ''}
                onChange={handleInputChange}
                placeholder="Model"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cost">Cost ($)</Label>
                <Input
                  id="edit-cost"
                  name="cost"
                  type="number"
                  value={componentForm.cost || 0}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-power">Power (W)</Label>
                <Input
                  id="edit-power"
                  name="powerRequired"
                  type="number"
                  value={componentForm.powerRequired || 0}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-default"
                checked={componentForm.isDefault || false}
                onCheckedChange={(checked) => {
                  setComponentForm({
                    ...componentForm,
                    isDefault: checked
                  });
                }}
              />
              <Label htmlFor="edit-default">Set as default for this type/role</Label>
            </div>
            
            {renderTypeSpecificFormFields()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setIsEditDialogOpen(false);
            }}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleAddComponent}>
              <Save className="mr-2 h-4 w-4" />
              Update Component
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this component? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
