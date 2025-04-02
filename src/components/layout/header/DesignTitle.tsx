
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Check, X } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { toast } from 'sonner';

export const DesignTitle: React.FC = () => {
  const { activeDesign } = useDesignStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  
  // Update the local state only when activeDesign changes or isEditingName is false
  useEffect(() => {
    if (activeDesign && !isEditingName) {
      setEditedName(activeDesign.name);
    }
  }, [activeDesign?.id, isEditingName]);
  
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
      useDesignStore.getState().saveDesign();
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
  );
};
