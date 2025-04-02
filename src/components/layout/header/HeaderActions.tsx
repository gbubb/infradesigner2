
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useDesignStore } from '@/store/designStore';
import { Save, Download, Upload, PlusCircle, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { NewDesignDialog } from './dialogs/NewDesignDialog';
import { LoadDesignDialog } from './dialogs/LoadDesignDialog';

export const HeaderActions: React.FC = () => {
  const { activeDesign, saveDesign, exportDesign, importDesign } = useDesignStore();
  const [isNewDesignDialogOpen, setIsNewDesignDialogOpen] = useState(false);
  const [isLoadDesignDialogOpen, setIsLoadDesignDialogOpen] = useState(false);
  
  // Create a file input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle export button click
  const handleExport = () => {
    if (activeDesign) {
      exportDesign();
    } else {
      toast.error("No active design to export");
    }
  };

  // Handle import button click
  const handleImport = () => {
    // Trigger file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check if file is JSON
    if (file.type !== "application/json" && !file.name.endsWith('.json')) {
      toast.error("Please select a valid JSON file");
      return;
    }
    
    // Import the design
    await importDesign(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="ml-auto flex gap-2">
      <NewDesignDialog 
        isOpen={isNewDesignDialogOpen}
        onOpenChange={setIsNewDesignDialogOpen}
      />

      <LoadDesignDialog
        isOpen={isLoadDesignDialogOpen}
        onOpenChange={setIsLoadDesignDialogOpen}
      />

      <Button 
        variant="secondary"
        className="bg-white text-infra-blue hover:bg-gray-100"
        onClick={() => setIsNewDesignDialogOpen(true)}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        New Design
      </Button>

      <Button 
        variant="secondary"
        className="bg-white text-infra-blue hover:bg-gray-100"
        onClick={() => setIsLoadDesignDialogOpen(true)}
      >
        <FolderOpen className="mr-2 h-4 w-4" />
        Load Design
      </Button>

      <Button 
        variant="secondary"
        className="bg-white text-infra-blue hover:bg-gray-100"
        onClick={saveDesign}
        disabled={!activeDesign}
      >
        <Save className="mr-2 h-4 w-4" />
        Save
      </Button>
      
      <Button 
        variant="secondary"
        className="bg-white text-infra-blue hover:bg-gray-100 px-2"
        onClick={handleExport}
        disabled={!activeDesign}
        title="Export Design"
      >
        <Download className="h-4 w-4" />
      </Button>
      
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,application/json"
        className="hidden"
      />
      
      <Button 
        variant="secondary" 
        className="bg-white text-infra-blue hover:bg-gray-100 px-2"
        onClick={handleImport}
        title="Import Design"
      >
        <Upload className="h-4 w-4" />
      </Button>
    </div>
  );
};
