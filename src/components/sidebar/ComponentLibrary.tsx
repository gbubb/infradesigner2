
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
  Power
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ComponentCard } from './ComponentCard';
import { ComponentType, componentTypeToCategory, ComponentCategory } from '@/types/infrastructure';
import { 
  allComponentTemplates,
  serverTemplates,
  switchTemplates,
  routerTemplates,
  firewallTemplates,
  storageArrayTemplates,
  diskTemplates,
  rackTemplates,
  pduTemplates,
  upsTemplates,
  networkCardTemplates
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
    <div className="w-72 border-r bg-gray-50 flex flex-col h-full overflow-hidden">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-2">Component Library</h2>
        <Input
          type="search"
          placeholder="Search components..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        
        <div className="flex flex-wrap gap-1 mb-4">
          <button
            className={`flex items-center px-3 py-1.5 text-sm rounded-md ${
              selectedCategory === 'all' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => setSelectedCategory('all')}
          >
            {categoryIcons.all}
            <span className="ml-1.5">All</span>
          </button>
          
          {Object.values(ComponentCategory).map((category) => (
            <button
              key={category}
              className={`flex items-center px-3 py-1.5 text-sm rounded-md ${
                selectedCategory === category 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {categoryIcons[category]}
              <span className="ml-1.5">{category}</span>
            </button>
          ))}
        </div>
      </div>
      
      <Separator />
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-3">
          {filteredComponents.length > 0 ? (
            filteredComponents.map((component) => (
              <ComponentCard key={component.id} component={component} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No components found matching your criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
