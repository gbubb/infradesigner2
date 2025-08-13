import { RackProfile } from '@/types/infrastructure/rack-types';
import { InfrastructureComponent } from '@/types/infrastructure';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';
import { PlacementReportItem } from '@/types/placement-types';
import { StoreState } from '@/store/types';
import { ComponentWithPlacement } from '@/types/service-types';

interface StorageClusterPlacementParams {
  clusterComponents: (InfrastructureComponent | ComponentWithPlacement)[];
  allowedAZs: string[];
  computeRacks: RackProfile[];
  state: StoreState;
  typeCounters: Record<string, number>;
}

export function placeStorageCluster({
  clusterComponents,
  allowedAZs,
  computeRacks,
  state,
  typeCounters,
}: StorageClusterPlacementParams): { placementReports: PlacementReportItem[] } {
  const placementReports: PlacementReportItem[] = [];
  
  // Filter racks by allowed AZs
  const availableRacks = computeRacks.filter(rack => 
    rack.availabilityZoneId && allowedAZs.includes(rack.availabilityZoneId)
  );
  
  if (availableRacks.length === 0) {
    clusterComponents.forEach(component => {
      placementReports.push({
        deviceName: component.name,
        instanceName: `storage-node-${typeCounters['storage-node']++}`,
        status: "failed",
        reason: "No racks available in allowed AZs"
      });
    });
    return { placementReports };
  }
  
  // Calculate ideal distribution
  const nodesPerRack = Math.floor(clusterComponents.length / availableRacks.length);
  const remainingNodes = clusterComponents.length % availableRacks.length;
  
  // Create distribution plan
  const rackDistribution: Map<string, number> = new Map();
  availableRacks.forEach((rack, index) => {
    // Distribute evenly, with extra nodes going to first racks
    const nodeCount = nodesPerRack + (index < remainingNodes ? 1 : 0);
    rackDistribution.set(rack.id, nodeCount);
  });
  
  // Sort racks by current storage node count (ascending) to fill emptier racks first
  const sortedRacks = [...availableRacks].sort((a, b) => {
    const aCount = a.devices.filter(d => {
      const component = state.componentTemplates.find((c: InfrastructureComponent) => c.id === d.deviceId);
      return component?.category === 'Storage';
    }).length;
    const bCount = b.devices.filter(d => {
      const component = state.componentTemplates.find((c: InfrastructureComponent) => c.id === d.deviceId);
      return component?.category === 'Storage';
    }).length;
    return aCount - bCount;
  });
  
  // Place nodes according to distribution plan
  let componentIndex = 0;
  for (const rack of sortedRacks) {
    const targetCount = rackDistribution.get(rack.id) || 0;
    
    for (let i = 0; i < targetCount && componentIndex < clusterComponents.length; i++) {
      const component = clusterComponents[componentIndex];
      const ruSize = component.ruSize || 1;
      
      const placement = tryPlaceDeviceInRacksWithConstraints({
        racks: [rack],
        device: component,
        ruSize,
        activeDesignState: state
      });
      
      const instanceName = `storage-node-${typeCounters['storage-node']++}`;
      
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
  
  return { placementReports };
}