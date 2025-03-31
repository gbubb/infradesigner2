
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDesignStore } from '@/store/designStore';
import { Save, FileSymlink, Download, Upload, PlusCircle, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export const Header: React.FC = () => {
  const { activeDesign, createNewDesign, saveDesign } = useDesignStore();
  const [newDesignName, setNewDesignName] = useState('');
  const [newDesignDescription, setNewDesignDescription] = useState('');
  const [isNewDesignDialogOpen, setIsNewDesignDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  
  // Update the local state only when activeDesign changes or isEditingName is false
  // This prevents the infinite loop by not updating state during the render cycle
  useEffect(() => {
    if (activeDesign && !isEditingName) {
      setEditedName(activeDesign.name);
    }
  }, [activeDesign?.id, isEditingName]); // Only depend on the design ID, not the whole object
  
  const handleCreateDesign = () => {
    if (newDesignName.trim()) {
      createNewDesign(newDesignName, newDesignDescription);
      setNewDesignName('');
      setNewDesignDescription('');
      setIsNewDesignDialogOpen(false);
    }
  };

  const startEditingName = () => {
    if (activeDesign) {
      setEditedName(activeDesign.name);
      setIsEditingName(true);
    }
  };

  const saveDesignName = () => {
    if (activeDesign && editedName.trim()) {
      // Create a copy of the active design with the updated name
      const updatedDesign = {
        ...activeDesign,
        name: editedName.trim()
      };
      
      // Update the active design in the store
      useDesignStore.setState({ activeDesign: updatedDesign });
      
      // Save the design to update in the saved designs array
      saveDesign();
      toast.success("Design name updated");
      setIsEditingName(false);
    }
  };

  const cancelEditingName = () => {
    if (activeDesign) {
      setEditedName(activeDesign.name);
    }
    setIsEditingName(false);
  };

  return (
    <header className="bg-infra-blue px-6 py-3 flex items-center shadow-md z-10">
      <div className="flex items-center">
        <FileSymlink className="h-6 w-6 text-white mr-2" />
        <h1 className="text-white text-xl font-semibold">Infrastructure Design Tool</h1>
      </div>
      
      <div className="ml-6 text-white flex items-center">
        {activeDesign ? (
          isEditingName ? (
            <div className="flex items-center gap-2">
              <Input 
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="h-8 w-40 bg-infra-blue border-white/30 text-white"
                autoFocus
              />
              <Button 
                variant="ghost" 
                size="icon"
                className="h-6 w-6 text-white hover:bg-infra-blue/70"
                onClick={saveDesignName}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-6 w-6 text-white hover:bg-infra-blue/70"
                onClick={cancelEditingName}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="opacity-80">{activeDesign.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/70 hover:text-white hover:bg-infra-blue/70"
                onClick={startEditingName}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          )
        ) : (
          <span className="opacity-80">No active design</span>
        )}
      </div>
      
      <div className="ml-auto flex gap-2">
        <Dialog open={isNewDesignDialogOpen} onOpenChange={setIsNewDesignDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="bg-white text-infra-blue hover:bg-gray-100">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Design
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Infrastructure Design</DialogTitle>
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
          className="bg-white text-infra-blue hover:bg-gray-100"
          disabled={!activeDesign}
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        
        <Button 
          variant="secondary" 
          className="bg-white text-infra-blue hover:bg-gray-100"
        >
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </div>
    </header>
  );
};
