
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';

interface ComponentLibraryHeaderProps {
  onOpenAddDialog: () => void;
}

export const ComponentLibraryHeader: React.FC<ComponentLibraryHeaderProps> = ({ onOpenAddDialog }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-semibold">Component Library</h2>
      <Dialog>
        <DialogTrigger asChild>
          <Button onClick={onOpenAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Component
          </Button>
        </DialogTrigger>
      </Dialog>
    </div>
  );
};
