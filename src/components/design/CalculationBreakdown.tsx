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
  const [isLoading, setIsLoading] = useState(false);
  
  // Get store values directly
  const { 
    getCalculationBreakdown,
    calculateRequiredQuantity, 
    componentRoles,
    componentTemplates,
    requirements 
  } = useDesignStore();
  
  // Find the role by ID to get its information
  const role = componentRoles.find(r => r.id === roleId);
  const clusterName = role?.clusterInfo?.clusterName;
  const roleType = role?.role || '';
  
  // Update breakdown steps whenever the dialog opens
  useEffect(() => {
    if (isOpen && role) {
      setIsLoading(true);
      console.log(`Fetching calculation for role: ${roleType} (${roleId})`);
      
      // If the role has an assigned component, make sure we have a fresh calculation
      if (role.assignedComponentId) {
        try {
          // Force a calculation first
          console.log(`Calculating quantity for ${roleId} with component ${role.assignedComponentId}`);
          const requiredQuantity = calculateRequiredQuantity(roleId, role.assignedComponentId);
          console.log(`Calculated quantity: ${requiredQuantity}`);
          
          // Add a small delay to ensure the calculation has had time to update state
          setTimeout(() => {
            // Now get the breakdown steps
            const steps = getCalculationBreakdown(roleId);
            console.log(`Got ${steps?.length || 0} calculation steps for ${roleId}`);
            
            if (steps && steps.length > 0) {
              setBreakdownSteps(steps);
            } else {
              // If no steps are found, generate detailed steps with numerical examples
              const detailedSteps = generateDetailedBreakdown(role);
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
        // Generate detailed steps with numerical examples
        const detailedSteps = generateDetailedBreakdown(role);
        setBreakdownSteps(detailedSteps);
        setIsLoading(false);
      }
    }
  }, [isOpen, role, roleId, roleType, calculateRequiredQuantity, getCalculationBreakdown, componentTemplates, requirements]);
  
  // Generate a detailed breakdown with numerical examples based on actual requirements
  const generateDetailedBreakdown = (role: any) => {
    const steps: string[] = [];
    
    // Include role basic information
    steps.push(`Role: ${roleName} (${roleType})`);
    steps.push(`Required quantity: ${role.adjustedRequiredCount || role.requiredCount}`);
    
    // Find any matching component for additional info
    const component = role.assignedComponentId ? 
      componentTemplates.find(c => c.id === role.assignedComponentId) : 
      undefined;
    
    // Attempt to reconstruct the calculation based on the role type
    if (roleType === 'computeNode' || roleType === 'gpuNode') {
      if (role.clusterInfo?.clusterId) {
        const clusterId = role.clusterInfo.clusterId;
        const cluster = requirements.computeRequirements.computeClusters.find(c => c.id === clusterId);
        
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
                const totalAvailabilityZones = requirements.physicalConstraints.totalAvailabilityZones || 1;
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
                
                const requiredQuantity = baseNodeCount + additionalNodesCount;
                steps.push(`Final node count: ${baseNodeCount} base nodes + ${additionalNodesCount} redundancy nodes = ${requiredQuantity} total nodes`);
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
        const cluster = requirements.storageRequirements.storageClusters.find(c => c.id === clusterId);
        
        if (cluster) {
          steps.push(`Storage Cluster: ${cluster.name}`);
          steps.push(`Required Usable Capacity: ${cluster.totalCapacityTB.toLocaleString()} TiB`);
          steps.push(`Storage Pool Type: ${cluster.poolType}`);
          steps.push(`Maximum Fill Factor: ${cluster.maxFillFactor}%`);
          steps.push(`Availability Zone Quantity: ${cluster.availabilityZoneQuantity}`);
          
          // If we have a component with disks, calculate storage capacity
          if (component) {
            steps.push(`Storage Node Model: ${component.manufacturer} ${component.model}`);
            
            // Try to find disk configuration
            const roleDisks = role.disks || [];
            if (roleDisks.length > 0) {
              steps.push(`Disk Configuration: ${roleDisks.length} disk types configured`);
              let totalRawCapacity = 0;
              roleDisks.forEach((disk, idx) => {
                const diskComponent = componentTemplates.find(c => c.id === disk.diskId);
                if (diskComponent && 'capacityTB' in diskComponent) {
                  const diskCapacity = diskComponent.capacityTB * disk.quantity;
                  totalRawCapacity += diskCapacity;
                  steps.push(`  Disk ${idx+1}: ${diskComponent.manufacturer} ${diskComponent.model} - ${diskComponent.capacityTB} TB × ${disk.quantity} = ${diskCapacity} TB`);
                }
              });
              steps.push(`Total Raw Capacity per Node: ${totalRawCapacity.toFixed(2)} TB`);
              
              // Calculate usable capacity
              const poolEfficiencyFactor = cluster.poolType === '3 Replica' ? 0.33333 :
                                           cluster.poolType === '2 Replica' ? 0.5 :
                                           cluster.poolType === 'Erasure Coding 4+2' ? 0.66666 :
                                           cluster.poolType === 'Erasure Coding 8+3' ? 0.72727 :
                                           cluster.poolType === 'Erasure Coding 8+4' ? 0.66666 :
                                           cluster.poolType === 'Erasure Coding 10+4' ? 0.71428 : 0.33333;
                                           
              const fillFactorAdjustment = cluster.maxFillFactor / 100;
              
              steps.push(`Pool Efficiency Factor: ${poolEfficiencyFactor.toFixed(2)} (based on ${cluster.poolType} configuration)`);
              steps.push(`Fill Factor Adjustment: ${fillFactorAdjustment.toFixed(2)} (${cluster.maxFillFactor}% of total capacity)`);
              
              const effectiveCapacityPerNodeTiB = totalRawCapacity * 0.909495 * poolEfficiencyFactor * fillFactorAdjustment;
              steps.push(`Effective Capacity per Node: ${totalRawCapacity.toFixed(2)} TB × 0.909495 (TB to TiB) × ${poolEfficiencyFactor.toFixed(2)} × ${fillFactorAdjustment.toFixed(2)} = ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB`);
              
              const requiredNodeCount = Math.ceil(cluster.totalCapacityTB / effectiveCapacityPerNodeTiB);
              steps.push(`Minimum Nodes Needed: ${cluster.totalCapacityTB.toFixed(2)} TiB ÷ ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB = ${requiredNodeCount} nodes`);
              
              const finalNodeCount = Math.max(requiredNodeCount, cluster.availabilityZoneQuantity);
              
              if (finalNodeCount > requiredNodeCount) {
                steps.push(`Final Node Count: ${finalNodeCount} (increased from ${requiredNodeCount} to ensure minimum of ${cluster.availabilityZoneQuantity} nodes for AZ distribution)`);
              } else {
                steps.push(`Final Node Count: ${finalNodeCount} nodes`);
              }
              
              // Add a note about actual capacity
              const actualUsableCapacity = effectiveCapacityPerNodeTiB * finalNodeCount;
              steps.push(`Total Usable Capacity: ${finalNodeCount} nodes × ${effectiveCapacityPerNodeTiB.toFixed(2)} TiB = ${actualUsableCapacity.toFixed(2)} TiB`);
              
              if (actualUsableCapacity > cluster.totalCapacityTB) {
                const excessCapacity = actualUsableCapacity - cluster.totalCapacityTB;
                steps.push(`This provides ${excessCapacity.toFixed(2)} TiB of excess capacity above the ${cluster.totalCapacityTB.toFixed(2)} TiB requirement.`);
              }
            } else {
              steps.push(`No disk configuration found - using default count of ${role.requiredCount} nodes`);
              steps.push(`To perform a more accurate calculation, please add disks to this storage node.`);
            }
          }
        }
      } else {
        steps.push(`Storage node quantity is calculated based on the total required capacity and the capacity provided by each node.`);
        steps.push(`The calculation takes into account the storage pool type efficiency factor and maximum fill percentage.`);
      }
    } else if (roleType === 'controllerNode') {
      steps.push(`Controller nodes requirement is defined in the compute requirements.`);
      steps.push(`The default controller node count is 3 for high availability.`);
      steps.push(`Current setting: ${requirements.computeRequirements.controllerNodeCount || 3} controller nodes`);
    } else if (roleType === 'infrastructureNode') {
      steps.push(`Infrastructure node count is defined in the compute requirements.`);
      steps.push(`Required for monitoring, logging, and management services.`);
      steps.push(`Current setting: ${requirements.computeRequirements.infrastructureNodeCount || 0} infrastructure nodes`);
      steps.push(`Infrastructure cluster required: ${requirements.computeRequirements.infrastructureClusterRequired ? 'Yes' : 'No'}`);
    } else if (roleType === 'managementSwitch') {
      const totalAvailabilityZones = requirements.physicalConstraints.totalAvailabilityZones || 1;
      const mgmtSwitchesPerAZ = requirements.networkRequirements.managementNetwork === 'Dual Home' ? 2 : 1;
      const totalMgmtSwitches = totalAvailabilityZones * mgmtSwitchesPerAZ;
      
      steps.push(`Management switch requirement is calculated based on the network topology.`);
      steps.push(`Management Network Type: ${requirements.networkRequirements.managementNetwork}`);
      steps.push(`Management Switches per AZ: ${mgmtSwitchesPerAZ} (${requirements.networkRequirements.managementNetwork})`);
      steps.push(`Total Availability Zones: ${totalAvailabilityZones}`);
      steps.push(`Total Management Switches: ${mgmtSwitchesPerAZ} switches per AZ × ${totalAvailabilityZones} AZs = ${totalMgmtSwitches} switches`);
      
      // Add IPMI switches if needed
      if (requirements.networkRequirements.ipmiNetwork === 'Dedicated IPMI switch') {
        const ipmiSwitches = totalAvailabilityZones;
        steps.push(`IPMI Network: Dedicated IPMI switches (1 per AZ)`);
        steps.push(`Additional IPMI Switches: ${ipmiSwitches}`);
        steps.push(`Total Management + IPMI Switches: ${totalMgmtSwitches} + ${ipmiSwitches} = ${totalMgmtSwitches + ipmiSwitches}`);
      } else {
        steps.push(`IPMI Network: ${requirements.networkRequirements.ipmiNetwork}`);
        steps.push(`No additional IPMI switches needed`);
      }
    } else if (roleType === 'leafSwitch' || roleType === 'borderLeafSwitch') {
      const totalAvailabilityZones = requirements.physicalConstraints.totalAvailabilityZones || 1;
      const leafSwitchesPerAZ = requirements.networkRequirements.leafSwitchesPerAZ || 2;
      const totalLeafSwitches = totalAvailabilityZones * leafSwitchesPerAZ;
      
      steps.push(`Leaf switch requirement is calculated based on the network topology and number of availability zones.`);
      steps.push(`Network Topology: ${requirements.networkRequirements.networkTopology}`);
      steps.push(`Leaf Switches per AZ: ${leafSwitchesPerAZ}`);
      steps.push(`Total Availability Zones: ${totalAvailabilityZones}`);
      steps.push(`Total Leaf Switches: ${leafSwitchesPerAZ} switches per AZ × ${totalAvailabilityZones} AZs = ${totalLeafSwitches} switches`);
      
      if (roleType === 'borderLeafSwitch') {
        steps.push(`Border Leaf Switches: Fixed at 2 for redundancy`);
      }
    } else if (roleType === 'spineSwitch') {
      steps.push(`Spine switches provide connectivity between leaf switches in a spine-leaf architecture.`);
      steps.push(`Network Topology: ${requirements.networkRequirements.networkTopology}`);
      steps.push(`Spine switches: Fixed at 2 for redundancy`);
    } else if (roleType === 'firewall') {
      steps.push(`Firewall quantity is determined by the physical firewalls requirement.`);
      steps.push(`Physical Firewalls Enabled: ${requirements.networkRequirements.physicalFirewalls ? 'Yes' : 'No'}`);
      steps.push(`Standard configuration uses two firewalls for redundancy.`);
    } else if (!role.assignedComponentId) {
      steps.push(`No component assigned to this role yet.`);
      steps.push(`Please assign a component to see a detailed calculation.`);
    }
    
    return steps;
  };
  
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
  
  // Build the title with cluster name if available
  const titleText = clusterName 
    ? `Calculation Breakdown for ${roleName} (${clusterName})` 
    : `Calculation Breakdown for ${roleName}`;
  
  // Handle opening the dialog
  const handleOpenDialog = () => {
    console.log("Opening calculation dialog for:", roleId);
    setIsOpen(true);
  };
  
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
    </>
  );
};