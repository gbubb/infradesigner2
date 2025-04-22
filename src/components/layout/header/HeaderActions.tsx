
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  Download, 
  Trash2, 
  Save, 
  Import, 
  Upload, 
  LogOut, 
  Share2, 
  Globe 
} from 'lucide-react';
import { NewDesignDialog } from './dialogs/NewDesignDialog';
import { LoadDesignDialog } from './dialogs/LoadDesignDialog';
import { DeleteConfirmationDialog } from './dialogs/DeleteConfirmationDialog';
import { ShareDesignDialog } from './dialogs/ShareDesignDialog';
import { useDesignStore } from '@/store/designStore';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const HeaderActions = () => {
  const { activeDesign, deleteDesign, saveDesign, exportDesign, importDesign, togglePublicAccess } = useDesignStore();
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  const { user, signOut } = useAuth();
  
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

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error during logout:", error);
      toast.error("Logout failed");
    }
  };

  const getUserInitials = () => {
    if (!user) return "?";
    const email = user.email || "";
    return email.substring(0, 2).toUpperCase();
  };

  const handleShareDesign = () => {
    setShareDialogOpen(true);
  };

  const handleTogglePublicAccess = () => {
    if (activeDesign) {
      togglePublicAccess(activeDesign.id);
    }
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
            onClick={handleShareDesign}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          
          <Button
            variant={activeDesign.is_public ? "default" : "outline"}
            size="sm"
            onClick={handleTogglePublicAccess}
          >
            <Globe className="mr-2 h-4 w-4" />
            {activeDesign.is_public ? "Public" : "Private"}
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
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled>{user?.email}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
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
      <ShareDesignDialog 
        isOpen={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </div>
  );
};
