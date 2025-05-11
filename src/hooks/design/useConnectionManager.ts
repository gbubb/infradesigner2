import { useState, useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { StoreState } from '@/store/types';

/**
 * Simplified version of the hook for managing connections between devices
 */
export const useConnectionManager = () => {
  // Use a simple selector to avoid shallow comparison issues
  const components = useDesignStore((state: StoreState) => state.activeDesign?.components || []);
  
  // Just keep a simple connections state to avoid complex state updates
  const [connections, setConnections] = useState<Array<{
    sourceDeviceId: string;
    sourcePortId: string;
    destinationDeviceId: string;
    destinationPortId: string;
    cableId: string;
  }>>([]);
  
  // Generate connections from components - memoized to prevent unnecessary recalculations
  const detectedConnections = useMemo(() => {
    const newConnections: Array<{
      sourceDeviceId: string;
      sourcePortId: string;
      destinationDeviceId: string;
      destinationPortId: string;
      cableId: string;
    }> = [];
    
    // Simple detection logic without complex state updates
    components.forEach(sourceDevice => {
      if (!sourceDevice.ports) return;
      
      for (const sourcePort of sourceDevice.ports) {
        if (sourcePort.connectedToDeviceId && sourcePort.connectedToPortId) {
          if (sourceDevice.id < sourcePort.connectedToDeviceId) {
            newConnections.push({
              sourceDeviceId: sourceDevice.id,
              sourcePortId: sourcePort.id,
              destinationDeviceId: sourcePort.connectedToDeviceId,
              destinationPortId: sourcePort.connectedToPortId,
              cableId: sourcePort.cableId || ''
            });
          }
        }
      }
    });
    return newConnections;
  }, [components]);
  
  return {
    connections: detectedConnections,
    // Provide empty function implementations to prevent errors
    addConnection: () => ({ success: false, error: "Function disabled for debugging" }),
    removeConnection: () => ({ success: false, error: "Function disabled for debugging" }),
    getDeviceConnections: () => [],
    getConnection: () => undefined
  };
};
