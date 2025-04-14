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
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CalculationBreakdownProps {
  roleId: string;
  roleName: string;
  children?: React.ReactNode;
}

export const CalculationBreakdown: React.FC<CalculationBreakdownProps> = ({ 
  roleId, 
  roleName,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [breakdownSteps, setBreakdownSteps] = useState<string[]>([]);
  const [calculatedQuantity, setCalculatedQuantity] = useState<number | null>(null);
  const [displayedQuantity, setDisplayedQuantity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const store = useDesignStore();
  
  const role = store.componentRoles.find(r => r.id === roleId);
  const clusterName = role?.clusterInfo?.clusterName;
  const roleType = role?.role || '';
  
  useEffect(() => {
    if (isOpen && role) {
      setIsLoading(true);
      setErrorMessage(null);
      setCalculatedQuantity(null);
      setBreakdownSteps([]);
      
      console.log(`Fetching calculation for role: ${roleType} (${roleId})`);
      setDisplayedQuantity(role.adjustedRequiredCount || role.requiredCount);
      
      if (role.assignedComponentId) {
        try {
          console.log(`Attempting calculation for ${roleId} with component ${role.assignedComponentId}`);
          const calculationResult = calculateRequiredQuantity(role, roleId);
          
          if (calculationResult) {
            console.log(`Calculation successful: Qty=${calculationResult.requiredQuantity}, Steps=${calculationResult.calculationSteps.length}`);
            setCalculatedQuantity(calculationResult.requiredQuantity);
            
            if (calculationResult.calculationSteps && calculationResult.calculationSteps.length > 0) {
               console.log(`Using ${calculationResult.calculationSteps.length} steps from calculation result.`);
               setBreakdownSteps(calculationResult.calculationSteps);
               setIsLoading(false);
            } else {
              console.log('Calculation result missing steps, generating detailed breakdown.');
              setTimeout(() => {
                const { steps: detailedSteps, generatedQty } = generateDetailedBreakdown(role, calculationResult.requiredQuantity, roleId);
                setBreakdownSteps(detailedSteps);
                if (generatedQty !== null) {
                  setCalculatedQuantity(generatedQty);
                }
                setIsLoading(false);
              }, 100);
            }
          } else {
            console.log('Primary calculation failed or returned null, generating detailed breakdown.');
            const { steps: detailedSteps, generatedQty } = generateDetailedBreakdown(role, undefined, roleId);
            setBreakdownSteps(detailedSteps);
            if (generatedQty !== null) {
              setCalculatedQuantity(generatedQty);
            }
            setIsLoading(false);
          }
        } catch (error) {
          console.error(`Error calculating quantity for ${roleType} (${roleId}):`, error);
          setErrorMessage(`Error performing calculation: ${error.message || 'Unknown error'}`);
          const { steps: detailedSteps, generatedQty } = generateDetailedBreakdown(role, undefined, roleId);
          setBreakdownSteps(detailedSteps);
          if (generatedQty !== null) {
            setCalculatedQuantity(generatedQty);
          }
          setIsLoading(false);
        }
      } else {
        console.log('No component assigned, generating basic information.');
        const { steps: detailedSteps, generatedQty } = generateDetailedBreakdown(role, undefined, roleId);
        setBreakdownSteps(detailedSteps);
        if (generatedQty !== null) {
          setCalculatedQuantity(generatedQty);
        }
        setIsLoading(false);
      }
    } else if (!isOpen) {
        // Optionally reset state when dialog closes
        // setIsLoading(false);
        // setErrorMessage(null);
        // setCalculatedQuantity(null);
        // setBreakdownSteps([]);
    }
  }, [isOpen, role, roleId, roleType, store]);
  
  const calculateRequiredQuantity = (role, roleId?: string) => {
    if (!role.assignedComponentId) return null;
    
    try {
      const currentRoleId = roleId || role.id;
      
      if (typeof store.calculateRequiredQuantity === 'function') {
        const quantity = store.calculateRequiredQuantity(currentRoleId, role.assignedComponentId);
        const steps = store.getCalculationBreakdown(currentRoleId);
        
        if (steps && steps.length > 0) {
          return { requiredQuantity: quantity, calculationSteps: steps };
        }
      }
      
      return manuallyCalculateQuantity(role);
    } catch (error) {
      console.error("Error in direct calculation:", error);
      return null;
    }
  };
  
  const manuallyCalculateQuantity = (role, roleId?: string) => {
    return {
      requiredQuantity: role.adjustedRequiredCount || role.requiredCount,
      calculationSteps: [`Manually set or initial quantity: ${role.adjustedRequiredCount || role.requiredCount}`]
    };
  };
  
  const generateDetailedBreakdown = (role, calculatedQtyFromEffect?: number, roleId?: string): { steps: string[], generatedQty: number | null } => {
    const steps: string[] = [];
    let generatedQty: number | null = null;
    
    const titleText = clusterName 
      ? `Calculation Breakdown for ${roleName} (${clusterName})` 
      : `Calculation Breakdown for ${roleName}`;
    
    steps.push(`Role: ${roleName} (${roleType})`);
    steps.push(`Displayed quantity: ${role.adjustedRequiredCount || role.requiredCount}`);
    
    const component = role.assignedComponentId ? 
      store.componentTemplates.find(c => c.id === role.assignedComponentId) : 
      undefined;
    
    if (!component) {
      steps.push("No component assigned to this role.");
      return { steps, generatedQty };
    }
    
    steps.push(`Component: ${component.name} (${component.manufacturer} ${component.model})`);
    
    if (roleType === 'computeNode' || roleType === 'gpuNode') {
      if (role.clusterInfo?.clusterId) {
        const clusterId = role.clusterInfo.clusterId;
        const cluster = store.requirements.computeRequirements.computeClusters.find(c => c.id === clusterId);
        
        if (cluster) {
          steps.push(`Compute Cluster: ${cluster.name}`);
          steps.push(`Total vCPU requirement: ${cluster.totalVCPUs.toLocaleString()} vCPUs`);
          steps.push(`Total memory requirement: ${cluster.totalMemoryTB.toLocaleString()} TB (${(cluster.totalMemoryTB * 1024).toLocaleString()} GB)`);
          steps.push(`CPU overcommit ratio: ${cluster.overcommitRatio}:1`);
          
          let coresPerServer = 0;
          if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
            coresPerServer = component.cpuSockets * component.cpuCoresPerSocket;
            steps.push(`Server Model: ${component.manufacturer} ${component.model} with ${component.cpuSockets} sockets × ${component.cpuCoresPerSocket} cores = ${coresPerServer} cores per server`);
          } else if ('coreCount' in component) {
            coresPerServer = component.coreCount;
            steps.push(`Server Model: ${component.manufacturer} ${component.model} with ${coresPerServer} cores per server`);
          }
          
          let memoryGBPerServer = 0;
          if ('memoryCapacity' in component) {
            memoryGBPerServer = component.memoryCapacity;
            steps.push(`Server Memory: ${memoryGBPerServer.toLocaleString()} GB per server`);
          } else if ('memoryGB' in component) {
            memoryGBPerServer = component.memoryGB;
            steps.push(`Server Memory: ${memoryGBPerServer.toLocaleString()} GB per server`);
          }
          
          if (coresPerServer > 0 && memoryGBPerServer > 0) {
              const totalPhysicalCoresNeeded = Math.ceil(cluster.totalVCPUs / cluster.overcommitRatio);
              steps.push(`CPU calculation: ${cluster.totalVCPUs.toLocaleString()} vCPUs ÷ ${cluster.overcommitRatio} = ${totalPhysicalCoresNeeded.toLocaleString()} physical cores needed`);
              
              const nodesNeededForCPU = Math.ceil(totalPhysicalCoresNeeded / coresPerServer);
              steps.push(`Nodes needed for CPU: ${totalPhysicalCoresNeeded.toLocaleString()} cores ÷ ${coresPerServer} cores per server = ${nodesNeededForCPU} nodes`);
              
              const totalMemoryGBNeeded = cluster.totalMemoryTB * 1024;
              const nodesNeededForMemory = Math.ceil(totalMemoryGBNeeded / memoryGBPerServer);
              steps.push(`Nodes needed for memory: ${totalMemoryGBNeeded.toLocaleString()} GB ÷ ${memoryGBPerServer.toLocaleString()} GB per server = ${nodesNeededForMemory} nodes`);
                
              const totalNodesNeeded = Math.max(nodesNeededForCPU, nodesNeededForMemory);
              if (nodesNeededForCPU > nodesNeededForMemory) {
                steps.push(`CPU is the limiting factor: ${nodesNeededForCPU} nodes required`);
              } else if (nodesNeededForMemory > nodesNeededForCPU) {
                steps.push(`Memory is the limiting factor: ${nodesNeededForMemory} nodes required`);
              } else {
                steps.push(`CPU and memory require the same number of nodes: ${totalNodesNeeded} nodes`);
              }
                
              const totalAvailabilityZones = store.requirements.physicalConstraints.totalAvailabilityZones || 1;
              let nodesPerAZ = Math.ceil(totalNodesNeeded / totalAvailabilityZones);
              nodesPerAZ = Math.max(1, nodesPerAZ);
              
              steps.push(`Number of availability zones: ${totalAvailabilityZones}`);
              steps.push(`Minimum nodes per AZ: ceil(${totalNodesNeeded} / ${totalAvailabilityZones}) = ${nodesPerAZ} nodes per AZ`);
              
              let baseNodeCount = nodesPerAZ * totalAvailabilityZones;
              
              if (baseNodeCount < totalNodesNeeded) {
                 steps.push(`Adjusted base node count for even distribution: ${nodesPerAZ} nodes/AZ * ${totalAvailabilityZones} AZs = ${baseNodeCount} total nodes`);
              } else {
                steps.push(`Base node count: ${nodesPerAZ} nodes/AZ * ${totalAvailabilityZones} AZs = ${baseNodeCount} nodes`);
              }

              let additionalNodesCount = 0;
              let redundancyFactor = 0;
              if (cluster.availabilityZoneRedundancy === 'N+1') redundancyFactor = 1;
              if (cluster.availabilityZoneRedundancy === 'N+2') redundancyFactor = 2;

              if (redundancyFactor > 0 && totalAvailabilityZones > redundancyFactor) {
                const additionalNodesPerAz = nodesPerAZ * redundancyFactor;
                additionalNodesCount = additionalNodesPerAz;
                steps.push(`${cluster.availabilityZoneRedundancy} redundancy: Need ${nodesPerAZ} nodes per failed AZ * ${redundancyFactor} failed AZs = ${additionalNodesCount} additional nodes`);
              } else if (redundancyFactor > 0) {
                 steps.push(`${cluster.availabilityZoneRedundancy} redundancy not possible with ${totalAvailabilityZones} AZs. Requires > ${redundancyFactor} AZs.`);
                 steps.push(`Adding 0 additional nodes for redundancy.`);
              } else {
                 steps.push(`No redundancy configured: Adding 0 additional nodes.`);
              }

              generatedQty = baseNodeCount + additionalNodesCount;
              steps.push(`Final node count: ${baseNodeCount} base nodes + ${additionalNodesCount} redundancy nodes = ${generatedQty} total nodes`);
          } else {
             steps.push("Cannot calculate node count: Missing core or memory information for the selected server model.");
          }
        } else {
           steps.push("Could not find associated compute cluster details.");
        }
      } else {
        steps.push(`Compute nodes require cluster assignment for detailed calculation.`);
      }
    } else if (roleType === 'storageNode') {
      if (role.clusterInfo?.clusterId) {
        steps.push(`Storage node calculation depends on cluster settings and component details.`);
        steps.push(`Detailed breakdown for storage is complex and may require manual review.`);
      }
    } else if (roleType.includes('Switch')) {
      steps.push(`Network switches are calculated based on the network topology, switch role, and availability zones.`);
      steps.push(`Switch quantity depends on topology, role (Leaf, Spine, Core), ports needed, and redundancy.`);
    } else {
       steps.push(`Detailed calculation breakdown not implemented for role type: ${roleType}`);
    }
    
    return { steps, generatedQty };
  };
  
  const handleOpenDialog = () => {
    console.log("Opening calculation dialog for:", roleId);
    setIsOpen(true);
  };
  
  const hasDiscrepancy = calculatedQuantity !== null && 
                         displayedQuantity !== null && 
                         calculatedQuantity !== displayedQuantity;
  
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {React.isValidElement(children) ? (
               React.cloneElement(children, {
                 onClick: (e) => {
                   handleOpenDialog();
                   if (typeof children.props.onClick === 'function') {
                     children.props.onClick(e);
                   }
                 }
               } as React.Attributes)
             ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-blue-500 hover:bg-blue-50"
                onClick={handleOpenDialog}
              >
                <Calculator className="h-3.5 w-3.5 mr-1" />
                View
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>View calculation details for {roleName}</p>
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
              {errorMessage && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}
              
              {hasDiscrepancy && (
                <Alert variant="warning" className="mb-4">
                  <AlertDescription>
                    <strong>Notice:</strong> The displayed quantity ({displayedQuantity ?? 'N/A'}) differs from the calculated quantity ({calculatedQuantity ?? 'N/A'}). This may be due to a manual override or initial value. The breakdown below reflects the calculation based on current settings.
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
                  <p>No detailed calculation available or calculation failed.</p>
                  {!role?.assignedComponentId && <p className="mt-2">Try assigning a component to see the calculation breakdown.</p>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
