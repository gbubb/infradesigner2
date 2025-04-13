// src/components/design/CalculationBreakdown.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDesignStore } from '@/store/designStore';
import { Card } from '@/components/ui/card';

interface CalculationBreakdownProps {
  roleId: string;
  roleName: string;
  children: React.ReactNode;
}

export const CalculationBreakdown: React.FC<CalculationBreakdownProps> = ({ 
  roleId, 
  roleName,
  children 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [breakdownSteps, setBreakdownSteps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get store methods directly to avoid re-renders
  const { getCalculationBreakdown, calculateRequiredQuantity, componentRoles } = useDesignStore();
  
  // Find the role by ID to get its information
  const role = componentRoles.find(r => r.id === roleId);
  const clusterName = role?.clusterInfo?.clusterName;
  const roleType = role?.role || '';
  
  // Update breakdown steps whenever the dialog opens
  useEffect(() => {
    if (isOpen && role) {
      setIsLoading(true);
      
      // If the role has an assigned component, make sure we have a fresh calculation
      if (role.assignedComponentId) {
        try {
          // Force a calculation first
          const requiredQuantity = calculateRequiredQuantity(roleId, role.assignedComponentId);
          console.log(`Calculated quantity for ${roleId} (${roleType}): ${requiredQuantity}`);
          
          // Add a small delay to ensure the calculation has had time to update state
          setTimeout(() => {
            // Now get the breakdown steps
            const steps = getCalculationBreakdown(roleId);
            console.log(`Got breakdown steps for ${roleId} (${roleType}):`, steps?.length || 0);
            
            if (steps && steps.length > 0) {
              setBreakdownSteps(steps);
            } else {
              // If no steps are found, populate with default information
              const defaultSteps = generateDefaultBreakdown(role);
              setBreakdownSteps(defaultSteps);
            }
            setIsLoading(false);
          }, 300);
        } catch (error) {
          console.error(`Error calculating quantity for ${roleType} (${roleId}):`, error);
          const defaultSteps = generateDefaultBreakdown(role);
          setBreakdownSteps(defaultSteps);
          setIsLoading(false);
        }
      } else {
        // Generate default steps for unassigned roles
        const defaultSteps = generateDefaultBreakdown(role);
        setBreakdownSteps(defaultSteps);
        setIsLoading(false);
      }
    }
  }, [isOpen, role, roleId, roleType, calculateRequiredQuantity, getCalculationBreakdown]);
  
  // Generate a default breakdown for roles without specific calculations
  const generateDefaultBreakdown = (role: any) => {
    const steps: string[] = [];
    
    // Include role basic information
    steps.push(`Role: ${roleName} (${roleType})`);
    steps.push(`Required quantity: ${role.adjustedRequiredCount || role.requiredCount}`);
    
    if (role.clusterInfo) {
      steps.push(`Cluster: ${role.clusterInfo.clusterName || 'Unnamed cluster'}`);
    }
    
    // Add information based on the role type
    if (roleType === 'computeNode') {
      steps.push(`Compute nodes are sized based on vCPU and memory requirements.`);
      steps.push(`The calculation takes into account the CPU overcommit ratio and availability zone distribution.`);
      if (role.clusterInfo) {
        steps.push(`This compute node is part of cluster: ${role.clusterInfo.clusterName}`);
      }
    } else if (roleType === 'gpuNode') {
      steps.push(`GPU nodes are sized based on CPU, memory, and GPU requirements.`);
      steps.push(`The calculation takes into account the CPU overcommit ratio and availability zone distribution.`);
      if (role.clusterInfo) {
        steps.push(`This GPU node is part of cluster: ${role.clusterInfo.clusterName}`);
      }
    } else if (roleType === 'storageNode') {
      steps.push(`Storage node quantity is calculated based on the total required capacity and the capacity provided by each node.`);
      steps.push(`The calculation takes into account the storage pool type efficiency factor and maximum fill percentage.`);
      if (role.clusterInfo) {
        steps.push(`This storage node is part of cluster: ${role.clusterInfo.clusterName}`);
      }
    } else if (roleType === 'controllerNode') {
      steps.push(`Controller nodes requirement is defined in the compute requirements.`);
      steps.push(`The default controller node count is 3 for high availability.`);
    } else if (roleType === 'infrastructureNode') {
      steps.push(`Infrastructure node count is defined in the compute requirements.`);
      steps.push(`Required for monitoring, logging, and management services.`);
    } else if (roleType === 'managementSwitch') {
      steps.push(`Management switch requirement is calculated based on the network topology.`);
      steps.push(`One management switch per rack is required for redundancy.`);
    } else if (roleType === 'leafSwitch' || roleType === 'spineSwitch' || roleType === 'borderLeafSwitch') {
      steps.push(`Switch quantity is calculated based on the network topology and number of availability zones.`);
      steps.push(`Spine-leaf architecture requires redundancy for each network segment.`);
    } else if (roleType === 'firewall') {
      steps.push(`Firewall quantity is determined by the physical firewalls requirement.`);
      steps.push(`Standard configuration uses two firewalls for redundancy.`);
    } else if (!role.assignedComponentId) {
      steps.push(`No component assigned to this role yet.`);
      steps.push(`Please assign a component to see a detailed calculation.`);
    }
    
    return steps;
  };
  
  // Handle dialog open state
  const handleDialogOpen = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset steps when closing
      setBreakdownSteps([]);
    }
  };
  
  // Build the title with cluster name if available
  const titleText = clusterName 
    ? `Calculation Breakdown for ${roleName} (${clusterName})` 
    : `Calculation Breakdown for ${roleName}`;

  // Determine a specific note based on the role type
  const getContextNote = () => {
    if (roleType === 'storageNode') {
      return "For storage calculations, the effective capacity factors in both the storage pool type efficiency and the maximum recommended fill percentage.";
    } else if (roleType === 'computeNode') {
      return "For compute nodes, we calculate based on both CPU and memory requirements, using the higher of the two values. Nodes are evenly distributed across availability zones.";
    } else if (roleType === 'gpuNode') {
      return "For GPU nodes, we calculate based on both CPU and memory requirements, plus additional nodes for redundancy. Nodes are evenly distributed across availability zones.";
    } else if (roleType.includes('Switch')) {
      return "For switches, the calculation ensures even distribution across racks and availability zones based on the network topology.";
    } else {
      return "For redundancy calculations, we ensure that additional nodes are evenly distributed across all availability zones by rounding up to the nearest multiple of the total AZ count.";
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>
            How the required quantity was calculated
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
            <p className="text-sm text-muted-foreground">Calculating...</p>
          </div>
        ) : breakdownSteps && breakdownSteps.length > 0 ? (
          <div className="space-y-2 py-4">
            <Card className="p-4 bg-slate-50">
              <ol className="list-decimal list-inside space-y-2">
                {breakdownSteps.map((step, index) => (
                  <li key={index} className="text-sm mb-2">
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
            <div className="mt-4 text-sm text-muted-foreground border-t pt-4">
              <p>{getContextNote()}</p>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            <p>No detailed calculation available for this component.</p>
            <p className="mt-2">Try assigning a component to see the calculation breakdown.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};