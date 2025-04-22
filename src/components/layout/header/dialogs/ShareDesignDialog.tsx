
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDesignStore } from '@/store/designStore';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface ShareDesignDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareDesignDialog: React.FC<ShareDesignDialogProps> = ({ 
  isOpen, 
  onOpenChange
}) => {
  const { activeDesign, togglePublicAccess } = useDesignStore();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (!activeDesign) return;
    
    const shareUrl = `${window.location.origin}/designs/${activeDesign.sharing_id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        toast.success('Share link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        toast.error('Failed to copy link');
        console.error('Error copying link:', err);
      });
  };

  const handleTogglePublic = () => {
    if (activeDesign) {
      togglePublicAccess(activeDesign.id);
    }
  };
  
  const shareUrl = activeDesign ? 
    `${window.location.origin}/designs/${activeDesign.sharing_id}` : 
    '';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Design</DialogTitle>
          <DialogDescription>
            Create a shareable link for others to view your design.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 py-2">
          <Switch 
            id="public-toggle"
            checked={activeDesign?.is_public || false}
            onCheckedChange={handleTogglePublic}
          />
          <Label htmlFor="public-toggle">Make design public</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Input
            value={shareUrl}
            readOnly
            disabled={!activeDesign?.is_public}
            className="flex-1"
          />
          <Button 
            variant="outline" 
            size="icon"
            disabled={!activeDesign?.is_public}
            onClick={handleCopyLink}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        
        {!activeDesign?.is_public && (
          <p className="text-sm text-muted-foreground">
            The design must be public to share it with others.
          </p>
        )}
        
        <DialogFooter className="sm:justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
