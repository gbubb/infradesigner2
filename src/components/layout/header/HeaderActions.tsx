
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
import { useAuth } from '@/hooks/useAuthHook';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const actionButtonsConfig = [
  {
    key: 'new',
    icon: <PlusCircle size={26} />,
    label: "New",
    onClick: 'setNewDialogOpen'
  },
  {
    key: 'load',
    icon: <Download size={26} />,
    label: "Load",
    onClick: 'setLoadDialogOpen'
  },
];

export const HeaderActions = () => {
  const { activeDesign, deleteDesign, saveDesign, exportDesign, importDesign, togglePublicAccess } = useDesignStore();
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
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

  const TopbarButton = ({
    icon,
    label,
    onClick,
    buttonKey,
    disabled = false,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    buttonKey: string;
    disabled?: boolean;
  }) => {
    const isExpanded = hoveredButton === buttonKey;
    
    return (
      <button
        type="button"
        className={`
          relative flex items-center bg-[#f0f1f5] hover:bg-gray-200 text-[#1A3A5F] 
          shadow-sm hover:shadow rounded-md border border-gray-300 focus:outline-none
          focus:ring-2 focus:ring-offset-1 focus:ring-blue-400
          transition-all duration-200 ease-out overflow-hidden
          ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
        `}
        style={{
          height: "40px",
          minWidth: "40px",
          width: isExpanded ? "auto" : "40px",
          paddingLeft: isExpanded ? "12px" : "0",
          paddingRight: isExpanded ? "16px" : "0",
        }}
        onClick={onClick}
        onMouseEnter={() => setHoveredButton(buttonKey)}
        onMouseLeave={() => setHoveredButton(null)}
        disabled={disabled}
        aria-label={label}
      >
        {/* Icon container - no movement or scaling */}
        <div 
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: "40px",
            height: "40px",
          }}
        >
          {icon}
        </div>
        
        {/* Text label - smoother appearance */}
        <span
          className={`
            whitespace-nowrap font-medium text-sm
            transition-all duration-200 ease-out
            ${isExpanded 
              ? "opacity-100 max-w-[120px] ml-1" 
              : "opacity-0 max-w-0 ml-0"
            }
          `}
          style={{
            overflow: "hidden",
          }}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      {/* Always show topbar actions including new/load, others conditionally */}
      <TopbarButton
        icon={<PlusCircle size={26} />}
        label="New"
        onClick={() => setNewDialogOpen(true)}
        buttonKey="new"
      />
      <TopbarButton
        icon={<Download size={26} />}
        label="Load"
        onClick={() => setLoadDialogOpen(true)}
        buttonKey="load"
      />
      {activeDesign && (
        <>
          <TopbarButton
            icon={<Save size={26} />}
            label="Save"
            onClick={() => saveDesign()}
            buttonKey="save"
          />
          <TopbarButton
            icon={<Upload size={26} />}
            label="Export"
            onClick={() => exportDesign()}
            buttonKey="export"
          />
          <TopbarButton
            icon={<Import size={26} />}
            label="Import"
            onClick={handleImport}
            buttonKey="import"
          />
          <TopbarButton
            icon={<Share2 size={26} />}
            label="Share"
            onClick={() => setShareDialogOpen(true)}
            buttonKey="share"
          />
          <TopbarButton
            icon={<Globe size={26} className={activeDesign.is_public ? "opacity-70" : ""} />}
            label={activeDesign.is_public ? "Set Private" : "Set Public"}
            onClick={() => {
              if (activeDesign) {
                togglePublicAccess(activeDesign.id);
              }
            }}
            buttonKey="public"
            disabled={false}
          />
          <TopbarButton
            icon={<Trash2 size={26} />}
            label="Delete"
            onClick={() => setDeleteDialogOpen(true)}
            buttonKey="delete"
          />
        </>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full bg-[#f0f1f5] w-10 h-10 flex items-center justify-center shadow-sm hover:shadow border border-gray-300 hover:bg-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-transparent">{getUserInitials()}</AvatarFallback>
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
