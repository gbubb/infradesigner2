
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlacementReport } from '@/services/automatedPlacementService';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface PlacementReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placementReport: PlacementReport | null;
  azNameMap: Record<string, string>;
  rackNameMap: Record<string, string>;
}

const PlacementReportDialog: React.FC<PlacementReportDialogProps> = ({
  open,
  onOpenChange,
  placementReport,
  azNameMap,
  rackNameMap,
}) => {
  if (!placementReport) return null;

  const successItems = placementReport.items.filter(item => item.status === 'placed');
  const failedItems = placementReport.items.filter(item => item.status === 'failed');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Device Placement Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{placementReport.totalDevices}</div>
              <div className="text-sm text-muted-foreground">Total Devices</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{placementReport.placedDevices}</div>
              <div className="text-sm text-muted-foreground">Successfully Placed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{placementReport.failedDevices}</div>
              <div className="text-sm text-muted-foreground">Failed to Place</div>
            </div>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {/* Successfully Placed Devices */}
              {successItems.length > 0 && (
                <div>
                  <h3 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Successfully Placed ({successItems.length})
                  </h3>
                  <div className="space-y-2">
                    {successItems.map((item, index) => (
                      <div key={index} className="p-3 border border-green-200 rounded-lg bg-green-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{item.deviceName}</div>
                            {item.instanceName && (
                              <div className="text-sm text-muted-foreground">Instance: {item.instanceName}</div>
                            )}
                          </div>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Placed
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm space-y-1">
                          {item.azId && (
                            <div>
                              <span className="font-medium">AZ:</span> {azNameMap[item.azId] || item.azId}
                            </div>
                          )}
                          {item.rackId && (
                            <div>
                              <span className="font-medium">Rack:</span> {rackNameMap[item.rackId] || item.rackId}
                            </div>
                          )}
                          {item.ruPosition && (
                            <div>
                              <span className="font-medium">Position:</span> RU {item.ruPosition}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Devices */}
              {failedItems.length > 0 && (
                <div>
                  <h3 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Failed to Place ({failedItems.length})
                  </h3>
                  <div className="space-y-2">
                    {failedItems.map((item, index) => (
                      <div key={index} className="p-3 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{item.deviceName}</div>
                            {item.instanceName && (
                              <div className="text-sm text-muted-foreground">Instance: {item.instanceName}</div>
                            )}
                          </div>
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            Failed
                          </Badge>
                        </div>
                        {item.reason && (
                          <div className="mt-2 text-sm text-red-600">
                            <span className="font-medium">Reason:</span> {item.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlacementReportDialog;
