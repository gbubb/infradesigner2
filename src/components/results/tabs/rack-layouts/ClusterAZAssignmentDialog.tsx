
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useDesignStore } from '@/store/designStore';
import { ClusterAZAssignment } from '@/types/infrastructure/rack-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClusterAZAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availabilityZones: string[];
  clusterAssignments: ClusterAZAssignment[];
  setClusterAssignments: React.Dispatch<React.SetStateAction<ClusterAZAssignment[]>>;
  onConfirm: () => void;
}

export const ClusterAZAssignmentDialog: React.FC<ClusterAZAssignmentDialogProps> = ({
  open,
  onOpenChange,
  availabilityZones,
  clusterAssignments,
  setClusterAssignments,
  onConfirm,
}) => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const requirements = useDesignStore(state => state.requirements);
  const [localAssignments, setLocalAssignments] = useState<ClusterAZAssignment[]>([]);
  const [patchPanelCoreSettings, setPatchPanelCoreSettings] = useState({
    copperPatchPanel: true, // Default to true
    fiberPatchPanel: true,  // Default to true
  });

  // Initialize cluster assignments from design
  useEffect(() => {
    if (!activeDesign || !open) return;

    const clusters = activeDesign.clusters || [];
    const newAssignments: ClusterAZAssignment[] = clusters.map(cluster => {
      const existing = clusterAssignments.find(a => a.clusterId === cluster.id);
      return existing || {
        clusterId: cluster.id,
        clusterName: cluster.name,
        clusterType: cluster.type,
        selectedAZs: availabilityZones, // Default to all AZs
      };
    });

    setLocalAssignments(newAssignments);
  }, [activeDesign, open, availabilityZones, clusterAssignments]);

  const handleAZToggle = (clusterId: string, azId: string, checked: boolean) => {
    setLocalAssignments(prev => prev.map(assignment => {
      if (assignment.clusterId === clusterId) {
        const selectedAZs = checked
          ? [...assignment.selectedAZs, azId]
          : assignment.selectedAZs.filter(id => id !== azId);
        return { ...assignment, selectedAZs };
      }
      return assignment;
    }));
  };

  const handleSelectAll = (clusterId: string) => {
    setLocalAssignments(prev => prev.map(assignment =>
      assignment.clusterId === clusterId
        ? { ...assignment, selectedAZs: [...availabilityZones] }
        : assignment
    ));
  };

  const handleSelectNone = (clusterId: string) => {
    setLocalAssignments(prev => prev.map(assignment =>
      assignment.clusterId === clusterId
        ? { ...assignment, selectedAZs: [] }
        : assignment
    ));
  };

  const handleConfirm = () => {
    setClusterAssignments(localAssignments);
    onConfirm();
  };

  const handlePatchPanelSettingChange = (type: 'copperPatchPanel' | 'fiberPatchPanel', checked: boolean) => {
    setPatchPanelCoreSettings(prev => ({
      ...prev,
      [type]: checked,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Configure Auto-Placement Settings</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Patch Panel Core Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Patch Panel Core Rack Placement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="copper-patch-panel-core"
                    checked={patchPanelCoreSettings.copperPatchPanel}
                    onCheckedChange={(checked) => handlePatchPanelSettingChange('copperPatchPanel', checked as boolean)}
                  />
                  <Label htmlFor="copper-patch-panel-core">
                    Place Copper Patch Panels in Core racks
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fiber-patch-panel-core"
                    checked={patchPanelCoreSettings.fiberPatchPanel}
                    onCheckedChange={(checked) => handlePatchPanelSettingChange('fiberPatchPanel', checked as boolean)}
                  />
                  <Label htmlFor="fiber-patch-panel-core">
                    Place Fiber Patch Panels in Core racks
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Core racks: {requirements?.networkRequirements?.copperPatchPanelsPerCoreRack || 0} copper, {requirements?.networkRequirements?.fiberPatchPanelsPerCoreRack || 0} fiber per rack
                </p>
              </CardContent>
            </Card>

            {/* Cluster AZ Assignments */}
            {localAssignments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-medium mb-4">Cluster Availability Zone Assignments</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select which availability zones each cluster can be placed in.
                  </p>
                  <div className="space-y-4">
                    {localAssignments.map((assignment) => (
                      <Card key={assignment.clusterId}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <CardTitle className="text-base">{assignment.clusterName}</CardTitle>
                              <p className="text-sm text-muted-foreground capitalize">
                                {assignment.clusterType} cluster
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectAll(assignment.clusterId)}
                              >
                                All
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectNone(assignment.clusterId)}
                              >
                                None
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            {availabilityZones.map((azId) => (
                              <div key={azId} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${assignment.clusterId}-${azId}`}
                                  checked={assignment.selectedAZs.includes(azId)}
                                  onCheckedChange={(checked) =>
                                    handleAZToggle(assignment.clusterId, azId, checked as boolean)
                                  }
                                />
                                <Label
                                  htmlFor={`${assignment.clusterId}-${azId}`}
                                  className="text-sm"
                                >
                                  {azId}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {localAssignments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No clusters found in the current design.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Auto-placement will use default settings for all devices.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Auto-Placement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
