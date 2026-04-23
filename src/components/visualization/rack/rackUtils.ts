import { ComponentType, InfrastructureComponent } from '@/types/infrastructure/component-types';

// Component type color mapping with support for server roles
export const getDeviceColor = (type: string, component?: InfrastructureComponent): string => {
  // For servers, differentiate by role if component information is available
  if (type === ComponentType.Server && component?.serverRole) {
    switch (component.serverRole) {
      case 'compute':
        return 'bg-blue-200 border-blue-400 text-blue-800';
      case 'controller':
        return 'bg-teal-200 border-teal-400 text-teal-800';
      case 'infrastructure':
        return 'bg-indigo-200 border-indigo-400 text-indigo-800';
      case 'storage':
        return 'bg-orange-200 border-orange-400 text-orange-800';
      case 'gpu':
        return 'bg-purple-200 border-purple-400 text-purple-800';
      default:
        return 'bg-blue-200 border-blue-400 text-blue-800'; // Default to compute color
    }
  }
  
  // Original type-based mapping for non-servers or when component info is not available
  switch (type) {
    case ComponentType.Server:
      return 'bg-blue-200 border-blue-400 text-blue-800';
    case ComponentType.Switch:
      return 'bg-green-200 border-green-400 text-green-800';
    case ComponentType.Router:
      return 'bg-yellow-200 border-yellow-400 text-yellow-800';
    case ComponentType.Firewall:
      return 'bg-red-200 border-red-400 text-red-800';
    case ComponentType.FiberPatchPanel:
    case ComponentType.CopperPatchPanel:
      return 'bg-cyan-200 border-cyan-400 text-cyan-800';
    default:
      return 'bg-gray-200 border-gray-400 text-gray-800';
  }
};

/**
 * Compute an RU position from a dnd-kit drop event.
 *
 * RU indexing is bottom-up: RU 1 is at the rack's bottom edge, RU N at the top.
 * dnd-kit gives us the dragged element's translated top (viewport coords) and
 * the droppable's bounding rect, so we compute the drop's vertical offset from
 * the rack top and invert to an RU number.
 */
export const calculateDropRUPositionFromRect = ({
  dropY,
  rackTop,
  rackHeight,
  uHeight,
}: {
  dropY: number;
  rackTop: number;
  rackHeight: number;
  uHeight: number;
}): number => {
  if (rackHeight <= 0 || uHeight <= 0) return 1;
  const offsetFromTop = dropY - rackTop;
  const ruPosition = uHeight - Math.floor((offsetFromTop / rackHeight) * uHeight);
  return Math.max(1, Math.min(ruPosition, uHeight));
};
