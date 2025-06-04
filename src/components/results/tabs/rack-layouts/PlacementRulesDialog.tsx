import React, { useState, useEffect } from 'react';
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
import { InfrastructureDesign } from '@/types/infrastructure/design-types';
import { useDesignStore } from '@/store/designStore';
import { toast } from 'sonner';

interface PlacementRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availabilityZones: string[];
}

// Helper to extract all unique cluster/device lines
const getAllConfigurableRoles = (activeDesign: InfrastructureDesign | null, availabilityZones: string[]) => {
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

    // For cluster-based roles, use the actual cluster ID, otherwise use role ID
    const clusterId = (['storage', 'storagenode', 'compute', 'computenode', 'controller', 'gpunode'].some(type => roleKey.includes(type)) && role.clusterInfo?.clusterId)
      ? role.clusterInfo.clusterId
      : role.id;

    lines.push({
      id: clusterId,
      name: finalDisplayName,
      clusterType: role.role, 
      autoDefaultTo,
    });
  }
  return lines;
};

export const PlacementRulesDialog: React.FC<PlacementRulesDialogProps> = ({
  open,
  onOpenChange,
  availabilityZones,
}) => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const updatePlacementRules = useDesignStore(state => state.updatePlacementRules);
  const [localRules, setLocalRules] = useState<ClusterAZAssignment[]>([]);

  useEffect(() => {
    if (activeDesign && open) {
      const allRoles = getAllConfigurableRoles(activeDesign, availabilityZones);
      const savedRules = activeDesign.placementRules || [];
      
      const initialRules = allRoles.map(role => {
        // Try to find existing rule by the current cluster ID first
        let existingRule = savedRules.find(rule => rule.clusterId === role.id);
        
        // If not found and this is a cluster-based role, try to find by role ID (for backwards compatibility)
        if (!existingRule && role.id !== role.name) {
          // Try to find by the component role ID for backward compatibility
          const matchingRole = activeDesign.componentRoles?.find(r => 
            r.clusterInfo?.clusterId === role.id
          );
          if (matchingRole) {
            existingRule = savedRules.find(rule => rule.clusterId === matchingRole.id);
          }
        }
        
        return {
          clusterId: role.id,
          clusterName: role.name,
          clusterType: role.clusterType as 'compute' | 'storage' | 'controller' | 'infrastructure',
          selectedAZs: existingRule
            ? existingRule.selectedAZs.length > 0
              ? existingRule.selectedAZs
              : role.autoDefaultTo
            : role.autoDefaultTo,
        };
      });
      setLocalRules(initialRules);
    }
  }, [activeDesign, availabilityZones, open]);

  const handleAZSelection = (clusterId: string, az: string, checked: boolean) => {
    setLocalRules(prevRules => {
      return prevRules.map(rule => {
        if (rule.clusterId === clusterId) {
          const selectedAZs = checked
            ? [...rule.selectedAZs, az]
            : rule.selectedAZs.filter(selectedAZ => selectedAZ !== az);
          return { ...rule, selectedAZs };
        }
        return rule;
      });
    });
  };

  const handleSave = async () => {
    try {
      await updatePlacementRules(localRules);
      toast.success('Placement rules saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving placement rules:', error);
      toast.error('Failed to save placement rules');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] w-full">
        <DialogHeader>
          <DialogTitle>Placement Rules</DialogTitle>
          <DialogDescription>
            Configure the availability zones for each cluster/device type. These rules will be used for automatic device placement.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto py-4 max-h-[60vh]">
          <table className="min-w-full border border-muted rounded">
            <thead className="sticky top-0 bg-background z-10">
              <tr>
                <th className="px-2 py-2 text-left font-medium bg-muted">Role / Cluster</th>
                {availabilityZones.map(az => (
                  <th
                    key={az}
                    className="px-2 py-2 text-center font-medium bg-muted min-w-[100px]"
                  >
                    {az}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {localRules.map(rule => (
                <tr key={rule.clusterId} className="border-t">
                  <td className="px-2 py-2 font-medium">{rule.clusterName}</td>
                  {availabilityZones.map(az => (
                    <td key={az} className="px-2 py-2 text-center">
                      <Checkbox
                        id={`${rule.clusterId}-${az}`}
                        checked={rule.selectedAZs.includes(az)}
                        onCheckedChange={checked => handleAZSelection(rule.clusterId, az, !!checked)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Rules
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};