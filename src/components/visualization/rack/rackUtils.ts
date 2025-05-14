
import { ComponentType } from '@/types/infrastructure/component-types';

// Component type color mapping
export const getDeviceColor = (type: string): string => {
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
