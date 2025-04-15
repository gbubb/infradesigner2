import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useDesignStore } from '@/store/designStore';
import { InfrastructureDesign } from '@/types/infrastructure';

export const LoadDesignDialog = () => {
  const { savedDesigns, setActiveDesign, createNewDesign } = useDesignStore();
  const [open, setOpen] = useState(false);
  
  const handleCloneDesign = (design: InfrastructureDesign) => {
    // Create a dialog to get the new name
    const newName = window.prompt('Enter name for cloned design:', `${design.name} (Copy)`);
    if (!newName) return;
    
    // Create new design with copied data
    createNewDesign(
      newName,
      design.description,
      {
        ...design,
        id: undefined, // Let the store generate a new ID
        name: newName,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    );
    
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Load Design</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Load Design</DialogTitle>
          <DialogDescription>Select a design to load or clone</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {savedDesigns.map((design) => (
            <div 
              key={design.id} 
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <div className="font-medium">{design.name}</div>
                {design.description && (
                  <div className="text-sm text-muted-foreground">{design.description}</div>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleCloneDesign(design)}
                >
                  Clone
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => {
                    setActiveDesign(design.id);
                    setOpen(false);
                  }}
                >
                  Load
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
