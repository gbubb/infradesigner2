
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
  Copy
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ComponentType, componentTypeToCategory, ComponentCategory } from '@/types/infrastructure';
import { 
  allComponentTemplates
} from '@/data/componentData';

export const ComponentLibrary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  
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

  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Component Library</h2>
        <Dialog>
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
            <div className="py-4">
              {/* Component add form would go here */}
              <p className="text-sm text-muted-foreground">Component creation form to be implemented</p>
            </div>
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
