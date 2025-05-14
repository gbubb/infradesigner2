import React, { useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogHeader,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useDesignStore } from '@/store/designStore';
import { ClusterAZAssignment } from '@/types/infrastructure/rack-types';
import { Separator } from '@/components/ui/separator';

interface ClusterAZAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availabilityZones: string[];
  clusterAssignments: ClusterAZAssignment[];
  setClusterAssignments: (assignments: ClusterAZAssignment[]) => void;
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

  // Initialize cluster assignments when dialog opens
  useEffect(() => {
    if (open && activeDesign) {
      const initialAssignments: ClusterAZAssignment[] = [];

      // Add controller nodes assignment
      if (activeDesign.requirements.computeRequirements.controllerNodeCount &&
          activeDesign.requirements.computeRequirements.controllerNodeCount > 0) {
        initialAssignments.push({
          clusterId: 'controllers',
          clusterName: 'Controller Nodes',
          clusterType: 'controller',
          selectedAZs: availabilityZones.length > 0 ? [availabilityZones[0]] : [] // Default to first AZ
        });
      }

      // Add infrastructure nodes assignment if required
      if (activeDesign.requirements.computeRequirements.infrastructureClusterRequired &&
          activeDesign.requirements.computeRequirements.infrastructureNodeCount &&
          activeDesign.requirements.computeRequirements.infrastructureNodeCount > 0) {
        initialAssignments.push({
          clusterId: 'infrastructure',
          clusterName: 'Infrastructure Nodes',
          clusterType: 'infrastructure',
          selectedAZs: availabilityZones.length > 0 ? [availabilityZones[0]] : [] // Default to first AZ
        });
      }

      // Add compute clusters assignments
      activeDesign.requirements.computeRequirements.computeClusters.forEach(cluster => {
        initialAssignments.push({
          clusterId: cluster.id,
          clusterName: cluster.name,
          clusterType: 'compute',
          selectedAZs: availabilityZones.length > 0 ? [availabilityZones[0]] : [] // Default to first AZ
        });
      });

      // Add storage clusters assignments
      activeDesign.requirements.storageRequirements.storageClusters.forEach(cluster => {
        // Use the configured AZ quantity if available, otherwise default to 1
        const azCount = Math.min(
          cluster.availabilityZoneQuantity || 1, 
          availabilityZones.length
        );
        const selectedAZs = availabilityZones.slice(0, azCount);
        
        initialAssignments.push({
          clusterId: cluster.id,
          clusterName: cluster.name,
          clusterType: 'storage',
          selectedAZs: selectedAZs
        });
      });

      // Only update if there are no existing assignments or if assignments changed
      if (clusterAssignments.length === 0 || JSON.stringify(initialAssignments) !== JSON.stringify(clusterAssignments)) {
        setClusterAssignments(initialAssignments);
      }
    }
  }, [
    open, 
    activeDesign, 
    availabilityZones, 
    setClusterAssignments
    // Removed clusterAssignments from dependencies!
  ]);

  const handleToggleAZ = (clusterId: string, azName: string) => {
    setClusterAssignments(
      clusterAssignments.map(assignment => {
        if (assignment.clusterId === clusterId) {
          if (assignment.selectedAZs.includes(azName)) {
            // Remove AZ if already selected
            return {
              ...assignment,
              selectedAZs: assignment.selectedAZs.filter(az => az !== azName)
            };
          } else {
            // Add AZ if not already selected
            return {
              ...assignment,
              selectedAZs: [...assignment.selectedAZs, azName]
            };
          }
        }
        return assignment;
      })
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[700px] max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Configure Availability Zone Assignments</AlertDialogTitle>
          <AlertDialogDescription>
            Select which availability zones each cluster should be placed in.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-6">
          {clusterAssignments.length === 0 ? (
            <p className="text-center text-muted-foreground">No clusters or nodes defined in requirements.</p>
          ) : (
            <div>
              <table className="w-full border-collapse">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Cluster / Node Type</th>
                    {availabilityZones.map(az => (
                      <th key={az} className="text-center p-2">{az}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clusterAssignments.map((assignment, index) => (
                    <tr key={assignment.clusterId} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                      <td className="p-2">
                        <div className="font-medium">{assignment.clusterName}</div>
                        <div className="text-xs text-muted-foreground">{assignment.clusterType}</div>
                      </td>
                      {availabilityZones.map(az => (
                        <td key={`${assignment.clusterId}-${az}`} className="text-center p-2">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              id={`${assignment.clusterId}-${az}`}
                              checked={assignment.selectedAZs.includes(az)}
                              onCheckedChange={() => handleToggleAZ(assignment.clusterId, az)}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Note: Devices will be distributed evenly across selected AZs and racks within those AZs.</p>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={clusterAssignments.length === 0}>
            Continue with Auto-Placement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
