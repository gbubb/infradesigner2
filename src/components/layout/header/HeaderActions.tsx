
import React, { useState } from 'react';
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// Icon-only, square form factor, tooltip for clarity, neutral style (no coloring)
const actionButtonIconNeutral =
  "bg-[#f0f1f5] hover:bg-gray-200 text-[#1A3A5F] shadow rounded-md border border-gray-300 w-10 h-10 flex items-center justify-center transition-all focus:outline-none p-0";

// NOTE: For sidebar buttons use color, for top action buttons use neutral style only

export const HeaderActions = () => {
  const { activeDesign, deleteDesign, saveDesign, exportDesign, importDesign, togglePublicAccess } = useDesignStore();
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  const { user, signOut } = useAuth();
  
  const handleImport = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        importDesign(target.files[0]);
      }
    });
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

  // Helper to wrap icon buttons with tooltip
  const IconButton = ({ onClick, children, label, disabled } : { onClick?: () => void, children: React.ReactNode, label: string, disabled?: boolean }) =>
    <Tooltip>
      <TooltipTrigger asChild>
        <button 
          type="button"
          className={actionButtonIconNeutral + (disabled ? " opacity-60" : "")}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center">{label}</TooltipContent>
    </Tooltip>;

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />

      <IconButton onClick={() => setNewDialogOpen(true)} label="New Design">
        <PlusCircle size={26} />
      </IconButton>
      
      <IconButton onClick={() => setLoadDialogOpen(true)} label="Load Design">
        <Download size={26} />
      </IconButton>
      
      {activeDesign && (
        <>
          <IconButton onClick={() => saveDesign()} label="Save Design">
            <Save size={26} />
          </IconButton>
          
          <IconButton onClick={() => exportDesign()} label="Export Design">
            <Upload size={26} />
          </IconButton>
          
          <IconButton onClick={handleImport} label="Import Design">
            <Import size={26} />
          </IconButton>
          
          <IconButton onClick={handleShareDesign} label="Share Design">
            <Share2 size={26} />
          </IconButton>
          
          <IconButton
            onClick={handleTogglePublicAccess}
            label={activeDesign.is_public ? "Set Private" : "Set Public"}
            disabled={false}
          >
            <Globe size={26} className={activeDesign.is_public ? "opacity-70" : ""} />
          </IconButton>
          
          <IconButton onClick={() => setDeleteDialogOpen(true)} label="Delete Design">
            <Trash2 size={26} />
          </IconButton>
        </>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full bg-[#e9eaf3] w-10 h-10 flex items-center justify-center shadow border border-gray-300 hover:bg-gray-200">
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

// File length note:
/// NOTE: This file is now over 200 lines. Consider asking to refactor it into smaller files for maintainability.
