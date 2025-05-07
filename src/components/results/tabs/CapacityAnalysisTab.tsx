
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
  
  // Calculate potential additional capacity
  const additionalCapacity = useMemo(() => {
    if (!activeDesign || !resourceMetrics) return null;
    
    // Get base values from requirements
    const physicalConstraints = activeDesign.requirements.physicalConstraints;
    const powerPerRackWatts = physicalConstraints?.powerPerRackWatts || 5000;
    const totalRackQuantity = resourceMetrics.totalRackQuantity || 1;
    
    // Calculate remaining power capacity
    const totalAvailablePower = powerPerRackWatts * totalRackQuantity;
    const remainingPower = Math.max(0, totalAvailablePower - (resourceMetrics.totalPower || 0));
    
    // Calculate remaining rack space
    const rackUnitsPerRack = physicalConstraints?.rackUnitsPerRack || 42;
    const totalAvailableRU = rackUnitsPerRack * totalRackQuantity;
    const remainingRU = Math.max(0, totalAvailableRU - (resourceMetrics.totalRackUnits || 0));
    
    // Find average compute node specs to use for calculations
    const computeNodes = (activeDesign.components || []).filter(c => c.role === 'computeNode');
    
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
    const avgComputeNodeRU = totalRU / computeNodes.length;
    const avgComputeNodeCores = totalCores / computeNodes.length;
    const avgComputeNodeMemoryGb = totalMemoryGb / computeNodes.length;
    
    // Calculate additional nodes possible based on power and space constraints
    const nodesByPower = Math.floor(remainingPower / avgComputeNodePower);
    const nodesBySpace = Math.floor(remainingRU / avgComputeNodeRU);
    
    // The limiting factor determines how many nodes we can add
    const possibleAdditionalNodes = Math.min(nodesByPower, nodesBySpace);
    
    // Calculate resulting additional capacity
    const additionalCores = possibleAdditionalNodes * avgComputeNodeCores;
    const additionalMemoryTB = (possibleAdditionalNodes * avgComputeNodeMemoryGb) / 1024;
    
    // Overcommit ratio from requirements
    const computeRequirements = activeDesign.requirements.computeRequirements;
    const overcommitRatio = computeRequirements?.computeClusters[0]?.overcommitRatio || 8;
    
    // Calculate additional vCPUs with overcommit ratio
    const additionalVCpus = additionalCores * overcommitRatio;
    
    return {
      limitingFactor: nodesByPower < nodesBySpace ? 'Power' : 'Space',
      possibleAdditionalNodes,
      nodesByPower,
      nodesBySpace,
      additionalCores,
      additionalVCpus,
      additionalMemoryTB: parseFloat(additionalMemoryTB.toFixed(2)),
      avgComputeNodePower,
      avgComputeNodeRU,
      remainingPower,
      remainingRU
    };
  }, [activeDesign, resourceMetrics]);

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
          storageNetworkUtilization={(resourceUtilization as any)?.storageNetworkUtilization}
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
                  <div className="text-sm font-medium text-muted-foreground">Remaining Power Capacity</div>
                  <div className="text-lg">{additionalCapacity.remainingPower.toLocaleString()} W</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Remaining Rack Units</div>
                  <div className="text-lg">{additionalCapacity.remainingRU} RU</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Potential Additional Cores</div>
                  <div className="text-lg">{additionalCapacity.additionalCores}</div>
                </div>
                
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
                  <div className="text-sm">{additionalCapacity.avgComputeNodePower.toFixed(1)} W, {additionalCapacity.avgComputeNodeRU.toFixed(1)} RU per node</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
