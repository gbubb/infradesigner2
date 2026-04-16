import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';
import { RackExportService } from '@/services/RackExportService';
import { RackProfile, PlacedDevice } from '@/types/infrastructure/rack-types';
import { InfrastructureComponent } from '@/types/infrastructure/component-types';
import { useDesignStore } from '@/store/designStore';
import { RackService } from '@/services/rackService';
import { toast } from 'sonner';

interface RackPDFExportProps {
  rackProfiles: Array<{ id: string; name: string; azName?: string; availabilityZoneId?: string }>;
  azNameMap: Record<string, string>;
  selectedRackId?: string | null;
}

export const RackPDFExport: React.FC<RackPDFExportProps> = ({
  rackProfiles,
  azNameMap,
  selectedRackId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [includeRowView, setIncludeRowView] = useState(true);
  const [includeDetailedView, setIncludeDetailedView] = useState(true);
  const [exportOnlySelected, setExportOnlySelected] = useState(false);
  const [groupByAZ, setGroupByAZ] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  const activeDesign = useDesignStore(state => state.activeDesign);

  const handleExport = async () => {
    if (!includeRowView && !includeDetailedView) {
      toast.error("Export Options", {
        description: "Please select at least one export option.",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Determine which racks to export
      const racksToExport = exportOnlySelected && selectedRackId
        ? rackProfiles.filter(r => r.id === selectedRackId)
        : rackProfiles;

      // Get rack data with devices
      const racksWithDevices = racksToExport.map(rackProfile => {
        const fullRackProfile = RackService.getRackProfile(rackProfile.id);
        const devices = fullRackProfile?.devices || [];
        
        // Get component details for each device
        const devicesWithComponents = devices.map(placedDevice => {
          const component = activeDesign?.components.find(c => c.id === placedDevice.deviceId);
          return component ? { placedDevice, component } : null;
        }).filter(Boolean) as Array<{ placedDevice: PlacedDevice; component: InfrastructureComponent }>;

        return {
          rack: fullRackProfile || rackProfile as RackProfile,
          devices: devicesWithComponents
        };
      });

      // Get power per rack from requirements
      const powerPerRack = activeDesign?.requirements?.physicalConstraints?.powerPerRackWatts || 0;
      
      // Export to PDF
      await RackExportService.exportRackLayoutsToPDF(
        racksWithDevices,
        azNameMap,
        {
          includeRowView,
          includeDetailedView,
          selectedRacks: exportOnlySelected && selectedRackId ? [selectedRackId] : undefined,
          groupByAZ
        },
        powerPerRack
      );

      toast.success("Export Successful", {
        description: "Rack layouts have been exported to PDF.",
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error("Export Failed", {
        description: "An error occurred while exporting the PDF. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Export PDF
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Export Rack Layouts to PDF</DialogTitle>
            <DialogDescription>
              Configure your PDF export options. The PDF will include visual representations of your rack layouts.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Export Options</h4>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rowView"
                  checked={includeRowView}
                  onCheckedChange={(checked) => setIncludeRowView(checked === true)}
                />
                <Label htmlFor="rowView" className="text-sm font-normal cursor-pointer">
                  Include row-level thumbnail view
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="detailedView"
                  checked={includeDetailedView}
                  onCheckedChange={(checked) => setIncludeDetailedView(checked === true)}
                />
                <Label htmlFor="detailedView" className="text-sm font-normal cursor-pointer">
                  Include detailed rack views with device information
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="groupByAZ"
                  checked={groupByAZ}
                  onCheckedChange={(checked) => setGroupByAZ(checked === true)}
                />
                <Label htmlFor="groupByAZ" className="text-sm font-normal cursor-pointer">
                  Group racks by availability zone
                </Label>
              </div>

              {selectedRackId && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="selectedOnly"
                    checked={exportOnlySelected}
                    onCheckedChange={(checked) => setExportOnlySelected(checked === true)}
                  />
                  <Label htmlFor="selectedOnly" className="text-sm font-normal cursor-pointer">
                    Export only the selected rack
                  </Label>
                </div>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <p>The PDF will include:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {includeRowView && <li>Thumbnail grid showing all racks</li>}
                {includeDetailedView && <li>Detailed pages for each rack with device specifications</li>}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};