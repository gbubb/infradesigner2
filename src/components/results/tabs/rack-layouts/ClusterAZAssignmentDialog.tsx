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
  availabilityZones: string[]; // expects array of friendly AZ names
  clusterAssignments: ClusterAZAssignment[];
  setClusterAssignments: (assignments: ClusterAZAssignment[]) => void;
  onConfirm: () => void;
}

// Helper to extract all unique cluster/device lines (unchanged, but now expects AZ names, not IDs)
const getAllConfigurableRoles = (activeDesign: any, availabilityZones: string[]) => {
  if (!activeDesign || !activeDesign.componentRoles) return [];

  const coreAzStandardName = "Core";
  const explicitCoreAZ = availabilityZones.find(az =>
    az.toLowerCase() === coreAzStandardName.toLowerCase() ||
    az.toLowerCase().includes('core')
  );

  const nonCoreAZs = explicitCoreAZ
    ? availabilityZones.filter(az => az !== explicitCoreAZ)
    : [...availabilityZones];

  const lines: { id: string; name: string; clusterType: string; autoDefaultTo: string[] }[] = [];
  for (const role of activeDesign.componentRoles) {
    const roleKey = role.role?.toLowerCase() || ''; 
    let finalDisplayName: string;
    let userProvidedName: string | null = null;

    // Check for cluster types first and try to get name from clusterInfo
    if (['storage', 'storagenode', 'compute', 'computenode', 'controller', 'gpunode'].some(type => roleKey.includes(type))) {
      if (role.clusterInfo && typeof role.clusterInfo.clusterName === 'string' && role.clusterInfo.clusterName.trim() !== '') {
        userProvidedName = role.clusterInfo.clusterName.trim();
      }
      
      if (['storage', 'storagenode'].some(type => roleKey.includes(type))) {
        finalDisplayName = userProvidedName ? `Storage Cluster - ${userProvidedName}` : role.role; 
      } else { // For compute, controller, gpunode
        finalDisplayName = userProvidedName ? `Compute Cluster - ${userProvidedName}` : role.role; 
      }
    } else {
      // For non-cluster types (firewalls, switches, etc.)
      // Use role.name if available, otherwise role.role
      userProvidedName = (role.name && typeof role.name === 'string' && role.name.trim() !== '') 
        ? role.name.trim() 
        : null;
      finalDisplayName = userProvidedName || role.role; 
    }

    let autoDefaultTo: string[] = [];
    const isCoreDevice = [
      'firewall',
      'spineswitch',
      'borderleafswitch',
      'border-switch',
      'spine-switch',
      'router'
    ].some(type => roleKey.includes(type));

    if (isCoreDevice) {
      if (explicitCoreAZ) {
        autoDefaultTo = [explicitCoreAZ];
      } else {
        autoDefaultTo = []; 
      }
    } else { 
      if (nonCoreAZs.length > 0) {
        autoDefaultTo = [...nonCoreAZs];
      } else if (availabilityZones.length > 0 && explicitCoreAZ && nonCoreAZs.length === 0) {
        autoDefaultTo = []; 
      } else if (availabilityZones.length > 0 && !explicitCoreAZ) {
        autoDefaultTo = [...availabilityZones];
      } else {
        autoDefaultTo = []; 
      }
    }

    lines.push({
      id: role.id,
      name: finalDisplayName,
      clusterType: role.role, 
      autoDefaultTo,
    });
  }
  return lines;
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

  // Show friendly AZ names (not IDs) in header and assignments
  useEffect(() => {
    if (activeDesign) {
      const allRoles = getAllConfigurableRoles(activeDesign, availabilityZones);
      const initialAssignments = allRoles.map(role => {
        const existingAssignment = clusterAssignments.find(ca => ca.clusterId === role.id);
        return {
          clusterId: role.id,
          clusterName: role.name,
          clusterType: role.clusterType as 'compute' | 'storage' | 'controller' | 'infrastructure',
          selectedAZs: existingAssignment
            ? existingAssignment.selectedAZs.length > 0
              ? existingAssignment.selectedAZs
              : role.autoDefaultTo
            : role.autoDefaultTo,
        };
      });
      setLocalAssignments(initialAssignments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDesign, clusterAssignments, availabilityZones?.join('|')]);

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
    setClusterAssignments(localAssignments);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] w-full">
        <DialogHeader>
          <DialogTitle>Select Availability Zones</DialogTitle>
          <DialogDescription>
            Choose the availability zones for each cluster/device line. (AZ selections for firewalls, spine, border, etc are limited to "Core" by default)
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto py-4">
          <table className="min-w-full border border-muted rounded">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left font-medium bg-muted">Role / Cluster</th>
                {availabilityZones.map(az => (
                  <th
                    key={az}
                    className="px-2 py-2 text-center font-medium bg-muted"
                  >
                    {az}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {localAssignments.map(assignment => (
                <tr key={assignment.clusterId} className="border-t">
                  <td className="px-2 py-2 font-medium">{assignment.clusterName}</td>
                  {availabilityZones.map(az => (
                    <td key={az} className="px-2 py-2 text-center">
                      <Checkbox
                        id={`${assignment.clusterId}-${az}`}
                        checked={assignment.selectedAZs.includes(az)}
                        onCheckedChange={checked => handleAZSelection(assignment.clusterId, az, !!checked)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
