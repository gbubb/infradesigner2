import { ComponentType } from '@/types/infrastructure/component-types';

// Component type color mapping with support for server roles
export const getDeviceColor = (type: string, component?: any): string => {
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

// Helper to calculate RU position from drop coordinates
export const calculateDropRUPosition = (
  clientOffset: { y: number },
  rackProfileId: string,
  rackHeight: number
): number => {
  // Get the rack DOM element
  const rackElement = document.getElementById(`rack-${rackProfileId}`);
  if (!rackElement) return 1;
  
  // Get rack rect
  const rackRect = rackElement.getBoundingClientRect();
  
  // Calculate y position within rack
  const rackY = clientOffset.y - rackRect.top;
  
  // Convert to RU position (bottom to top)
  const ruPosition = rackHeight - Math.floor((rackY / rackRect.height) * rackHeight);
  
  // Ensure value is in bounds
  return Math.max(1, Math.min(ruPosition, rackHeight));
};
