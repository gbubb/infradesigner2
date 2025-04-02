
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';

interface NewDesignDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewDesignDialog: React.FC<NewDesignDialogProps> = ({ isOpen, onOpenChange }) => {
  const { createNewDesign } = useDesignStore();
  const [newDesignName, setNewDesignName] = useState('');
  const [newDesignDescription, setNewDesignDescription] = useState('');

  const handleCreateDesign = () => {
    if (newDesignName.trim()) {
      createNewDesign(newDesignName, newDesignDescription);
      setNewDesignName('');
      setNewDesignDescription('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Infrastructure Design</DialogTitle>
          <DialogDescription>
            Enter a name and optional description for your new infrastructure design.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Enter design name"
              value={newDesignName}
              onChange={(e) => setNewDesignName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Enter design description"
              value={newDesignDescription}
              onChange={(e) => setNewDesignDescription(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleCreateDesign}>Create Design</Button>
      </DialogContent>
    </Dialog>
  );
};
