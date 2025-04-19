import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useDesignStore } from '@/store/designStore';
import { InfrastructureDesign } from '@/types/infrastructure';
import { PencilIcon, TrashIcon, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface LoadDesignDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LoadDesignDialog: React.FC<LoadDesignDialogProps> = ({ isOpen, onOpenChange }) => {
  const { savedDesigns, setActiveDesign, createNewDesign, deleteDesign, updateDesign } = useDesignStore();
  const [editingDesign, setEditingDesign] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  
  const handleCloneDesign = (design: InfrastructureDesign) => {
    // Create a dialog to get the new name
    const newName = window.prompt('Enter name for cloned design:', `${design.name} (Copy)`);
    if (!newName) return;
    
    // Create new design with copied data
    const newDesignId = createNewDesign(
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
    
    // Explicitly set the active design to the newly created design
    if (newDesignId) {
      setActiveDesign(newDesignId);
    }
    
    onOpenChange(false);
  };

  const handleDeleteDesign = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteDesign(id);
      toast.success(`Design "${name}" deleted`);
    }
  };

  const startRenameDesign = (design: InfrastructureDesign) => {
    setEditingDesign(design.id);
    setEditedName(design.name);
    setEditedDescription(design.description || '');
  };

  const saveRenamedDesign = (id: string) => {
    if (!editedName.trim()) {
      toast.error("Design name cannot be empty");
      return;
    }

    updateDesign(id, {
      name: editedName,
      description: editedDescription
    });
    
    setEditingDesign(null);
    toast.success(`Design renamed to "${editedName}"`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Load Design</DialogTitle>
          <DialogDescription>Select a design to load, clone, rename or delete</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {savedDesigns.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              No saved designs found
            </div>
          ) : (
            savedDesigns.map((design) => (
              <div 
                key={design.id} 
                className="flex flex-col p-3 border rounded-lg"
              >
                {editingDesign === design.id ? (
                  <div className="space-y-2 mb-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Design name"
                      className="w-full"
                    />
                    <Input
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full"
                    />
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingDesign(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => saveRenamedDesign(design.id)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-2">
                    <div className="font-medium">{design.name}</div>
                    {design.description && (
                      <div className="text-sm text-muted-foreground">{design.description}</div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end gap-2 mt-auto">
                  {editingDesign !== design.id && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteDesign(design.id, design.name)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => startRenameDesign(design)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCloneDesign(design)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => {
                          setActiveDesign(design.id);
                          onOpenChange(false);
                        }}
                      >
                        Load
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
