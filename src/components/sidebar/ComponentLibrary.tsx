
import React, { useState, useEffect } from 'react';
import { 
  Server as ServerIcon, 
  Network, 
  HardDrive, 
  Router as RouterIcon, 
  Shield, 
  Database,
  LayoutGrid,
  Cpu,
  Power,
  Plus,
  Pencil,
  Trash,
  Copy,
  Save,
  X
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  ComponentType, 
  componentTypeToCategory, 
  ComponentCategory, 
  InfrastructureComponent
} from '@/types/infrastructure';
import { useDesignStore } from '@/store/designStore';

export const ComponentLibrary: React.FC = () => {
  const { 
    componentTemplates,
    addComponentTemplate,
    updateComponentTemplate,
    cloneComponentTemplate,
    deleteComponentTemplate
  } = useDesignStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [componentForm, setComponentForm] = useState<Partial<InfrastructureComponent>>({
    type: ComponentType.Server,
    name: '',
    manufacturer: '',
    model: '',
    cost: 0,
    powerRequired: 0,
  });
  
  // Filter components based on search term and selected category
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
    [ComponentCategory.Compute]: <Cpu className="h-5 w-5" />,
    [ComponentCategory.Network]: <Network className="h-5 w-5" />,
    [ComponentCategory.Storage]: <Database className="h-5 w-5" />,
    [ComponentCategory.Power]: <Power className="h-5 w-5" />,
    [ComponentCategory.Physical]: <LayoutGrid className="h-5 w-5" />,
    [ComponentCategory.Security]: <Shield className="h-5 w-5" />,
    all: <LayoutGrid className="h-5 w-5" />
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    
    // Convert number fields from string to number
    if (name === 'cost' || name === 'powerRequired') {
      parsedValue = parseFloat(value) || 0;
    }
    
    setComponentForm({
      ...componentForm,
      [name]: parsedValue
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
    });
    setEditingComponentId(null);
  };

  const openEditDialog = (component: InfrastructureComponent) => {
    setEditingComponentId(component.id);
    setComponentForm({
      ...component
    });
    setIsEditDialogOpen(true);
  };

  const handleAddComponent = () => {
    // Validate required fields
    if (!componentForm.name || !componentForm.manufacturer || !componentForm.model) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Create new component with a unique ID
    const componentType = componentForm.type || ComponentType.Server;
    
    // Create the base component properties
    const baseComponent = {
      id: componentForm.id || undefined, // If editing, keep existing ID
      type: componentType,
      name: componentForm.name,
      manufacturer: componentForm.manufacturer,
      model: componentForm.model,
      cost: componentForm.cost || 0,
      powerRequired: componentForm.powerRequired || 0,
    };
    
    // Create the appropriate component type
    let component: InfrastructureComponent;
    
    // Handle different component types
    switch (componentType) {
      case ComponentType.Server:
        component = {
          ...baseComponent,
          type: ComponentType.Server,
          rackUnitsConsumed: 1,
          cpuModel: "Generic CPU",
          cpuCount: 1,
          coreCount: 8,
          memoryGB: 32
        } as InfrastructureComponent;
        break;
      case ComponentType.Switch:
        component = {
          ...baseComponent,
          type: ComponentType.Switch,
          rackUnitsConsumed: 1,
          portCount: 24,
          portSpeed: 10,
          layer: 2
        } as InfrastructureComponent;
        break;
      case ComponentType.Router:
        component = {
          ...baseComponent,
          type: ComponentType.Router,
          rackUnitsConsumed: 1,
          portCount: 8,
          portSpeed: 10,
          throughput: 40,
          supportedProtocols: ['BGP', 'OSPF']
        } as InfrastructureComponent;
        break;
      case ComponentType.Firewall:
        component = {
          ...baseComponent,
          type: ComponentType.Firewall,
          rackUnitsConsumed: 1,
          portCount: 8,
          portSpeed: 10,
          throughput: 10,
          features: ['IPS', 'VPN']
        } as InfrastructureComponent;
        break;
      case ComponentType.StorageArray:
        component = {
          ...baseComponent,
          type: ComponentType.StorageArray,
          rackUnitsConsumed: 2,
          driveCapacity: 20,
          driveSlots: 24,
          controllerCount: 2,
          raidSupport: ['RAID5', 'RAID6'],
          networkPorts: 4,
          networkPortSpeed: 10
        } as InfrastructureComponent;
        break;
      case ComponentType.Disk:
        component = {
          ...baseComponent,
          type: ComponentType.Disk,
          capacityTB: 1,
          formFactor: '2.5"',
          interface: 'SATA'
        } as InfrastructureComponent;
        break;
      case ComponentType.Rack:
        component = {
          ...baseComponent,
          type: ComponentType.Rack,
          rackUnits: 42,
          width: 600,
          depth: 1000,
          height: 2000,
          maxWeight: 1000
        } as InfrastructureComponent;
        break;
      default:
        // Use Other type for any other component types
        component = {
          ...baseComponent,
          type: ComponentType.Other
        } as InfrastructureComponent;
    }

    // Add or update component
    if (editingComponentId) {
      updateComponentTemplate(editingComponentId, component);
      setIsEditDialogOpen(false);
    } else {
      addComponentTemplate(component);
      setIsAddDialogOpen(false);
    }
    
    // Reset form
    resetForm();
  };

  // Confirm deletion dialog
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
          <DialogContent>
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
                        {type.charAt(0).toUpperCase() + type.slice(1)}
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
              <span className="ml-1.5">{category}</span>
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No components found matching your criteria
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Component Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
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
                <Label htmlFor="edit-powerRequired">Power (W)</Label>
                <Input
                  id="edit-powerRequired"
                  name="powerRequired"
                  type="number"
                  value={componentForm.powerRequired || 0}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
            </div>
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
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this component? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
