// src/components/design/CalculationBreakdown.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDesignStore } from '@/store/designStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CalculationBreakdownProps {
  roleId: string;
  roleName: string;
}

export const CalculationBreakdown: React.FC<CalculationBreakdownProps> = ({ 
  roleId, 
  roleName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [breakdownSteps, setBreakdownSteps] = useState<string[]>([]);
  const [calculatedQuantity, setCalculatedQuantity] = useState<number | null>(null);
  const [displayedQuantity, setDisplayedQuantity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get store values directly
  const store = useDesignStore();
  
  // Find the role by ID to get its information
  const role = store.componentRoles.find(r => r.id === roleId);
  const clusterName = role?.clusterInfo?.clusterName;
  const roleType = role?.role || '';
  
  // Update breakdown steps whenever the dialog opens
  useEffect(() => {
    if (isOpen && role) {
      setIsLoading(true);
      console.log(`Fetching calculation for role: ${roleType} (${roleId})`);
      
      // Store the displayed quantity
      setDisplayedQuantity(role.adjustedRequiredCount || role.requiredCount);
      
      // If the role has an assigned component, make sure we have a fresh calculation
      if (role.assignedComponentId) {
        try {
          // Force a calculation first
          console.log(`Calculating quantity for ${roleId} with component ${role.assignedComponentId}`);
          const quantity = store.calculateRequiredQuantity(roleId, role.assignedComponentId);
          console.log(`Calculated quantity: ${quantity}`);
          setCalculatedQuantity(quantity);
          
          // Add a small delay to ensure the calculation has had time to update state
          setTimeout(() => {
            // Now get the breakdown steps
            const steps = store.getCalculationBreakdown(roleId);
            console.log(`Got ${steps?.length || 0} calculation steps for ${roleId}`);
            
            if (steps && steps.length > 0) {
              setBreakdownSteps(steps);
            } else {
              // If no steps are found, generate detailed steps
              const detailedSteps = generateDetailedBreakdown(role, quantity);
              setBreakdownSteps(detailedSteps);
            }
            setIsLoading(false);
          }, 300);
        } catch (error) {
          console.error(`Error calculating quantity for ${roleType} (${roleId}):`, error);
          const detailedSteps = generateDetailedBreakdown(role);
          setBreakdownSteps(detailedSteps);
          setIsLoading(false);
        }
      } else {
        // Generate detailed steps
        const detailedSteps = generateDetailedBreakdown(role);
        setBreakdownSteps(detailedSteps);
        setIsLoading(false);
      }
    }
  }, [isOpen, role, roleId, roleType, store]);
  
  // Generate a detailed breakdown based on actual requirements
  const generateDetailedBreakdown = (role: any, calculatedQty?: number) => {
    const steps: string[] = [];
    
    // Include role basic information
    steps.push(`Role: ${roleName} (${roleType})`);
    steps.push(`Required quantity: ${role.adjustedRequiredCount || role.requiredCount}`);
    
    // Find any matching component for additional info
    const component = role.assignedComponentId ? 
      store.componentTemplates.find(c => c.id === role.assignedComponentId) : 
      undefined;
    
    // Attempt to reconstruct the calculation based on the role type
    if (roleType === 'computeNode' || roleType === 'gpuNode') {
      if (role.clusterInfo?.clusterId) {
        const clusterId = role.clusterInfo.clusterId;
        const cluster = store.requirements.computeRequirements.computeClusters.find(c => c.id === clusterId);
        
        if (cluster) {
          steps.push(`Compute Cluster: ${cluster.name}`);
          steps.push(`Total vCPU requirement: ${cluster.totalVCPUs.toLocaleString()} vCPUs`);
          steps.push(`Total memory requirement: ${cluster.totalMemoryTB.toLocaleString()} TB (${(cluster.totalMemoryTB * 1024).toLocaleString()} GB)`);
          steps.push(`CPU overcommit ratio: ${cluster.overcommitRatio}:1`);
          
          // Show component details if available
          if (component) {
            // Determine cores per server
            let coresPerServer = 0;
            if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
              coresPerServer = component.cpuSockets * component.cpuCoresPerSocket;
              steps.push(`Server Model: ${component.manufacturer} ${component.model} with ${component.cpuSockets} sockets × ${component.cpuCoresPerSocket} cores = ${coresPerServer} cores per server`);
            } else if ('coreCount' in component) {
              coresPerServer = component.coreCount;
              steps.push(`Server Model: ${component.manufacturer} ${component.model} with ${coresPerServer} cores per server`);
            }
            
            // Determine memory per server
            let memoryGBPerServer = 0;
            if ('memoryCapacity' in component) {
              memoryGBPerServer = component.memoryCapacity;
              steps.push(`Server Memory: ${memoryGBPerServer.toLocaleString()} GB per server`);
            } else if ('memoryGB' in component) {
              memoryGBPerServer = component.memoryGB;
              steps.push(`Server Memory: ${memoryGBPerServer.toLocaleString()} GB per server`);
            }
            
            // Calculate required servers based on CPU
            if (coresPerServer > 0) {
              const totalPhysicalCoresNeeded = Math.ceil(cluster.totalVCPUs / cluster.overcommitRatio);
              steps.push(`CPU calculation: ${cluster.totalVCPUs.toLocaleString()} vCPUs ÷ ${cluster.overcommitRatio} = ${totalPhysicalCoresNeeded.toLocaleString()} physical cores needed`);
              
              const nodesNeededForCPU = Math.ceil(totalPhysicalCoresNeeded / coresPerServer);
              steps.push(`Nodes needed for CPU: ${totalPhysicalCoresNeeded.toLocaleString()} cores ÷ ${coresPerServer} cores per server = ${nodesNeededForCPU} nodes`);
              
              // Calculate required servers based on memory
              if (memoryGBPerServer > 0) {
                const totalMemoryGBNeeded = cluster.totalMemoryTB * 1024;
                const nodesNeededForMemory = Math.ceil(totalMemoryGBNeeded / memoryGBPerServer);
                steps.push(`Nodes needed for memory: ${totalMemoryGBNeeded.toLocaleString()} GB ÷ ${memoryGBPerServer.toLocaleString()} GB per server = ${nodesNeededForMemory} nodes`);
                
                // Determine which resource is the limiting factor
                const totalNodesNeeded = Math.max(nodesNeededForCPU, nodesNeededForMemory);
                if (nodesNeededForCPU > nodesNeededForMemory) {
                  steps.push(`CPU is the limiting factor: ${nodesNeededForCPU} nodes required`);
                } else if (nodesNeededForMemory > nodesNeededForCPU) {
                  steps.push(`Memory is the limiting factor: ${nodesNeededForMemory} nodes required`);
                } else {
                  steps.push(`CPU and memory require the same number of nodes: ${totalNodesNeeded} nodes`);
                }
                
                // Distribution across AZs
                const totalAvailabilityZones = store.requirements.physicalConstraints.totalAvailabilityZones || 1;
                let nodesPerAZ = Math.ceil(totalNodesNeeded / totalAvailabilityZones);
                nodesPerAZ = Math.max(1, nodesPerAZ);
                
                steps.push(`Number of availability zones: ${totalAvailabilityZones}`);
                steps.push(`Minimum nodes per AZ: ${totalNodesNeeded} ÷ ${totalAvailabilityZones} = ${nodesPerAZ} nodes per AZ (rounded up)`);
                
                let baseNodeCount = nodesPerAZ * totalAvailabilityZones;
                
                // If we rounded up for the AZ calculation, we might have more nodes than originally needed
                if (baseNodeCount > totalNodesNeeded) {
                  steps.push(`To ensure even distribution, adjusting to ${nodesPerAZ} nodes per AZ × ${totalAvailabilityZones} AZs = ${baseNodeCount} total nodes`);
                } else {
                  steps.push(`Base node count: ${nodesPerAZ} × ${totalAvailabilityZones} = ${baseNodeCount} nodes`);
                }
                
                // Add redundancy
                let additionalNodesCount = 0;
                if (cluster.availabilityZoneRedundancy === 'N+1') {
                  const redundancyNodesNeeded = nodesPerAZ;
                  additionalNodesCount = Math.ceil(redundancyNodesNeeded / totalAvailabilityZones) * totalAvailabilityZones;
                  steps.push(`N+1 redundancy: Need ${redundancyNodesNeeded} more nodes to handle 1 AZ failure`);
                  steps.push(`For even distribution: ${additionalNodesCount} additional nodes (${Math.ceil(redundancyNodesNeeded / totalAvailabilityZones)} extra nodes per AZ)`);
                } else if (cluster.availabilityZoneRedundancy === 'N+2') {
                  const redundancyNodesNeeded = nodesPerAZ * 2;
                  additionalNodesCount = Math.ceil(redundancyNodesNeeded / totalAvailabilityZones) * totalAvailabilityZones;
                  steps.push(`N+2 redundancy: Need ${redundancyNodesNeeded} more nodes to handle 2 AZ failures`);
                  steps.push(`For even distribution: ${additionalNodesCount} additional nodes (${Math.ceil(redundancyNodesNeeded / totalAvailabilityZones)} extra nodes per AZ)`);
                } else {
                  steps.push(`No redundancy configured: Adding 0 additional nodes`);
                }
                
                const expectedRequiredQuantity = baseNodeCount + additionalNodesCount;
                steps.push(`Final node count: ${baseNodeCount} base nodes + ${additionalNodesCount} redundancy nodes = ${expectedRequiredQuantity} total nodes`);
                
                // Save the calculated quantity for comparison
                if (calculatedQty === undefined) {
                  setCalculatedQuantity(expectedRequiredQuantity);
                }
              }
            }
          }
        }
      } else {
        steps.push(`Compute nodes are sized based on vCPU and memory requirements.`);
        steps.push(`The calculation takes into account the CPU overcommit ratio and availability zone distribution.`);
      }
    } else if (roleType === 'storageNode') {
      // Storage node calculation logic...
      // (implementation similar to compute node but for storage)
    }
    // Other role types...
    
    return steps;
  };
  
  // Build the title with cluster name if available
  const titleText = clusterName 
    ? `Calculation Breakdown for ${roleName} (${clusterName})` 
    : `Calculation Breakdown for ${roleName}`;
  
  // Handle opening the dialog
  const handleOpenDialog = () => {
    console.log("Opening calculation dialog for:", roleId);
    setIsOpen(true);
  };
  
  // Determine if there's a discrepancy between calculated and displayed values
  const hasDiscrepancy = calculatedQuantity !== null && 
                         displayedQuantity !== null && 
                         calculatedQuantity !== displayedQuantity;
  
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-blue-500 hover:bg-blue-50"
              onClick={handleOpenDialog}
            >
              <Calculator className="h-3.5 w-3.5 mr-1" />
              View
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View calculation details</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
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
          ) : (
            <div className="space-y-4 py-4">
              {hasDiscrepancy && (
                <Alert variant="warning" className="mb-4">
                  <AlertDescription>
                    <strong>Notice:</strong> The displayed required quantity ({displayedQuantity}) differs from what our 
                    detailed calculation would produce ({calculatedQuantity}). This may be due to a manual override 
                    or an initial value set during requirement creation.
                  </AlertDescription>
                </Alert>
              )}
              
              {breakdownSteps && breakdownSteps.length > 0 ? (
                <Card className="p-4 bg-slate-50">
                  <ol className="list-decimal list-inside space-y-2">
                    {breakdownSteps.map((step, index) => (
                      <li key={index} className="text-sm mb-2">
                        {step}
                      </li>
                    ))}
                  </ol>
                </Card>
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  <p>No detailed calculation available for this component.</p>
                  <p className="mt-2">Try assigning a component to see the calculation breakdown.</p>
                </div>
              )}
              
              <div className="mt-4 text-sm text-muted-foreground border-t pt-4">
                <p><strong>How this works:</strong> The initial "Required quantity" value is typically set when 
                the component roles are first created based on your requirements. The detailed calculation shown above 
                demonstrates what the value would be based on current inputs.</p>
              </div>
              
              {/* Show button to fix this */}
              {hasDiscrepancy && (
                <div className="mt-4 text-center">
                  <Button onClick={() => alert("This would need to be fixed by updating the code in src/store/slices/requirements/roleCalculator.ts")}>
                    Learn About Fixing This
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};