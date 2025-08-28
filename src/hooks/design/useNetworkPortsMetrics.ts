
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType, ManagementNetworkType, IPMINetworkType, InfrastructureComponent } from '@/types/infrastructure';
import { Server, Switch } from '@/types/infrastructure';

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
    const ipmiNetwork = activeDesign.requirements?.networkRequirements?.ipmiNetwork || 'Dedicated IPMI switch' as IPMINetworkType;
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
      
      // Check component type - handle both exact match and case-insensitive match
      const isServer = component.type === ComponentType.Server || 
                      (typeof component.type === 'string' && component.type.toLowerCase() === 'server');
      const isSwitch = component.type === ComponentType.Switch || 
                      (typeof component.type === 'string' && component.type.toLowerCase() === 'switch');
      
      if (isServer) {
        // Track storage nodes separately
        if (component.role === 'storageNode') {
          storageNodes.push(component);
        }
        
        // Calculate ports used by servers for leaf connections
        let serverLeafPortsUsed = 2; // Default if not specified
        const serverComponent = component as Server;
        if ('portsConsumedQuantity' in serverComponent && serverComponent.portsConsumedQuantity && serverComponent.portsConsumedQuantity > 0) {
          serverLeafPortsUsed = serverComponent.portsConsumedQuantity;
        }
        
        // Allocate ports based on node type and network configuration
        if (hasDedicatedStorageNetwork && component.role === 'storageNode') {
          // If we have a dedicated storage network, storage nodes use the storage network
          storagePortsUsed += serverLeafPortsUsed * quantity;
        } else {
          // All other nodes use the leaf network
          leafPortsUsed += serverLeafPortsUsed * quantity;
        }
        
        // Calculate IPMI ports based on configuration
        if (ipmiNetwork === 'Dedicated IPMI switch') {
          // If using dedicated IPMI switches, count these separately
          // Always 1 IPMI port per server
          // Note: we don't increment totalIPMISwitches here, that's done when counting actual switch components
        }
        
        // Calculate management ports based on configuration
        if (isConvergedManagement) {
          // If using converged management, add management ports to leaf network
          // Use string comparison for safest approach
          const mgmtPorts = managementNetwork.includes("Dual") ? 2 : 1;
          leafPortsUsed += mgmtPorts * quantity;
          
          // If IPMI is "Management converged" with converged management plane,
          // IPMI ports go to the leaf switches too
          if (ipmiNetwork === 'Management converged') {
            leafPortsUsed += quantity; // Always 1 IPMI port per server
          }
        } else {
          // Using dedicated management switches
          // Use string comparison for safest approach
          const mgmtPorts = managementNetwork.includes("Dual") ? 2 : 1;
          mgmtPortsUsed += mgmtPorts * quantity;
          
          // If IPMI is converged with management, add IPMI ports to management switch count
          if (ipmiNetwork === 'Management converged') {
            mgmtPortsUsed += quantity;
          }
        }
      } else if (isSwitch) {
        // Calculate switch ports
        const switchComponent = component as Switch;
        let portCount = 0;
        
        // Try different properties for port counts
        if ('portsProvidedQuantity' in switchComponent && switchComponent.portsProvidedQuantity && switchComponent.portsProvidedQuantity > 0) {
          portCount = switchComponent.portsProvidedQuantity;
        } else if ('portCount' in component && component.portCount && component.portCount > 0) {
          portCount = component.portCount;
        }
        
        // Add ports based on switch role - check both 'role' and 'switchRole' properties
        // Some switches use 'switchRole' instead of 'role'
        const effectiveRole = (component.role || switchComponent.switchRole || '').toLowerCase();
        
        // Categorize switches
        if (effectiveRole.includes('management') || effectiveRole === 'mgmt') {
          totalMgmtSwitches += quantity;
          mgmtPortsAvailable += portCount * quantity;
        } else if (effectiveRole.includes('ipmi')) {
          totalIPMISwitches += quantity;
          // IPMI switches handle IPMI ports only
          // We don't add these to management ports available
        } else if (effectiveRole.includes('storage')) {
          totalStorageSwitches += quantity;
          storagePortsAvailable += portCount * quantity;
        } else {
          // All other switches are considered data plane switches
          // This includes: leaf, spine, core, access, distribution, compute, border leaf, etc.
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
