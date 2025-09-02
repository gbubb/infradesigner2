import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDesignStore } from "@/store/designStore";
import { CableDistanceSettings, DEFAULT_CABLE_DISTANCE_SETTINGS } from "@/types/infrastructure/cable-settings-types";
import { Info, RotateCcw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CableDistanceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CableDistanceSettingsDialog({ open, onOpenChange }: CableDistanceSettingsDialogProps) {
  const { cableDistanceSettings, updateCableDistanceSettings, resetCableDistanceSettings } = useDesignStore();
  const [localSettings, setLocalSettings] = React.useState<CableDistanceSettings>(cableDistanceSettings);

  React.useEffect(() => {
    setLocalSettings(cableDistanceSettings);
  }, [cableDistanceSettings]);

  const handleSave = () => {
    updateCableDistanceSettings(localSettings);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_CABLE_DISTANCE_SETTINGS);
  };

  const handleCancel = () => {
    setLocalSettings(cableDistanceSettings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cable Distance Calculation Settings</DialogTitle>
          <DialogDescription>
            Configure parameters used for calculating cable lengths between devices.
            These settings affect distance estimation for network connections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Physical Dimensions Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Physical Dimensions</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="ruHeight">RU Height (mm)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Height of 1 rack unit. Standard is 44.45mm (1.75 inches)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="ruHeight"
                  type="number"
                  step="0.1"
                  value={localSettings.ruHeightMm}
                  onChange={(e) => setLocalSettings({ ...localSettings, ruHeightMm: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="rackDepth">Rack Depth (mm)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Depth of rack for front-to-rear cable routing. Typical is 1000-1200mm</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="rackDepth"
                  type="number"
                  step="10"
                  value={localSettings.rackDepthMm}
                  onChange={(e) => setLocalSettings({ ...localSettings, rackDepthMm: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* Cable Management Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Cable Management Allowances</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="slackPerEnd">Slack Per End (mm)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Extra cable length at each connection point for service loops</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="slackPerEnd"
                  type="number"
                  step="10"
                  value={localSettings.slackPerEndMm}
                  onChange={(e) => setLocalSettings({ ...localSettings, slackPerEndMm: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="intraRackRouting">Intra-Rack Routing (mm)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Additional length for cable management within rack</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="intraRackRouting"
                  type="number"
                  step="10"
                  value={localSettings.intraRackRoutingMm}
                  onChange={(e) => setLocalSettings({ ...localSettings, intraRackRoutingMm: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* Inter-Rack Defaults Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Inter-Rack Defaults</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="defaultInterRack">Default Inter-Rack Length (m)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Default cable length when rack layout information is unavailable</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="defaultInterRack"
                  type="number"
                  step="1"
                  value={localSettings.defaultInterRackLengthM}
                  onChange={(e) => setLocalSettings({ ...localSettings, defaultInterRackLengthM: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="overheadHeight">Overhead Cable Height (mm)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Default height above rack for overhead cable routing</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="overheadHeight"
                  type="number"
                  step="10"
                  value={localSettings.overheadCableHeightMm}
                  onChange={(e) => setLocalSettings({ ...localSettings, overheadCableHeightMm: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* Debug Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Debug Options</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="enableLogging">Enable Distance Logging</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Log detailed distance breakdowns to browser console</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="enableLogging"
                checked={localSettings.enableDistanceLogging}
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, enableDistanceLogging: checked })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}