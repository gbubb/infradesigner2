
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType, ManagementNetworkType, IPMINetworkType } from '@/types/infrastructure';

export const useNetworkPortsMetrics = () => {
  const { activeDesign } = useDesignStore();
  
  return useMemo(() => {
    if (!activeDesign?.components) {
      return {
        totalLeafSwitches: 0,
        totalStorageSwitches: 0,
        totalMgmtSwitches: 0,
        totalIPMISwitches: 0,
        leafPortsUsed: 0,
        leafPortsAvailable: 0,
        storagePortsUsed: 0,
        storagePortsAvailable: 0,
        mgmtPortsUsed: 0,
        mgmtPortsAvailable: 0,
        isConvergedManagement: false,
      };
    }
    
    // Check if dedicated storage network is enabled
    const hasDedicatedStorageNetwork = activeDesign.requirements?.networkRequirements?.dedicatedStorageNetwork || false;
    const ipmiNetwork = activeDesign.requirements?.networkRequirements?.ipmiNetwork || 'Management converged' as IPMINetworkType;
    const managementNetwork = activeDesign.requirements?.networkRequirements?.managementNetwork || 'Dual Home' as ManagementNetworkType;
    const isConvergedManagement = managementNetwork === 'Converged Management Plane';
    
    let totalLeafSwitches = 0;
    let totalStorageSwitches = 0;
    let totalMgmtSwitches = 0;
    let totalIPMISwitches = 0;
    let leafPortsUsed = 0;
    let leafPortsAvailable = 0;
    let storagePortsUsed = 0;
    let storagePortsAvailable = 0;
    let mgmtPortsUsed = 0;
    let mgmtPortsAvailable = 0;
    
    // Track storage nodes for dedicated storage network calculation
    const storageNodes = [];
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      if (component.type === ComponentType.Server) {
        // Track storage nodes separately
        if (component.role === 'storageNode') {
          storageNodes.push(component);
        }
        
        // Calculate ports used by servers for leaf connections
        let serverLeafPortsUsed = 2; // Default if not specified
        if ('portsConsumedQuantity' in component && (component as any).portsConsumedQuantity > 0) {
          serverLeafPortsUsed = (component as any).portsConsumedQuantity;
        }
        
        // Allocate ports based on node type and network configuration
        if (hasDedicatedStorageNetwork && component.role === 'storageNode') {
          // If we have a dedicated storage network, storage nodes use the storage network
          storagePortsUsed += serverLeafPortsUsed * quantity;
        } else {
          // All other nodes use the leaf network
          leafPortsUsed += serverLeafPortsUsed * quantity;
        }
        
        // Calculate ports used by servers for management connections
        // Only add management ports if not using converged management
        if (!isConvergedManagement) {
          let serverMgmtPortsUsed = 1; // Default if not specified
          // Compare with string literals directly to avoid TypeScript errors
          if (managementNetwork === "Dual Home") {
            serverMgmtPortsUsed = 2;
          }
          
          mgmtPortsUsed += serverMgmtPortsUsed * quantity;
          
          // Add IPMI ports if needed
          if (ipmiNetwork === 'Management converged') {
            mgmtPortsUsed += quantity;
          }
        } else {
          // If using converged management, add management ports to leaf network
          // Compare with string literals directly
          leafPortsUsed += (managementNetwork === "Dual Home" ? 2 : 1) * quantity;
          
          // Add IPMI ports to leaf network too
          leafPortsUsed += quantity; // Always 1 IPMI port per server
        }
      } else if (component.type === ComponentType.Switch) {
        // Calculate switch ports
        let portCount = 0;
        
        // Try different properties for port counts
        if ('portsProvidedQuantity' in component && (component as any).portsProvidedQuantity > 0) {
          portCount = (component as any).portsProvidedQuantity;
        } else if ('portCount' in component && (component as any).portCount > 0) {
          portCount = (component as any).portCount;
        }
        
        // Add ports based on switch role
        if (component.role === 'managementSwitch') {
          totalMgmtSwitches += quantity;
          mgmtPortsAvailable += portCount * quantity;
        } else if (component.role === 'ipmiSwitch') {
          totalIPMISwitches += quantity;
          // IPMI switches are accounted separately but we'll include their ports in management
          mgmtPortsAvailable += portCount * quantity;
        } else if (component.role === 'storageSwitch') {
          totalStorageSwitches += quantity;
          storagePortsAvailable += portCount * quantity;
        } else if (['computeSwitch', 'leafSwitch', 'borderLeafSwitch'].includes(component.role || '')) {
          totalLeafSwitches += quantity;
          leafPortsAvailable += portCount * quantity;
        }
      }
    });
    
    return {
      totalLeafSwitches,
      totalStorageSwitches,
      totalMgmtSwitches,
      totalIPMISwitches,
      leafPortsUsed,
      leafPortsAvailable,
      storagePortsUsed,
      storagePortsAvailable,
      mgmtPortsUsed,
      mgmtPortsAvailable,
      hasDedicatedStorageNetwork,
      isConvergedManagement
    };
  }, [activeDesign]);
};
