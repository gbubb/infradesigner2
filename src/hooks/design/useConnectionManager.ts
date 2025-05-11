import { useState, useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';

/**
 * Simplified version of the hook for managing connections between devices
 * with more functionality added progressively
 */
export const useConnectionManager = () => {
  // Get components from the store
  const components = useDesignStore(state => state.activeDesign?.components || []);
  
  // Keep a simple connections state
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
    
    // Detection logic
    components.forEach(sourceDevice => {
      if (!sourceDevice.ports) return;
      
      for (const sourcePort of sourceDevice.ports) {
        if (sourcePort.connectedToDeviceId && sourcePort.connectedToPortId) {
          // Check if we should add this connection (avoid duplicates)
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
  
  // Get connections for a specific device
  const getDeviceConnections = (deviceId: string) => {
    return detectedConnections.filter(conn => 
      conn.sourceDeviceId === deviceId || conn.destinationDeviceId === deviceId
    );
  };
  
  // Get specific connection between devices
  const getConnection = (deviceId1: string, deviceId2: string) => {
    return detectedConnections.find(conn => 
      (conn.sourceDeviceId === deviceId1 && conn.destinationDeviceId === deviceId2) || 
      (conn.sourceDeviceId === deviceId2 && conn.destinationDeviceId === deviceId1)
    );
  };
  
  return {
    connections: detectedConnections,
    // We'll gradually add back these functions as we test for stability
    addConnection: () => ({ success: false, error: "Function disabled for debugging" }),
    removeConnection: () => ({ success: false, error: "Function disabled for debugging" }),
    getDeviceConnections,
    getConnection
  };
};
