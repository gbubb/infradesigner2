
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

// Create a new form factor for actions: compact, boxy, shadow, neutral bg, minimal border radius, similar to sidebar, but gray
const actionButtonNeutralStyle =
  "bg-[#f0f1f5] hover:bg-gray-200 text-[#1A3A5F] shadow rounded-md border border-gray-300 px-2.5 py-1.5 min-w-[44px] min-h-[39px] flex flex-row gap-1.5 items-center text-[0.97rem] font-medium transition-all focus:outline-none";

// NOTE: For sidebar buttons use color, for top action buttons use neutral style only

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

      <button
        className={actionButtonNeutralStyle}
        onClick={() => setNewDialogOpen(true)}
      >
        <PlusCircle className="h-4 w-4 mr-1.5" />
        New
      </button>
      
      <button
        className={actionButtonNeutralStyle}
        onClick={() => setLoadDialogOpen(true)}
      >
        <Download className="h-4 w-4 mr-1.5" />
        Load
      </button>
      
      {activeDesign && (
        <>
          <button
            className={actionButtonNeutralStyle}
            onClick={() => saveDesign()}
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save
          </button>
          
          <button
            className={actionButtonNeutralStyle}
            onClick={() => exportDesign()}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Export
          </button>
          
          <button
            className={actionButtonNeutralStyle}
            onClick={handleImport}
          >
            <Import className="h-4 w-4 mr-1.5" />
            Import
          </button>
          
          <button
            className={actionButtonNeutralStyle}
            onClick={handleShareDesign}
          >
            <Share2 className="h-4 w-4 mr-1.5" />
            Share
          </button>
          
          <button
            className={actionButtonNeutralStyle + (activeDesign.is_public ? " opacity-70" : "")}
            onClick={handleTogglePublicAccess}
          >
            <Globe className="h-4 w-4 mr-1.5" />
            {activeDesign.is_public ? "Public" : "Private"}
          </button>
          
          <button
            className={actionButtonNeutralStyle}
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </button>
        </>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full bg-[#e9eaf3] w-9 h-9 flex items-center justify-center shadow border border-gray-300 hover:bg-gray-200">
            <Avatar className="h-7 w-7">
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
          </button>
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
