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
      if (role.clusterInfo?.clusterId) {
        const clusterId = role.clusterInfo.clusterId;
        const storageCluster = store.requirements.storageRequirements.storageClusters.find(c => c.id === clusterId);
        
        if (storageCluster) {
          steps.push(`Storage Cluster: ${storageCluster.name}`);
          steps.push(`Required Usable Capacity: ${storageCluster.totalCapacityTB.toLocaleString()} TiB`);
          steps.push(`Storage Pool Type: ${storageCluster.poolType}`);
          steps.push(`Maximum Fill Factor: ${storageCluster.maxFillFactor}%`);
          steps.push(`Availability Zone Quantity: ${storageCluster.availabilityZoneQuantity}`);
          
          // Show component and disk details if available
          if (component) {
            const roleDiskConfigs = store.selectedDisksByRole[roleId] || [];
            
            if (roleDiskConfigs.length > 0) {
              let totalRawCapacityTB = 0;
              
              steps.push(`Server Model: ${component.manufacturer} ${component.model} with attached disks`);
              
              // List all disks and calculate total raw capacity
              steps.push(`Attached Disks:`);
              roleDiskConfigs.forEach(diskConfig => {
                const disk = store.componentTemplates.find(c => c.id === diskConfig.diskId);
                if (disk && disk.type === 'Disk' && 'capacityTB' in disk) {
                  const diskCapacityTB = disk.capacityTB * diskConfig.quantity;
                  totalRawCapacityTB += diskCapacityTB;
                  steps.push(`- ${disk.name}: ${disk.capacityTB} TB × ${diskConfig.quantity} = ${diskCapacityTB} TB`);
                }
              });
              
              steps.push(`Raw Capacity per Node: ${totalRawCapacityTB.toFixed(2)} TB`);
              
              // Calculate usable capacity based on pool type
              const TB_TO_TIB_FACTOR = 0.909495; // Convert TB to TiB
              const poolEfficiencyFactors: Record<string, number> = {
                '3 Replica': 0.33333,
                '2 Replica': 0.5,
                'Erasure Coding 4+2': 0.66666,
                'Erasure Coding 8+3': 0.72727,
                'Erasure Coding 8+4': 0.66666,
                'Erasure Coding 10+4': 0.71428
              };
              
              const poolType = storageCluster.poolType || '3 Replica';
              const poolEfficiencyFactor = poolEfficiencyFactors[poolType] || (1/3);
              const fillFactorAdjustment = storageCluster.maxFillFactor / 100;
              
              steps.push(`Pool Efficiency Factor: ${poolEfficiencyFactor.toFixed(4)} (based on ${poolType})`);
              steps.push(`Fill Factor Adjustment: ${fillFactorAdjustment.toFixed(2)} (${storageCluster.maxFillFactor}% of total capacity)`);
              
              const rawCapacityTiB = totalRawCapacityTB * TB_TO_TIB_FACTOR;
              const effectiveCapacityPerNodeTiB = rawCapacityTiB * poolEfficiencyFactor * fillFactorAdjustment;
              
              steps.push(`Effective Capacity per Node: ${rawCapacityTiB.toFixed(2)} TiB × ${poolEfficiencyFactor.toFixed(4)} × ${fillFactorAdjustment.toFixed(2)} = ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB`);
              
              const requiredNodeCount = Math.ceil(storageCluster.totalCapacityTB / effectiveCapacityPerNodeTiB);
              steps.push(`Minimum Nodes Needed: ${storageCluster.totalCapacityTB.toFixed(2)} TiB ÷ ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB = ${requiredNodeCount} nodes`);
              
              // Calculate final node count based on AZ requirements
              const minNodesForAZ = storageCluster.availabilityZoneQuantity;
              const finalNodeCount = Math.max(requiredNodeCount, minNodesForAZ);
              
              if (finalNodeCount > requiredNodeCount) {
                steps.push(`Final Node Count: ${finalNodeCount} (increased from ${requiredNodeCount} to ensure minimum of ${minNodesForAZ} nodes for AZ distribution)`);
              } else {
                steps.push(`Final Node Count: ${finalNodeCount} nodes`);
              }
              
              // Calculate actual capacity
              const actualUsableCapacity = effectiveCapacityPerNodeTiB * finalNodeCount;
              steps.push(`Total Usable Capacity: ${finalNodeCount} nodes × ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB = ${actualUsableCapacity.toFixed(2)} TiB`);
              
              if (actualUsableCapacity > storageCluster.totalCapacityTB) {
                const excessCapacity = actualUsableCapacity - storageCluster.totalCapacityTB;
                steps.push(`This provides ${excessCapacity.toFixed(2)} TiB of excess capacity above the ${storageCluster.totalCapacityTB.toFixed(2)} TiB requirement.`);
              }
              
              // Save the calculated quantity for comparison
              if (calculatedQty === undefined) {
                setCalculatedQuantity(finalNodeCount);
              }
            } else {
              steps.push(`No disk configuration found - using default count of ${storageCluster.availabilityZoneQuantity} nodes`);
              steps.push(`To perform a more accurate calculation, please add disks to this storage node.`);
            }
          }
        }
      } else {
        steps.push(`Storage nodes are sized based on capacity requirements and redundancy configuration.`);
        steps.push(`The calculation takes into account the storage pool type, efficiency factor, and availability zone distribution.`);
      }
    } else if (roleType.includes('Switch')) {
      // Network switch calculation
      const networkReqs = store.requirements.networkRequirements;
      const physicalConstraints = store.requirements.physicalConstraints;
      
      steps.push(`Network Topology: ${networkReqs.networkTopology || 'Spine-Leaf'}`);
      steps.push(`Total Availability Zones: ${physicalConstraints.totalAvailabilityZones || 1}`);
      
      if (roleType === 'leafSwitch') {
        const leafSwitchesPerAZ = networkReqs.leafSwitchesPerAZ || 2;
        const totalAZs = physicalConstraints.totalAvailabilityZones || 1;
        
        steps.push(`Leaf Switches Per AZ: ${leafSwitchesPerAZ}`);
        steps.push(`Total Leaf Switches: ${leafSwitchesPerAZ} switches × ${totalAZs} AZs = ${leafSwitchesPerAZ * totalAZs} switches`);
      } else if (roleType === 'managementSwitch') {
        const mgmtSwitchesPerAZ = (networkReqs.managementNetwork === 'Dual Home') ? 2 : 1;
        const totalAZs = physicalConstraints.totalAvailabilityZones || 1;
        
        steps.push(`Management Network: ${networkReqs.managementNetwork}`);
        steps.push(`Management Switches Per AZ: ${mgmtSwitchesPerAZ}`);
        
        let totalMgmtSwitches = mgmtSwitchesPerAZ * totalAZs;
        
        // Account for IPMI switches if needed
        if (networkReqs.ipmiNetwork === 'Dedicated IPMI switch') {
          steps.push(`IPMI Network: Dedicated IPMI switches (requires 1 additional switch per AZ)`);
          totalMgmtSwitches += totalAZs;
        }
        
        steps.push(`Total Management Switches: ${totalMgmtSwitches}`);
      } else if (roleType === 'spineSwitch') {
        steps.push(`Spine switches connect all leaf switches in a full mesh topology.`);
        steps.push(`For redundancy, a minimum of 2 spine switches are required.`);
      }
    } 
    
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};