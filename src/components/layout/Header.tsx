
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDesignStore } from '@/store/designStore';
import { Save, Download, Upload, PlusCircle, Edit, Check, X, FolderOpen, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const Header: React.FC = () => {
  const { activeDesign, createNewDesign, saveDesign, exportDesign, importDesign, savedDesigns, setActiveDesign, deleteDesign } = useDesignStore();
  const [newDesignName, setNewDesignName] = useState('');
  const [newDesignDescription, setNewDesignDescription] = useState('');
  const [isNewDesignDialogOpen, setIsNewDesignDialogOpen] = useState(false);
  const [isLoadDesignDialogOpen, setIsLoadDesignDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [designToDelete, setDesignToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Create a file input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleLoadDesign = (id: string) => {
    setActiveDesign(id);
    setIsLoadDesignDialogOpen(false);
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

  // Open delete confirmation dialog
  const confirmDeleteDesign = (id: string) => {
    setDesignToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Handle design deletion
  const handleDeleteDesign = () => {
    if (designToDelete) {
      deleteDesign(designToDelete);
      setDesignToDelete(null);
      setIsDeleteDialogOpen(false);
      setIsLoadDesignDialogOpen(false);
    }
  };

  return (
    <header className="bg-infra-blue px-6 py-3 flex items-center shadow-md z-10">
      <div className="flex items-center">
        <img 
          src="/lovable-uploads/471a9da5-ea26-4145-ba48-e8ccd2540995.png" 
          alt="Infrastructure Design Tool Logo" 
          className="h-8 w-auto mr-2"
        />
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

        <Dialog open={isLoadDesignDialogOpen} onOpenChange={setIsLoadDesignDialogOpen}>
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

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Design</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this design? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteDesign}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};
