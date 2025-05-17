
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

const actionButtonsConfig = [
  {
    key: 'new',
    icon: <PlusCircle size={26} />,
    label: "New Design",
    onClick: 'setNewDialogOpen'
  },
  {
    key: 'load',
    icon: <Download size={26} />,
    label: "Load Design",
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

  const buttonBase =
    "flex items-center gap-2 bg-[#f0f1f5] hover:bg-gray-200 text-[#1A3A5F] shadow rounded-md border border-gray-300 transition-all focus:outline-none p-0 relative overflow-visible";
  const buttonCompact = "w-10 h-10 px-0 justify-center";
  const buttonExpanded = "px-4 h-10";

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
  }) => (
    <button
      type="button"
      className={`${buttonBase} ${hoveredButton === buttonKey ? buttonExpanded : buttonCompact} ${disabled ? "opacity-60" : ""}`}
      style={{
        minWidth: hoveredButton === buttonKey ? 110 : 40,
        maxWidth: 220,
        transition: "all 0.16s cubic-bezier(.4,1,.3,1)",
      }}
      onClick={onClick}
      onMouseEnter={() => setHoveredButton(buttonKey)}
      onMouseLeave={() => setHoveredButton(null)}
      disabled={disabled}
      aria-label={label}
    >
      {icon}
      <span
        className={`${hoveredButton === buttonKey ? "inline" : "hidden"} whitespace-nowrap font-medium text-sm pl-1`}
        style={{
          transition: "opacity 0.15s cubic-bezier(.4,1,.3,1)",
        }}
      >
        {label}
      </span>
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      {/* Always show topbar actions including new/load, others conditionally */}
      <TopbarButton
        icon={<PlusCircle size={26} />}
        label="New Design"
        onClick={() => setNewDialogOpen(true)}
        buttonKey="new"
      />
      <TopbarButton
        icon={<Download size={26} />}
        label="Load Design"
        onClick={() => setLoadDialogOpen(true)}
        buttonKey="load"
      />
      {activeDesign && (
        <>
          <TopbarButton
            icon={<Save size={26} />}
            label="Save Design"
            onClick={() => saveDesign()}
            buttonKey="save"
          />
          <TopbarButton
            icon={<Upload size={26} />}
            label="Export Design"
            onClick={() => exportDesign()}
            buttonKey="export"
          />
          <TopbarButton
            icon={<Import size={26} />}
            label="Import Design"
            onClick={handleImport}
            buttonKey="import"
          />
          <TopbarButton
            icon={<Share2 size={26} />}
            label="Share Design"
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
            label="Delete Design"
            onClick={() => setDeleteDialogOpen(true)}
            buttonKey="delete"
          />
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
