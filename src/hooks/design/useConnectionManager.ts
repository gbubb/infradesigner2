
import { useState, useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Port, MediaType, CableMediaType, ConnectorType } from '@/types/infrastructure';
import { toast } from 'sonner';

/**
 * Hook for managing connections between devices in the infrastructure design
 */
export const useConnectionManager = () => {
  const { activeDesign, updateActiveDesign } = useDesignStore(state => ({
    activeDesign: state.activeDesign,
    updateActiveDesign: state.updateActiveDesign
  }));
  
  const [connections, setConnections] = useState<Array<{
    sourceDeviceId: string;
    sourcePortId: string;
    destinationDeviceId: string;
    destinationPortId: string;
    cableId: string;
  }>>([]);
  
  // Initialize connections from the active design
  useEffect(() => {
    if (!activeDesign) return;
    
    const detectedConnections: Array<{
      sourceDeviceId: string;
      sourcePortId: string;
      destinationDeviceId: string;
      destinationPortId: string;
      cableId: string;
    }> = [];
    
    // Scan all devices and ports to find existing connections
    activeDesign.components.forEach(sourceDevice => {
      if (!sourceDevice.ports) return;
      
      for (const sourcePort of sourceDevice.ports) {
        if (sourcePort.connectedToDeviceId && sourcePort.connectedToPortId) {
          // Only add each connection once (avoid duplicates)
          if (sourceDevice.id < sourcePort.connectedToDeviceId) {
            detectedConnections.push({
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
    
    setConnections(detectedConnections);
  }, [activeDesign]);
  
  /**
   * Check if a port connector type is compatible with a cable connector type
   * @param portConnector Port connector type
   * @param cableConnector Cable connector type
   */
  const isConnectorCompatible = (
    portConnector: ConnectorType,
    cableConnector: ConnectorType
  ): boolean => {
    // Simple exact match for now
    return portConnector === cableConnector;
  };
  
  /**
   * Check if a port media type is compatible with a cable media type
   * @param portMedia Port media type
   * @param cableMedia Cable media type
   */
  const isMediaTypeCompatible = (
    portMedia: MediaType,
    cableMedia: CableMediaType
  ): boolean => {
    // Media type compatibility checks
    switch (portMedia) {
      case MediaType.Copper:
        return cableMedia.startsWith('Copper-');
      case MediaType.FiberSM:
        return cableMedia === CableMediaType.FiberSMDuplex;
      case MediaType.FiberMM:
        return cableMedia === CableMediaType.FiberMMDuplex;
      case MediaType.DAC:
        return cableMedia.startsWith('DAC-');
      default:
        return false;
    }
  };
  
  /**
   * Add a connection between two device ports
   */
  const addConnection = (
    sourceDeviceId: string,
    sourcePortId: string,
    destinationDeviceId: string,
    destinationPortId: string,
    cableId: string
  ): { success: boolean; error?: string } => {
    if (!activeDesign) {
      return { success: false, error: "No active design" };
    }
    
    // Find the devices and ports
    const sourceDevice = activeDesign.components.find(c => c.id === sourceDeviceId);
    const destinationDevice = activeDesign.components.find(c => c.id === destinationDeviceId);
    const cable = activeDesign.components.find(c => c.id === cableId);
    
    // Validate the devices exist
    if (!sourceDevice) {
      return { success: false, error: `Source device not found (ID: ${sourceDeviceId})` };
    }
    if (!destinationDevice) {
      return { success: false, error: `Destination device not found (ID: ${destinationDeviceId})` };
    }
    if (!cable) {
      return { success: false, error: `Cable not found (ID: ${cableId})` };
    }
    
    // Validate the ports exist
    if (!sourceDevice.ports) {
      return { success: false, error: "Source device has no ports" };
    }
    if (!destinationDevice.ports) {
      return { success: false, error: "Destination device has no ports" };
    }
    
    const sourcePort = sourceDevice.ports.find(p => p.id === sourcePortId);
    const destinationPort = destinationDevice.ports.find(p => p.id === destinationPortId);
    
    if (!sourcePort) {
      return { success: false, error: `Source port not found (ID: ${sourcePortId})` };
    }
    if (!destinationPort) {
      return { success: false, error: `Destination port not found (ID: ${destinationPortId})` };
    }
    
    // Port availability check
    if (sourcePort.connectedToPortId) {
      return { 
        success: false, 
        error: `Source port already connected to device ${sourcePort.connectedToDeviceId}, port ${sourcePort.connectedToPortId}` 
      };
    }
    if (destinationPort.connectedToPortId) {
      return { 
        success: false, 
        error: `Destination port already connected to device ${destinationPort.connectedToDeviceId}, port ${destinationPort.connectedToPortId}` 
      };
    }
    
    // Port compatibility checks
    if (!isConnectorCompatible(sourcePort.connectorType, cable.connectorA_Type)) {
      return { 
        success: false, 
        error: `Connector type mismatch: Source port (${sourcePort.connectorType}) and cable end A (${cable.connectorA_Type})` 
      };
    }
    if (!isConnectorCompatible(destinationPort.connectorType, cable.connectorB_Type)) {
      return { 
        success: false, 
        error: `Connector type mismatch: Destination port (${destinationPort.connectorType}) and cable end B (${cable.connectorB_Type})` 
      };
    }
    
    // Advanced: Media type compatibility
    if (sourcePort.mediaType && cable.mediaType && 
        !isMediaTypeCompatible(sourcePort.mediaType, cable.mediaType)) {
      return { 
        success: false, 
        error: `Media type mismatch: Source port (${sourcePort.mediaType}) and cable (${cable.mediaType})` 
      };
    }
    if (destinationPort.mediaType && cable.mediaType && 
        !isMediaTypeCompatible(destinationPort.mediaType, cable.mediaType)) {
      return { 
        success: false, 
        error: `Media type mismatch: Destination port (${destinationPort.mediaType}) and cable (${cable.mediaType})` 
      };
    }
    
    // Cable length check (placeholder for future enhancement)
    // For now, we're just assuming devices in the same design can be connected
    
    // All checks passed, let's update the ports
    const updatedComponents = activeDesign.components.map(component => {
      if (component.id === sourceDeviceId) {
        const updatedPorts = component.ports?.map(port => 
          port.id === sourcePortId
            ? { 
                ...port, 
                connectedToDeviceId: destinationDeviceId,
                connectedToPortId: destinationPortId,
                cableId: cableId
              }
            : port
        );
        return { ...component, ports: updatedPorts };
      }
      else if (component.id === destinationDeviceId) {
        const updatedPorts = component.ports?.map(port => 
          port.id === destinationPortId
            ? { 
                ...port, 
                connectedToDeviceId: sourceDeviceId,
                connectedToPortId: sourcePortId,
                cableId: cableId
              }
            : port
        );
        return { ...component, ports: updatedPorts };
      }
      return component;
    });
    
    // Update the design store
    updateActiveDesign(updatedComponents);
    toast.success("Connection created successfully");
    
    // Update our local connections list
    setConnections(prev => [...prev, {
      sourceDeviceId,
      sourcePortId,
      destinationDeviceId,
      destinationPortId,
      cableId
    }]);
    
    return { success: true };
  };
  
  /**
   * Remove a connection between two ports
   */
  const removeConnection = (
    sourceDeviceId: string,
    sourcePortId: string,
    destinationDeviceId: string,
    destinationPortId: string
  ): { success: boolean; error?: string } => {
    if (!activeDesign) {
      return { success: false, error: "No active design" };
    }
    
    // Find the devices
    const sourceDevice = activeDesign.components.find(c => c.id === sourceDeviceId);
    const destinationDevice = activeDesign.components.find(c => c.id === destinationDeviceId);
    
    // Validate the devices exist
    if (!sourceDevice || !destinationDevice) {
      return { success: false, error: "One or both devices not found" };
    }
    
    // Validate the ports exist
    if (!sourceDevice.ports || !destinationDevice.ports) {
      return { success: false, error: "One or both devices have no ports" };
    }
    
    const sourcePort = sourceDevice.ports.find(p => p.id === sourcePortId);
    const destinationPort = destinationDevice.ports.find(p => p.id === destinationPortId);
    
    if (!sourcePort || !destinationPort) {
      return { success: false, error: "One or both ports not found" };
    }
    
    // Check if ports are actually connected to each other
    if (sourcePort.connectedToDeviceId !== destinationDeviceId || 
        sourcePort.connectedToPortId !== destinationPortId) {
      return { success: false, error: "Ports are not connected as specified" };
    }
    
    // All checks passed, let's update the ports
    const updatedComponents = activeDesign.components.map(component => {
      if (component.id === sourceDeviceId) {
        const updatedPorts = component.ports?.map(port => 
          port.id === sourcePortId
            ? { 
                ...port, 
                connectedToDeviceId: undefined,
                connectedToPortId: undefined,
                cableId: undefined
              }
            : port
        );
        return { ...component, ports: updatedPorts };
      }
      else if (component.id === destinationDeviceId) {
        const updatedPorts = component.ports?.map(port => 
          port.id === destinationPortId
            ? { 
                ...port, 
                connectedToDeviceId: undefined,
                connectedToPortId: undefined,
                cableId: undefined
              }
            : port
        );
        return { ...component, ports: updatedPorts };
      }
      return component;
    });
    
    // Update the design store
    updateActiveDesign(updatedComponents);
    toast.success("Connection removed successfully");
    
    // Update our local connections list
    setConnections(prev => prev.filter(conn => 
      !(conn.sourceDeviceId === sourceDeviceId && 
        conn.sourcePortId === sourcePortId && 
        conn.destinationDeviceId === destinationDeviceId && 
        conn.destinationPortId === destinationPortId)
    ));
    
    return { success: true };
  };
  
  /**
   * Get all connections for a specific device
   * @param deviceId The device ID
   */
  const getDeviceConnections = (deviceId: string) => {
    return connections.filter(conn => 
      conn.sourceDeviceId === deviceId || 
      conn.destinationDeviceId === deviceId
    );
  };
  
  /**
   * Get a connection by its endpoints
   */
  const getConnection = (
    sourceDeviceId: string,
    sourcePortId: string,
    destinationDeviceId: string,
    destinationPortId: string
  ) => {
    return connections.find(conn => 
      (conn.sourceDeviceId === sourceDeviceId && 
       conn.sourcePortId === sourcePortId && 
       conn.destinationDeviceId === destinationDeviceId && 
       conn.destinationPortId === destinationPortId) ||
      (conn.sourceDeviceId === destinationDeviceId && 
       conn.sourcePortId === destinationPortId && 
       conn.destinationDeviceId === sourceDeviceId && 
       conn.destinationPortId === sourcePortId)
    );
  };
  
  return {
    connections,
    addConnection,
    removeConnection,
    getDeviceConnections,
    getConnection
  };
};
