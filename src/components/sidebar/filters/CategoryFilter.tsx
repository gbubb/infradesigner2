
import React from 'react';
import { Button } from '@/components/ui/button';
import { Server as ServerIcon, Network, HardDrive, Shield, Zap, Plus } from 'lucide-react';
import { ComponentCategory } from '@/types/infrastructure';

interface CategoryFilterProps {
  selectedCategory: ComponentCategory | 'all';
  onCategoryChange: (category: ComponentCategory | 'all') => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange
}) => {
  const categoryIcons = {
    [ComponentCategory.Compute]: <ServerIcon className="h-5 w-5" />,
    [ComponentCategory.Network]: <Network className="h-5 w-5" />,
    [ComponentCategory.Storage]: <HardDrive className="h-5 w-5" />,
    [ComponentCategory.Security]: <Shield className="h-5 w-5" />,
    [ComponentCategory.Accelerator]: <Zap className="h-5 w-5" />,
    all: <Plus className="h-5 w-5" />
  };

  return (
    <div className="flex flex-wrap gap-1">
      <Button
        variant="outline"
        size="sm"
        className={selectedCategory === 'all' ? 'bg-primary text-white' : ''}
        onClick={() => onCategoryChange('all')}
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
          onClick={() => onCategoryChange(category)}
        >
          {categoryIcons[category]}
          <span className="ml-1.5">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
        </Button>
      ))}
    </div>
  );
};
