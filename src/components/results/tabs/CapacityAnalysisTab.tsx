import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useDesignStore } from '@/store/designStore';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { usePowerCalculations } from '@/hooks/design/usePowerCalculations';
import { ResourceUtilizationChart } from '../PowerDistributionChart';
import { PowerEnergySection } from '../PowerEnergySection';

export const CapacityAnalysisTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const { resourceMetrics, resourceUtilization } = useDesignCalculations();
  const { powerUsage, energyCosts, hasDedicatedNetworkRacks, hasDedicatedStorageNetwork } = usePowerCalculations();
  
  // Calculate potential additional capacity, correcting rack & adding network port constraint
  const additionalCapacity = useMemo(() => {
    if (!activeDesign || !resourceMetrics) return null;
    
    // Get base values from requirements
    const physicalConstraints = activeDesign.requirements.physicalConstraints;
    const powerPerRackWatts = physicalConstraints?.powerPerRackWatts || 5000;
    const rackUnitsPerRack = physicalConstraints?.rackUnitsPerRack || 42;
    const totalRackQuantity = resourceMetrics.totalRackQuantity || 1;
    
    // Calculate remaining power capacity for compute only (exclude network racks)
    const networkRackQuantity = hasDedicatedNetworkRacks ? 
      Math.ceil((resourceMetrics.networkRackUnits || 0) / (rackUnitsPerRack)) : 0;
    const computeStorageRackQuantity = totalRackQuantity - networkRackQuantity;
    
    // Only use compute rack power for calculations
    const computeRackPower = powerPerRackWatts * computeStorageRackQuantity;
    const networkPower = resourceMetrics.networkPower || 0;
    const computeAndStoragePower = (resourceMetrics.totalPower || 0) - networkPower;
    const remainingPower = Math.max(0, computeRackPower - computeAndStoragePower);
    
    // Calculate remaining rack space (only in compute racks)
    const totalComputeRackRU = rackUnitsPerRack * computeStorageRackQuantity;
    const computeAndStorageRU = (resourceMetrics.totalRackUnits || 0) - (resourceMetrics.networkRackUnits || 0);
    const remainingRU = Math.max(0, totalComputeRackRU - computeAndStorageRU);
    
    // Find average compute node specs to use for calculations (including hyper-converged)
    const computeNodes = (activeDesign.components || []).filter(c => 
      c.role === 'computeNode' || c.role === 'gpuNode' || c.role === 'hyperConvergedNode'
    );
    
    if (computeNodes.length === 0) return null;
    
    // Calculate average compute node specs
    let totalPower = 0;
    let totalRU = 0;
    let totalCores = 0;
    let totalMemoryGb = 0;
    
    computeNodes.forEach(node => {
      totalPower += node.powerRequired || 0;
      totalRU += node.ruSize || 1;
      totalCores += node.totalCores || node.cores || 0;
      totalMemoryGb += node.memoryCapacity || node.memoryGB || 0;
    });
    
    const avgComputeNodePower = totalPower / computeNodes.length;
    const avgComputeNodeRU = Math.ceil(totalRU / computeNodes.length); // Use whole number for RU
    const avgComputeNodeCores = totalCores / computeNodes.length;
    const avgComputeNodeMemoryGb = totalMemoryGb / computeNodes.length;
    
    // Calculate additional nodes possible based on power and space constraints
    const nodesByPower = avgComputeNodePower > 0 ? Math.floor(remainingPower / avgComputeNodePower) : 0;
    const nodesBySpace = avgComputeNodeRU > 0 ? Math.floor(remainingRU / avgComputeNodeRU) : 0;
    
    // -------- NEW: Add network port constraint --------
    // Get available/used leaf network ports (for compute nodes)
    const leafPortsAvailable = resourceMetrics.leafPortsAvailable || 0;
    const leafPortsUsed = resourceMetrics.leafPortsUsed || 0;
    // Approximate: average number of leaf network ports per compute node
    let avgLeafPortsPerComputeNode = 1;
    if (leafPortsUsed > 0 && computeNodes.length > 0)
      avgLeafPortsPerComputeNode = Math.max(1, Math.round(leafPortsUsed / computeNodes.length));
    // Compute add'l nodes by network
    const remainingLeafPorts = leafPortsAvailable - leafPortsUsed;
    const nodesByNetwork = avgLeafPortsPerComputeNode > 0 ? Math.floor(remainingLeafPorts / avgLeafPortsPerComputeNode) : 0;
    
    // -------- Update limiting factor --------
    // The constraining/limiting factor
    let limitingFactor = 'Power';
    let possibleAdditionalNodes = nodesByPower;
    if (nodesBySpace < possibleAdditionalNodes) {
      limitingFactor = 'Space';
      possibleAdditionalNodes = nodesBySpace;
    }
    if (nodesByNetwork < possibleAdditionalNodes) {
      limitingFactor = 'Network Port Availability';
      possibleAdditionalNodes = nodesByNetwork;
    }
    
    // Calculate resulting additional capacity
    const additionalMemoryTB = (possibleAdditionalNodes * avgComputeNodeMemoryGb) / 1024;
    
    // Overcommit ratio from requirements
    const computeRequirements = activeDesign.requirements.computeRequirements;
    const overcommitRatio = computeRequirements?.computeClusters[0]?.overcommitRatio || 8;
    
    // Calculate additional vCPUs with overcommit ratio
    const additionalVCpus = Math.floor(avgComputeNodeCores * possibleAdditionalNodes * overcommitRatio);
    
    return {
      limitingFactor,
      possibleAdditionalNodes,
      nodesByPower,
      nodesBySpace,
      nodesByNetwork,
      additionalVCpus,
      additionalMemoryTB: parseFloat(additionalMemoryTB.toFixed(2)),
      avgComputeNodePower,
      avgComputeNodeRU,
      remainingPower,
      remainingRU,
      remainingLeafPorts,
      avgLeafPortsPerComputeNode,
      computeStorageRackQuantity // corrected rack calculation
    };
  }, [activeDesign, resourceMetrics, hasDedicatedNetworkRacks]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Capacity Analysis</h2>
        <p className="text-sm text-muted-foreground">
          Analysis of infrastructure capacity, utilization, and growth potential
        </p>
      </div>
      
      <PowerEnergySection 
        powerUsage={powerUsage}
        energyCosts={energyCosts}
        hasDedicatedNetworkRacks={hasDedicatedNetworkRacks}
      />
      
      <div className="mb-8">
        <ResourceUtilizationChart 
          powerUtilization={resourceUtilization?.powerUtilization}
          spaceUtilization={resourceUtilization?.spaceUtilization}
          leafNetworkUtilization={resourceUtilization?.leafNetworkUtilization}
          mgmtNetworkUtilization={resourceUtilization?.mgmtNetworkUtilization}
          storageNetworkUtilization={resourceUtilization?.storageNetworkUtilization}
          hasDedicatedStorageNetwork={hasDedicatedStorageNetwork}
          hasDedicatedNetworkRacks={hasDedicatedNetworkRacks}
        />
      </div>
      
      {additionalCapacity && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Growth Potential</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Limiting Factor</div>
                  <div className="text-lg">{additionalCapacity.limitingFactor}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Additional Compute Nodes Possible</div>
                  <div className="text-2xl font-bold">{additionalCapacity.possibleAdditionalNodes}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Remaining Power Capacity (Compute/Storage Racks Only)</div>
                  <div className="text-lg">{additionalCapacity.remainingPower.toLocaleString()} W</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Remaining Rack Units (Compute/Storage Racks Only)</div>
                  <div className="text-lg">{additionalCapacity.remainingRU} RU</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Remaining Leaf Network Ports</div>
                  <div className="text-lg">{additionalCapacity.remainingLeafPorts}</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Potential Additional vCPUs</div>
                  <div className="text-lg">{additionalCapacity.additionalVCpus.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Potential Additional Memory</div>
                  <div className="text-lg">{additionalCapacity.additionalMemoryTB.toLocaleString()} TB</div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Based on average node specs:</div>
                  <div className="text-sm">{additionalCapacity.avgComputeNodePower.toFixed(1)} W, {additionalCapacity.avgComputeNodeRU} RU per node</div>
                  <div className="text-sm">{additionalCapacity.avgLeafPortsPerComputeNode} leaf network ports per node</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Number of Compute/Storage Racks</div>
                  <div className="text-lg">{additionalCapacity.computeStorageRackQuantity}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
