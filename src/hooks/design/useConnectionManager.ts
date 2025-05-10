import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Port, MediaType, CableMediaType, ConnectorType, InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import { toast } from 'sonner';
import { shallow } from 'zustand/shallow';
import { StoreState } from '@/store/types';

/**
 * Hook for managing connections between devices in the infrastructure design
 */
export const useConnectionManager = () => {
  const { components, updateActiveDesign } = useDesignStore(
    (state: StoreState) => ({
      components: state.activeDesign?.components || [],
      updateActiveDesign: state.updateActiveDesign,
    }),
    shallow
  );
  
  const [connections, setConnections] = useState<Array<{
    sourceDeviceId: string;
    sourcePortId: string;
    destinationDeviceId: string;
    destinationPortId: string;
    cableId: string;
  }>>([]);
  
  const detectedConnections = useMemo(() => {
    const newConnections: Array<{
      sourceDeviceId: string;
      sourcePortId: string;
      destinationDeviceId: string;
      destinationPortId: string;
      cableId: string;
    }> = [];
    
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

  useEffect(() => {
    if (JSON.stringify(connections) !== JSON.stringify(detectedConnections)) {
      setConnections(detectedConnections);
    }
  }, [detectedConnections, connections]);
  
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
  const addConnection = useCallback((
    sourceDeviceId: string,
    sourcePortId: string,
    destinationDeviceId: string,
    destinationPortId: string,
    cableId: string
  ): { success: boolean; error?: string } => {
    if (!components) {
      return { success: false, error: "No active design components found" };
    }
    
    const sourceDevice = components.find(c => c.id === sourceDeviceId);
    const destinationDevice = components.find(c => c.id === destinationDeviceId);
    const cableComponent = components.find(c => c.id === cableId && c.type === ComponentType.Cable);
    
    if (!sourceDevice) { return { success: false, error: `Source device not found (ID: ${sourceDeviceId})` }; }
    if (!destinationDevice) { return { success: false, error: `Destination device not found (ID: ${destinationDeviceId})` }; }
    if (!cableComponent) { return { success: false, error: `Cable not found or not a Cable type (ID: ${cableId})` }; }
    if (!sourceDevice.ports) { return { success: false, error: "Source device has no ports" }; }
    if (!destinationDevice.ports) { return { success: false, error: "Destination device has no ports" }; }
    const sourcePort = sourceDevice.ports.find(p => p.id === sourcePortId);
    const destinationPort = destinationDevice.ports.find(p => p.id === destinationPortId);
    if (!sourcePort) { return { success: false, error: `Source port not found (ID: ${sourcePortId})` }; }
    if (!destinationPort) { return { success: false, error: `Destination port not found (ID: ${destinationPortId})` }; }
    if (sourcePort.connectedToPortId) { return { success: false, error: `Source port ${sourcePort.id} already connected` }; }
    if (destinationPort.connectedToPortId) { return { success: false, error: `Destination port ${destinationPort.id} already connected` }; }
    if (!isConnectorCompatible(sourcePort.connectorType, cableComponent.connectorA_Type)) { return { success: false, error: `Connector type mismatch: Source port (${sourcePort.connectorType}) and cable end A (${cableComponent.connectorA_Type})` }; }
    if (!isConnectorCompatible(destinationPort.connectorType, cableComponent.connectorB_Type)) { return { success: false, error: `Connector type mismatch: Destination port (${destinationPort.connectorType}) and cable end B (${cableComponent.connectorB_Type})` }; }
    if (sourcePort.mediaType && cableComponent.mediaType && !isMediaTypeCompatible(sourcePort.mediaType, cableComponent.mediaType)) { return { success: false, error: `Media type mismatch: Source port (${sourcePort.mediaType}) and cable (${cableComponent.mediaType})` }; }
    if (destinationPort.mediaType && cableComponent.mediaType && !isMediaTypeCompatible(destinationPort.mediaType, cableComponent.mediaType)) { return { success: false, error: `Media type mismatch: Destination port (${destinationPort.mediaType}) and cable (${cableComponent.mediaType})` }; }

    const updatedComponents = components.map(component => {
      let newComp = { ...component };
      if (component.id === sourceDeviceId) {
        newComp.ports = component.ports?.map(port => 
          port.id === sourcePortId
            ? { ...port, connectedToDeviceId: destinationDeviceId, connectedToPortId: destinationPortId, cableId: cableId }
            : port
        );
      }
      if (component.id === destinationDeviceId) {
        newComp.ports = component.ports?.map(port => 
          port.id === destinationPortId
            ? { ...port, connectedToDeviceId: sourceDeviceId, connectedToPortId: sourcePortId, cableId: cableId }
            : port
        );
      }
      return newComp;
    });
    
    updateActiveDesign(updatedComponents);
    toast.success("Connection created successfully");
    return { success: true };
  }, [components, updateActiveDesign]);
  
  /**
   * Remove a connection between two ports
   */
  const removeConnection = useCallback((
    sourceDeviceId: string,
    sourcePortId: string,
    destinationDeviceId: string,
    destinationPortId: string
  ): { success: boolean; error?: string } => {
    if (!components) {
      return { success: false, error: "No active design components found" };
    }

    const sourceDevice = components.find(c => c.id === sourceDeviceId);
    const destinationDevice = components.find(c => c.id === destinationDeviceId);
    if (!sourceDevice || !destinationDevice) { return { success: false, error: "One or both devices not found" }; }
    if (!sourceDevice.ports || !destinationDevice.ports) { return { success: false, error: "One or both devices have no ports" }; }
    const sourcePort = sourceDevice.ports.find(p => p.id === sourcePortId);
    const destinationPort = destinationDevice.ports.find(p => p.id === destinationPortId);
    if (!sourcePort || !destinationPort) { return { success: false, error: "One or both ports not found" }; }
    if (sourcePort.connectedToDeviceId !== destinationDeviceId || sourcePort.connectedToPortId !== destinationPortId) { return { success: false, error: "Ports are not connected as specified" }; }

    const updatedComponents = components.map(component => {
      let newComp = { ...component };
      if (component.id === sourceDeviceId) {
        newComp.ports = component.ports?.map(port =>
          port.id === sourcePortId
            ? { ...port, connectedToDeviceId: undefined, connectedToPortId: undefined, cableId: undefined }
            : port
        );
      }
      if (component.id === destinationDeviceId) {
        newComp.ports = component.ports?.map(port =>
          port.id === destinationPortId
            ? { ...port, connectedToDeviceId: undefined, connectedToPortId: undefined, cableId: undefined }
            : port
        );
      }
      return newComp;
    });

    updateActiveDesign(updatedComponents);
    toast.success("Connection removed successfully");
    return { success: true };
  }, [components, updateActiveDesign]);
  
  /**
   * Get all connections for a specific device
   * @param deviceId The device ID
   */
  const getDeviceConnections = useCallback((deviceId: string) => {
    return connections.filter(conn => 
      conn.sourceDeviceId === deviceId || 
      conn.destinationDeviceId === deviceId
    );
  }, [connections]);
  
  /**
   * Get a connection by its endpoints
   */
  const getConnection = useCallback((
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
  }, [connections]);
  
  return {
    connections,
    addConnection,
    removeConnection,
    getDeviceConnections,
    getConnection
  };
};
