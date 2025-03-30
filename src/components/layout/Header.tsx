
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDesignStore } from '@/store/designStore';
import { Save, FileSymlink, Download, Upload, PlusCircle } from 'lucide-react';

export const Header: React.FC = () => {
  const { activeDesign, createNewDesign, saveDesign } = useDesignStore();
  const [newDesignName, setNewDesignName] = useState('');
  const [newDesignDescription, setNewDesignDescription] = useState('');
  const [isNewDesignDialogOpen, setIsNewDesignDialogOpen] = useState(false);
  
  const handleCreateDesign = () => {
    if (newDesignName.trim()) {
      createNewDesign(newDesignName, newDesignDescription);
      setNewDesignName('');
      setNewDesignDescription('');
      setIsNewDesignDialogOpen(false);
    }
  };

  return (
    <header className="bg-infra-blue px-6 py-3 flex items-center shadow-md z-10">
      <div className="flex items-center">
        <FileSymlink className="h-6 w-6 text-white mr-2" />
        <h1 className="text-white text-xl font-semibold">Infrastructure Design Tool</h1>
      </div>
      
      <div className="ml-6 text-white">
        {activeDesign ? (
          <span className="opacity-80">{activeDesign.name}</span>
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
