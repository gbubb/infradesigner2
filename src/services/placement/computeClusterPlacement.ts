import { RackProfile } from '@/types/infrastructure/rack-types';
import { InfrastructureComponent } from '@/types/infrastructure';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';
import { PlacementReportItem } from '@/types/placement-types';

interface ComputeClusterPlacementParams {
  clusterComponents: InfrastructureComponent[];
  allowedAZs: string[];
  computeRacks: RackProfile[];
  state: any;
  typeCounters: Record<string, number>;
}

export function placeComputeCluster({
  clusterComponents,
  allowedAZs,
  computeRacks,
  state,
  typeCounters,
}: ComputeClusterPlacementParams): { placementReports: PlacementReportItem[] } {
  const placementReports: PlacementReportItem[] = [];
  
  // Filter racks by allowed AZs
  const availableRacks = computeRacks.filter(rack => 
    rack.availabilityZoneId && allowedAZs.includes(rack.availabilityZoneId)
  );
  
  if (availableRacks.length === 0) {
    clusterComponents.forEach(component => {
      const typeLabel = component.role?.toLowerCase() || 'compute-node';
      placementReports.push({
        deviceName: component.name,
        instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
        status: "failed",
        reason: "No racks available in allowed AZs"
      });
    });
    return { placementReports };
  }
  
  // Group racks by AZ to ensure even distribution across AZs first
  const racksByAZ = new Map<string, RackProfile[]>();
  availableRacks.forEach(rack => {
    const azId = rack.availabilityZoneId!;
    if (!racksByAZ.has(azId)) {
      racksByAZ.set(azId, []);
    }
    racksByAZ.get(azId)!.push(rack);
  });
  
  // Calculate distribution across AZs
  const azsArray = Array.from(racksByAZ.keys());
  const nodesPerAZ = Math.floor(clusterComponents.length / azsArray.length);
  const extraNodes = clusterComponents.length % azsArray.length;
  
  // Create AZ distribution plan
  const azDistribution = new Map<string, number>();
  azsArray.forEach((az, index) => {
    azDistribution.set(az, nodesPerAZ + (index < extraNodes ? 1 : 0));
  });
  
  // Place nodes by AZ, then evenly within each AZ
  let componentIndex = 0;
  
  for (const [azId, targetCount] of azDistribution) {
    const azRacks = racksByAZ.get(azId)!;
    
    // Calculate distribution within this AZ
    const nodesPerRackInAZ = Math.floor(targetCount / azRacks.length);
    const extraNodesInAZ = targetCount % azRacks.length;
    
    // Sort racks by current compute node count to balance placement
    const sortedAZRacks = [...azRacks].sort((a, b) => {
      const aCount = a.devices.filter(d => {
        // Check both in placed components and templates
        const placedComponent = state.activeDesign?.components?.find((c: any) => c.id === d.deviceId);
        const templateComponent = state.componentTemplates.find((c: any) => c.id === d.deviceId);
        const component = placedComponent || templateComponent;
        return component?.role && ['computeNode', 'gpuNode', 'controllerNode', 'infrastructureNode'].includes(component.role);
      }).length;
      const bCount = b.devices.filter(d => {
        // Check both in placed components and templates
        const placedComponent = state.activeDesign?.components?.find((c: any) => c.id === d.deviceId);
        const templateComponent = state.componentTemplates.find((c: any) => c.id === d.deviceId);
        const component = placedComponent || templateComponent;
        return component?.role && ['computeNode', 'gpuNode', 'controllerNode', 'infrastructureNode'].includes(component.role);
      }).length;
      return aCount - bCount;
    });
    
    // Place nodes in this AZ
    for (let rackIndex = 0; rackIndex < sortedAZRacks.length && componentIndex < clusterComponents.length; rackIndex++) {
      const rack = sortedAZRacks[rackIndex];
      const nodesForThisRack = nodesPerRackInAZ + (rackIndex < extraNodesInAZ ? 1 : 0);
      
      // console.log(`  Placing ${nodesForThisRack} nodes in rack ${rack.id}`);
      
      for (let i = 0; i < nodesForThisRack && componentIndex < clusterComponents.length; i++) {
        const component = clusterComponents[componentIndex];
        const ruHeight = component.ruSize || component.ruHeight || 1;
        const typeLabel = component.role?.toLowerCase() || 'compute-node';
        
        const placement = tryPlaceDeviceInRacksWithConstraints({
          racks: [rack],
          device: component,
          ruHeight,
          activeDesignState: state
        });
        
        const instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
        
        if (placement.success) {
          placementReports.push({
            deviceName: component.name,
            instanceName,
            status: 'placed',
            azId: placement.azId,
            rackId: placement.rackId,
            ruPosition: placement.ruPosition,
            clusterId: component.clusterId || component.clusterInfo?.clusterId
          });
        } else {
          placementReports.push({
            deviceName: component.name,
            instanceName,
            status: "failed",
            reason: placement.reason
          });
        }
        
        componentIndex++;
      }
    }
  }
  
  return { placementReports };
}