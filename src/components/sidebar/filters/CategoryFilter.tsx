
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComponentCategory } from '@/types/infrastructure';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CategoryFilterProps {
  selectedCategory: ComponentCategory | 'all';
  onCategoryChange: (category: ComponentCategory | 'all') => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategory, onCategoryChange }) => {
  const categories = [
    'all',
    ComponentCategory.Compute,
    ComponentCategory.Network,
    ComponentCategory.Storage,
    ComponentCategory.Security,
    ComponentCategory.Acceleration
  ];

  const getDisplayText = (category: string) => {
    if (category === 'all') return 'All Categories';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          Filter: {getDisplayText(selectedCategory)}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuRadioGroup value={selectedCategory} onValueChange={(value) => onCategoryChange(value as ComponentCategory | 'all')}>
          {categories.map((category) => (
            <DropdownMenuRadioItem key={category} value={category} className="flex items-center gap-2">
              {getDisplayText(category)}
              {selectedCategory === category && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
