import React, { useState, useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [breakdownSteps, setBreakdownSteps] = useState<string[]>([]);
  const [calculatedQuantity, setCalculatedQuantity] = useState<number | null>(null);
  const [displayedQuantity, setDisplayedQuantity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const store = useDesignStore();
  
  const role = store.componentRoles.find(r => r.id === roleId);
  const clusterName = role?.clusterInfo?.clusterName;
  const roleType = role?.role || '';
  
  // Get potentially stable store functions
  const calculateFn = store.calculateRequiredQuantity;
  const getBreakdownFn = store.getCalculationBreakdown;
  
  useEffect(() => {
    if (role) {
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
    }
  }, [roleId, role?.assignedComponentId, calculateFn, getBreakdownFn, role]);
  
  const calculateRequiredQuantity = (role, roleId?: string) => {
    if (!role.assignedComponentId) return null;
    
    try {
      const currentRoleId = roleId || role.id;
      
      if (typeof calculateFn === 'function') {
        const quantity = calculateFn(currentRoleId, role.assignedComponentId);
        const steps = getBreakdownFn(currentRoleId);
        
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
  
  const hasDiscrepancy = calculatedQuantity !== null && 
                         displayedQuantity !== null && 
                         calculatedQuantity !== displayedQuantity;
  
  return (
    <>
       <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            {children}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-md p-4 shadow-lg bg-background border rounded-md">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">
                 Calculation for {roleName} {clusterName ? `(${clusterName})` : ''}
              </h4>
              {isLoading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                   Loading breakdown...
                </div>
              ) : (
                 <>
                  {errorMessage && (
                    <Alert variant="destructive" className="mb-2">
                      <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  {hasDiscrepancy && (
                    <Alert variant="warning" className="mb-2">
                      <AlertDescription className="text-xs">
                        <strong>Notice:</strong> Displayed quantity ({displayedQuantity ?? 'N/A'}) differs from calculated ({calculatedQuantity ?? 'N/A'}). Breakdown reflects calculation.
                      </AlertDescription>
                    </Alert>
                  )}

                  {breakdownSteps && breakdownSteps.length > 0 ? (
                     <Card className="p-3 bg-slate-50 max-h-[300px] overflow-y-auto">
                       <ol className="list-decimal list-inside space-y-1.5">
                         {breakdownSteps.map((step, index) => (
                           <li key={index} className="text-xs">
                             {step}
                           </li>
                         ))}
                       </ol>
                     </Card>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No detailed calculation available. {!role?.assignedComponentId && "Assign a component."}
                    </p>
                  )}
                 </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};
