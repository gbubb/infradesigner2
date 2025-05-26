
import React from 'react';
import { Button } from '@/components/ui/button';

interface RackActionsRowProps {
  isPlacing: boolean;
  handleAutoPlaceDevices: () => void;
  isSaving: boolean;
  handleSaveLayout: () => void;
  isResetting: boolean;
  handleResetLayout: () => void;
  isLoadingLayout: boolean;
  handleLoadLayout: () => void;
}

export const RackActionsRow: React.FC<RackActionsRowProps> = ({
  isPlacing,
  handleAutoPlaceDevices,
  isSaving,
  handleSaveLayout,
  isResetting,
  handleResetLayout,
  isLoadingLayout,
  handleLoadLayout
}) => (
  <div className="flex flex-wrap justify-between items-center gap-2">
    <div className="flex gap-2">
      <Button
        variant="default"
        onClick={handleAutoPlaceDevices}
        disabled={isPlacing}
      >
        {isPlacing ? "Placing Devices..." : "Auto-Place Devices"}
      </Button>
      <Button
        variant="secondary"
        onClick={handleSaveLayout}
        disabled={isSaving}
      >
        {isSaving ? "Saving..." : "Save Layout"}
      </Button>
      <Button
        variant="destructive"
        onClick={handleResetLayout}
        disabled={isResetting}
      >
        {isResetting ? "Resetting..." : "Reset Layout"}
      </Button>
      <Button
        variant="outline"
        onClick={handleLoadLayout}
        disabled={isLoadingLayout}
      >
        {isLoadingLayout ? "Loading..." : "Load Layout"}
      </Button>
    </div>
  </div>
);
