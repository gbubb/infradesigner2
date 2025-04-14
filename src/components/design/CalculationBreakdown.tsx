import React, { useState, useEffect, useCallback } from 'react';
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
  const [breakdownData, setBreakdownData] = useState<{
    steps: string[];
    calculatedQuantity: number | null;
    displayedQuantity: number | null;
    errorMessage: string | null;
  }>({
    steps: [],
    calculatedQuantity: null,
    displayedQuantity: null,
    errorMessage: null
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const store = useDesignStore();
  
  const role = store.componentRoles.find(r => r.id === roleId);
  const clusterName = role?.clusterInfo?.clusterName;
  const roleType = role?.role || '';
  
  // Calculate title text outside of the useEffect to prevent loops
  const titleText = clusterName 
    ? `Calculation Breakdown for ${roleName} (${clusterName})` 
    : `Calculation Breakdown for ${roleName}`;
  
  const calculateRequiredQuantity = (role) => {
    if (!role.assignedComponentId) return null;
    
    try {
      const currentRoleId = role.id;
      
      // Only calculate once and store all needed data
      if (typeof store.calculateRequiredQuantity === 'function') {
        const quantity = store.calculateRequiredQuantity(currentRoleId, role.assignedComponentId);
        const steps = store.getCalculationBreakdown(currentRoleId);
        
        // Return both pieces of data together
        return { 
          requiredQuantity: quantity, 
          calculationSteps: steps || [] 
        };
      }
      
      return manuallyCalculateQuantity(role);
    } catch (error) {
      console.error("Error in direct calculation:", error);
      return null;
    }
  };
  
  const manuallyCalculateQuantity = (role) => {
    return {
      requiredQuantity: role.adjustedRequiredCount || role.requiredCount,
      calculationSteps: []
    };
  };
  
  const performCalculation = useCallback(() => {
    if (!role) return;
    
    setIsLoading(true);
    const displayedQuantity = role.adjustedRequiredCount || role.requiredCount;
    
    try {
      if (role.assignedComponentId) {
        // Get calculation result once
        const result = calculateRequiredQuantity(role);
        
        // Use the result or fall back to detailed breakdown
        if (result && result.calculationSteps.length > 0) {
          setBreakdownData({
            steps: result.calculationSteps,
            calculatedQuantity: result.requiredQuantity,
            displayedQuantity,
            errorMessage: null
          });
        } else {
          // Only generate detailed breakdown if we don't have calculation results
          const { steps: detailedSteps, expectedQuantity } = generateDetailedBreakdown(role);
          setBreakdownData({
            steps: detailedSteps,
            calculatedQuantity: expectedQuantity,
            displayedQuantity,
            errorMessage: null
          });
        }
      } else {
        const { steps: detailedSteps, expectedQuantity } = generateDetailedBreakdown(role);
        setBreakdownData({
          steps: detailedSteps,
          calculatedQuantity: expectedQuantity,
          displayedQuantity,
          errorMessage: null
        });
      }
    } catch (error) {
      console.error(`Error calculating quantity for ${roleType} (${roleId}):`, error);
      setBreakdownData({
        steps: [],
        calculatedQuantity: null,
        displayedQuantity,
        errorMessage: `Error performing calculation: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [role, roleId, roleType, store]);
  
  useEffect(() => {
    if (isOpen && role) {
      performCalculation();
    }
  }, [isOpen, role, performCalculation]);
  
  const generateDetailedBreakdown = (role) => {
    const steps: string[] = [];
    let expectedQuantity = role.adjustedRequiredCount || role.requiredCount;
    
    steps.push(`Role: ${roleName} (${roleType})`);
    steps.push(`Required quantity: ${role.adjustedRequiredCount || role.requiredCount}`);
    
    const component = role.assignedComponentId ? 
      store.componentTemplates.find(c => c.id === role.assignedComponentId) : 
      undefined;
    
    if (!component) {
      steps.push("No component assigned to this role.");
      return { steps, expectedQuantity };
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
          
          if (coresPerServer > 0) {
            const totalPhysicalCoresNeeded = Math.ceil(cluster.totalVCPUs / cluster.overcommitRatio);
            steps.push(`CPU calculation: ${cluster.totalVCPUs.toLocaleString()} vCPUs ÷ ${cluster.overcommitRatio} = ${totalPhysicalCoresNeeded.toLocaleString()} physical cores needed`);
            
            const nodesNeededForCPU = Math.ceil(totalPhysicalCoresNeeded / coresPerServer);
            steps.push(`Nodes needed for CPU: ${totalPhysicalCoresNeeded.toLocaleString()} cores ÷ ${coresPerServer} cores per server = ${nodesNeededForCPU} nodes`);
            
            if (memoryGBPerServer > 0) {
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
              steps.push(`Minimum nodes per AZ: ${totalNodesNeeded} ÷ ${totalAvailabilityZones} = ${nodesPerAZ} nodes per AZ (rounded up)`);
              
              let baseNodeCount = nodesPerAZ * totalAvailabilityZones;
              
              if (baseNodeCount > totalNodesNeeded) {
                steps.push(`To ensure even distribution, adjusting to ${nodesPerAZ} nodes per AZ × ${totalAvailabilityZones} AZs = ${baseNodeCount} total nodes`);
              } else {
                steps.push(`Base node count: ${nodesPerAZ} × ${totalAvailabilityZones} = ${baseNodeCount} nodes`);
              }
              
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
              
              expectedQuantity = baseNodeCount + additionalNodesCount;
              steps.push(`Final node count: ${baseNodeCount} base nodes + ${additionalNodesCount} redundancy nodes = ${expectedQuantity} total nodes`);
            }
          }
        }
      } else {
        steps.push(`Compute nodes are sized based on vCPU and memory requirements.`);
        steps.push(`The calculation takes into account the CPU overcommit ratio and availability zone distribution.`);
      }
    } else if (roleType === 'storageNode') {
      if (role.clusterInfo?.clusterId) {
        steps.push(`Storage nodes calculation depends on disk configurations and storage cluster requirements.`);
        steps.push(`For detailed storage calculations, please refer to the store logs or contact support.`);
      }
    } else if (roleType.includes('Switch')) {
      steps.push(`Network switches are calculated based on the network topology, switch role, and availability zones.`);
    }
    
    return { steps, expectedQuantity };
  };
  
  const handleOpenDialog = () => {
    console.log("Opening calculation dialog for:", roleId);
    setIsOpen(true);
  };
  
  const hasDiscrepancy = breakdownData.calculatedQuantity !== null && 
                         breakdownData.displayedQuantity !== null && 
                         breakdownData.calculatedQuantity !== breakdownData.displayedQuantity;
  
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {children || (
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
              {breakdownData.errorMessage && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    {breakdownData.errorMessage}
                  </AlertDescription>
                </Alert>
              )}
              
              {hasDiscrepancy && (
                <Alert variant="warning" className="mb-4">
                  <AlertDescription>
                    <strong>Notice:</strong> The displayed required quantity ({breakdownData.displayedQuantity}) differs from what our 
                    detailed calculation would produce ({breakdownData.calculatedQuantity}). This may be due to a manual override 
                    or an initial value set during requirement creation.
                  </AlertDescription>
                </Alert>
              )}
              
              {breakdownData.steps && breakdownData.steps.length > 0 ? (
                <Card className="p-4 bg-slate-50">
                  <ol className="list-decimal list-inside space-y-2">
                    {breakdownData.steps.map((step, index) => (
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
