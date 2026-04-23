
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';

/**
 * Hook for managing connections between devices
 */
export const useConnectionManager = () => {
  // Get components from the store
  const components = useDesignStore(state => state.activeDesign?.components || []);
  
  // Generate connections from components - memoized to prevent unnecessary recalculations
  const detectedConnections = useMemo(() => {
    const newConnections: Array<{
      sourceDeviceId: string;
      sourcePortId: string;
      destinationDeviceId: string;
      destinationPortId: string;
      cableId: string | undefined;
    }> = [];
    
    console.log("Detecting connections from components:", components.length);
    
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
              cableId: sourcePort.cableId
            });
          }
        }
      }
    });
    
    console.log("Detected connections:", newConnections.length);
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
  
  // Get connection details
  const getConnectionDetails = (connectionId: string) => {
    const [sourceId, destId] = connectionId.split('-');
    return getConnection(sourceId, destId);
  };
  
  return {
    connections: detectedConnections,
    getDeviceConnections,
    getConnection,
    getConnectionDetails,
    // These functions are currently disabled for debugging
    addConnection: () => ({ success: false, error: "Function disabled for debugging" }),
    removeConnection: () => ({ success: false, error: "Function disabled for debugging" }),
    connectionCount: detectedConnections.length
  };
};
