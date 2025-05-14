import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ClusterAZAssignment } from '@/types/infrastructure/rack-types';
import { useDesignStore } from '@/store/designStore';

interface ClusterAZAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availabilityZones: string[];
  clusterAssignments: ClusterAZAssignment[];
  setClusterAssignments: (assignments: ClusterAZAssignment[]) => void;
  onConfirm: () => void;
}

// Add helper to extract all unique cluster and standalone roles from design, including network/core classes
const getAllConfigurableRoles = (activeDesign: any): { id: string; name: string; clusterType: string }[] => {
  if (!activeDesign || !activeDesign.componentRoles) return [];

  const roles = activeDesign.componentRoles.map(role => ({
    id: role.id,
    name: role.role,
    clusterType: role.role // Assuming role name can act as cluster type for now
  }));

  // Add any standalone network/core device types here if needed
  return roles;
};

export const ClusterAZAssignmentDialog: React.FC<ClusterAZAssignmentDialogProps> = ({
  open,
  onOpenChange,
  availabilityZones,
  clusterAssignments,
  setClusterAssignments,
  onConfirm,
}) => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const [localAssignments, setLocalAssignments] = useState<ClusterAZAssignment[]>([]);

  useEffect(() => {
    // Initialize local assignments from props
    if (activeDesign) {
      const allRoles = getAllConfigurableRoles(activeDesign);
      const initialAssignments = allRoles.map(role => {
        const existingAssignment = clusterAssignments.find(ca => ca.clusterId === role.id);
        return {
          clusterId: role.id,
          clusterName: role.name,
          clusterType: role.clusterType as 'compute' | 'storage' | 'controller' | 'infrastructure',
          selectedAZs: existingAssignment ? existingAssignment.selectedAZs : [],
        };
      });
      setLocalAssignments(initialAssignments);
    }
  }, [activeDesign, clusterAssignments]);

  const handleAZSelection = (clusterId: string, az: string, checked: boolean) => {
    setLocalAssignments(prevAssignments => {
      return prevAssignments.map(assignment => {
        if (assignment.clusterId === clusterId) {
          const selectedAZs = checked
            ? [...assignment.selectedAZs, az]
            : assignment.selectedAZs.filter(selectedAZ => selectedAZ !== az);
          return { ...assignment, selectedAZs };
        }
        return assignment;
      });
    });
  };

  const handleConfirm = () => {
    // Update the cluster assignments in the parent component
    setClusterAssignments(localAssignments);
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Select Availability Zones</DialogTitle>
          <DialogDescription>
            Choose the availability zones for each cluster.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {localAssignments.map(assignment => (
            <div key={assignment.clusterId} className="space-y-2">
              <div className="text-sm font-medium leading-none">{assignment.clusterName}</div>
              <div className="flex flex-wrap gap-2">
                {availabilityZones.map(az => (
                  <div key={az} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${assignment.clusterId}-${az}`}
                      checked={assignment.selectedAZs.includes(az)}
                      onCheckedChange={checked => handleAZSelection(assignment.clusterId, az, !!checked)}
                    />
                    <label
                      htmlFor={`${assignment.clusterId}-${az}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {az}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
