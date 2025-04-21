
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Trash2, Save, Import, Upload } from 'lucide-react';
import { NewDesignDialog } from './dialogs/NewDesignDialog';
import { LoadDesignDialog } from './dialogs/LoadDesignDialog';
import { DeleteConfirmationDialog } from './dialogs/DeleteConfirmationDialog';
import { useDesignStore } from '@/store/designStore';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { toast } from 'sonner';

export const HeaderActions = () => {
  const { activeDesign, deleteDesign, saveDesign, exportDesign, importDesign } = useDesignStore();
  const [newDialogOpen, setNewDialogOpen] = React.useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  
  const handleImport = () => {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    // Add event listener for when a file is selected
    fileInput.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        importDesign(target.files[0]);
      }
    });
    
    // Trigger file selection dialog
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setNewDialogOpen(true)}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        New
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLoadDialogOpen(true)}
      >
        <Download className="mr-2 h-4 w-4" />
        Load
      </Button>
      
      {activeDesign && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveDesign()}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportDesign()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Export
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
          >
            <Import className="mr-2 h-4 w-4" />
            Import
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </>
      )}
      
      <NewDesignDialog isOpen={newDialogOpen} onOpenChange={setNewDialogOpen} />
      <LoadDesignDialog isOpen={loadDialogOpen} onOpenChange={setLoadDialogOpen} />
      <DeleteConfirmationDialog 
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (activeDesign) {
            deleteDesign(activeDesign.id);
          }
          setDeleteDialogOpen(false);
        }}
      />
    </div>
  );
};
