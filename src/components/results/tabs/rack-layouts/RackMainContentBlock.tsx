
import React from 'react';
import { DevicePalette } from '@/components/palette/DevicePalette';
import { RackDetailView } from './RackDetailView';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ConnectionPanel } from '@/components/connections/ConnectionPanel';

interface RackMainContentBlockProps {
  selectedRackId: string | null;
  rackStats: any;
  selectedRack: any;
  onDeviceClick: (deviceId: string) => void;
  isConnectionDialogOpen: boolean;
  selectedDeviceId: string | null;
  handleCloseConnectionDialog: () => void;
  onDevicePlaced: () => void;
}

export const RackMainContentBlock: React.FC<RackMainContentBlockProps> = ({
  selectedRackId,
  rackStats,
  selectedRack,
  onDeviceClick,
  isConnectionDialogOpen,
  selectedDeviceId,
  handleCloseConnectionDialog,
  onDevicePlaced
}) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    {/* Device palette - takes 1/4 of the space (now on the left) */}
    <div className="md:col-span-1">
      <DevicePalette rackId={selectedRackId || undefined} onDevicePlaced={onDevicePlaced} />
    </div>
    {/* Rack detail view - takes 3/4 of the space (now on the right) */}
    <div className="md:col-span-3">
      {selectedRackId && (
        <RackDetailView
          rackProfileId={selectedRackId}
          onDeviceClick={onDeviceClick}
          rackStats={rackStats}
          selectedRack={selectedRack}
        />
      )}
      {!selectedRackId && (
        <div className="flex items-center justify-center h-[700px] border rounded-md bg-muted/20">
          <p className="text-muted-foreground">Select a rack to view details.</p>
        </div>
      )}
    </div>
    {/* Connection Dialog */}
    {isConnectionDialogOpen && selectedDeviceId && (
      <Dialog
        open={isConnectionDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseConnectionDialog();
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <ConnectionPanel
            deviceId={selectedDeviceId}
            onClose={handleCloseConnectionDialog}
          />
        </DialogContent>
      </Dialog>
    )}
  </div>
);
