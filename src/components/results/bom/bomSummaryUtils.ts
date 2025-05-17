
import { InfrastructureComponent, ComponentType, componentTypeToCategory } from '@/types/infrastructure';

type DiskLineItem = {
  disk: InfrastructureComponent;
  summarizedQuantity: number;
  clusterName: string;
  clusterId: string;
  configKey: string;
  totalDiskCost: number;
};

/**
 * Groups components by category and summarizes storage/disk items.
 */
export function summarizeComponentsAndDisks(
  components: InfrastructureComponent[],
) {
  const diskLineItems: Record<string, DiskLineItem> = {};

  const groupedByTemplate: Record<string, InfrastructureComponent & { summarizedQuantity: number }> = {};

  function getBomGroupKey(component: InfrastructureComponent): string {
    return component.templateId || `${component.manufacturer}-${component.model}-${component.type}-${component.role || ''}`;
  }
  function getStorageNodeGroupKey(component: InfrastructureComponent): string {
    if (component.role === 'storageNode') {
      const clusterId = (component as any).clusterInfo?.clusterId || 'no-cluster';
      const attachedDisks = ((component as any).attachedDisks || [])
        .map((disk: any) => `${disk.templateId || disk.id || disk.model}-${disk.quantity}`)
        .sort()
        .join('|');
      return `storageNode:${component.templateId}-${clusterId}-[${attachedDisks}]`;
    }
    return getBomGroupKey(component);
  }

  components.forEach(instance => {
    let key = instance.role === 'storageNode' ? getStorageNodeGroupKey(instance) : getBomGroupKey(instance);
    if (!groupedByTemplate[key]) {
      groupedByTemplate[key] = { ...instance, summarizedQuantity: 0 };
    }
    groupedByTemplate[key].summarizedQuantity += instance.quantity || 1;

    // For storage nodes: collect attached disks by cluster/config
    if (instance.role === 'storageNode' && (instance as any).attachedDisks) {
      const clusterInfo = (instance as any).clusterInfo || {};
      const attachedDisks = (instance as any).attachedDisks || [];
      attachedDisks.forEach((disk: any) => {
        if (!disk) return;
        const diskKey =
          'disk-' +
          (disk.templateId || disk.id || disk.model) +
          '-' +
          (disk.capacityTB || '') +
          '-' +
          (clusterInfo.clusterId || '');
        if (!diskLineItems[diskKey]) {
          diskLineItems[diskKey] = {
            disk,
            summarizedQuantity: 0,
            clusterName: clusterInfo.clusterName || clusterInfo.clusterId || '-',
            clusterId: clusterInfo.clusterId || '-',
            configKey: key,
            totalDiskCost: 0,
          };
        }
        diskLineItems[diskKey].summarizedQuantity += (disk.quantity || 1) * (instance.quantity || 1);
        diskLineItems[diskKey].totalDiskCost += (disk.cost || 0) * (disk.quantity || 1) * (instance.quantity || 1);
      });
    }
  });

  // Assign to category
  const result: Record<string, (InfrastructureComponent & { summarizedQuantity: number })[]> = {};
  Object.values(groupedByTemplate).forEach(summarizedComponent => {
    const categoryName = summarizedComponent.type
      ? componentTypeToCategory[summarizedComponent.type as ComponentType]
      : 'Other';
    if (!result[categoryName]) result[categoryName] = [];
    result[categoryName].push(summarizedComponent);
  });

  return { summarizedComponentsByCategory: result, diskLineItems };
}
