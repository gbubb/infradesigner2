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

  // Identify the explicit "Core" AZ from the provided list
  const coreAzStandardName = "Core";
  const explicitCoreAZ = availabilityZones.find(az =>
    az.toLowerCase() === coreAzStandardName.toLowerCase() ||
    az.toLowerCase().includes('core') // Broader check for variants
  );

  const nonCoreAZs = explicitCoreAZ
    ? availabilityZones.filter(az => az !== explicitCoreAZ)
    : [...availabilityZones];

  const lines: { id: string; name: string; clusterType: string; autoDefaultTo: string[] }[] = [];
  for (const role of activeDesign.componentRoles) {
    const roleKey = role.role?.toLowerCase() || '';
    const clusterSpecificName = role.name && typeof role.name === 'string' && role.name.trim() !== '' ? role.name.trim() : null;

    let finalDisplayName: string;

    if (clusterSpecificName) {
      if (['storage'].some(type => roleKey.includes(type))) {
        finalDisplayName = `Storage Cluster - ${clusterSpecificName}`;
      } else if (['compute', 'controller'].some(type => roleKey.includes(type))) {
        finalDisplayName = `Compute Cluster - ${clusterSpecificName}`;
      } else {
        finalDisplayName = clusterSpecificName; // Use specific name for other types like firewalls if provided
      }
    } else {
      // Fallback if no specific name (role.name) is provided
      if (['storage'].some(type => roleKey.includes(type))) {
        finalDisplayName = `Storage Cluster - ${role.role}`; // e.g., "Storage Cluster - storagenode"
      } else if (['compute', 'controller'].some(type => roleKey.includes(type))) {
        finalDisplayName = `Compute Cluster - ${role.role}`; // e.g., "Compute Cluster - computenode"
      } else {
        finalDisplayName = role.role; // e.g., "firewall"
      }
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
        autoDefaultTo = []; // No "Core" column available, default to no AZs for core devices
      }
    } else { // Non-core devices
      if (nonCoreAZs.length > 0) {
        autoDefaultTo = [...nonCoreAZs];
      } else if (availabilityZones.length > 0) {
        // This case means nonCoreAZs is empty.
        // If explicitCoreAZ was found (e.g. "Core" is the *only* AZ), nonCoreAZs is empty.
        // Non-core devices would then correctly default to no AZs here.
        // If explicitCoreAZ was *not* found, nonCoreAZs would be a copy of all availabilityZones.
        // So, this path (else if availabilityZones.length > 0) effectively means
        // that nonCoreAZs was empty because only a Core AZ exists.
        autoDefaultTo = []; // Default to no AZs if only Core AZ exists for non-core devices.
      } else {
        autoDefaultTo = []; // No AZs at all
      }
    }

    lines.push({
      id: role.id,
      name: finalDisplayName,
      clusterType: role.role, // Functional type remains role.role
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
