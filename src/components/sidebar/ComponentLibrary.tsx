
import React, { useState } from 'react';
import { 
  Server, 
  Network, 
  HardDrive, 
  Router, 
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { ComponentType, componentTypeToCategory, ComponentCategory, InfrastructureComponent } from '@/types/infrastructure';
import { 
  allComponentTemplates
} from '@/data/componentData';

export const ComponentLibrary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newComponent, setNewComponent] = useState<Partial<InfrastructureComponent>>({
    type: ComponentType.Server,
    name: '',
    manufacturer: '',
    model: '',
    cost: 0,
    powerRequired: 0,
  });
  
  // Filter components based on search term and selected category
  const filteredComponents = allComponentTemplates.filter(component => {
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
    
    setNewComponent({
      ...newComponent,
      [name]: parsedValue
    });
  };

  const handleTypeChange = (value: string) => {
    setNewComponent({
      ...newComponent,
      type: value as ComponentType
    });
  };

  const handleAddComponent = () => {
    // Validate required fields
    if (!newComponent.name || !newComponent.manufacturer || !newComponent.model) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Create new component with a unique ID
    const component: InfrastructureComponent = {
      id: uuidv4(),
      type: newComponent.type || ComponentType.Server,
      name: newComponent.name,
      manufacturer: newComponent.manufacturer,
      model: newComponent.model,
      cost: newComponent.cost || 0,
      powerRequired: newComponent.powerRequired || 0,
    };

    // Add component to library
    // Note: In a real app, you'd update the component library data
    // For this example, we're just showing a success message
    toast.success(`Added ${component.name} to library`);
    
    // Reset form and close dialog
    setNewComponent({
      type: ComponentType.Server,
      name: '',
      manufacturer: '',
      model: '',
      cost: 0,
      powerRequired: 0,
    });
    setIsAddDialogOpen(false);
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
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Component Type</Label>
                <Select
                  value={newComponent.type}
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
                  value={newComponent.name}
                  onChange={handleInputChange}
                  placeholder="Component name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  name="manufacturer"
                  value={newComponent.manufacturer}
                  onChange={handleInputChange}
                  placeholder="Manufacturer"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  name="model"
                  value={newComponent.model}
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
                    value={newComponent.cost}
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
                    value={newComponent.powerRequired}
                    onChange={handleInputChange}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
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
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
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
    </div>
  );
};
