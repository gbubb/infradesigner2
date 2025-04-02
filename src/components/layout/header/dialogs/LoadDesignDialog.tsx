
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FolderOpen, Trash2 } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

interface LoadDesignDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LoadDesignDialog: React.FC<LoadDesignDialogProps> = ({ isOpen, onOpenChange }) => {
  const { savedDesigns, setActiveDesign } = useDesignStore();
  const [designToDelete, setDesignToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleLoadDesign = (id: string) => {
    setActiveDesign(id);
    onOpenChange(false);
  };

  // Open delete confirmation dialog
  const confirmDeleteDesign = (id: string) => {
    setDesignToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button 
            variant="secondary"
            className="bg-white text-infra-blue hover:bg-gray-100"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Load Design
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Load Infrastructure Design</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {savedDesigns.length > 0 ? (
              <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
                {savedDesigns.map((design) => (
                  <div key={design.id} className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3 px-4 flex-1"
                      onClick={() => handleLoadDesign(design.id)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{design.name}</div>
                        {design.description && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {design.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Updated: {new Date(design.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => confirmDeleteDesign(design.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No saved designs found. Create a new design to get started.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        designId={designToDelete}
        onDeleteCompleted={() => onOpenChange(false)}
      />
    </>
  );
};
