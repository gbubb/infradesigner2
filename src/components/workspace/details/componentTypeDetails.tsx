
import React from 'react';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

export const renderComponentSpecificDetails = (component: InfrastructureComponent) => {
  switch (component.type) {
    case ComponentType.Server:
      if ('cpuModel' in component) {
        const totalCores = component.cpuSockets && component.cpuCoresPerSocket ? 
          component.cpuSockets * component.cpuCoresPerSocket : 
          component.coreCount || 0;
        
        const serverMemory = component.memoryCapacity || component.memoryGB || 0;
        
        return (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {component.serverRole && (
              <>
                <div className="text-gray-500">Server Role</div>
                <div>{component.serverRole}</div>
              </>
            )}
            
            <div className="text-gray-500">CPU Model</div>
            <div>{component.cpuModel}</div>
            
            {component.cpuSockets && (
              <>
                <div className="text-gray-500">CPU Sockets</div>
                <div>{component.cpuSockets}</div>
              </>
            )}
            
            {component.cpuCoresPerSocket && (
              <>
                <div className="text-gray-500">Cores per Socket</div>
                <div>{component.cpuCoresPerSocket}</div>
              </>
            )}
            
            <div className="text-gray-500">Total Cores</div>
            <div>{totalCores}</div>
            
            <div className="text-gray-500">Memory</div>
            <div>{serverMemory} GB</div>
            
            {component.diskSlotType && component.diskSlotQuantity && (
              <>
                <div className="text-gray-500">Disk Slots</div>
                <div>{component.diskSlotQuantity}x {component.diskSlotType}</div>
              </>
            )}
          </div>
        );
      }
      break;

    case ComponentType.Switch:
      if ('portCount' in component) {
        return (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {component.switchRole && (
              <>
                <div className="text-gray-500">Switch Role</div>
                <div>{component.switchRole}</div>
              </>
            )}
            
            <div className="text-gray-500">Ports</div>
            <div>{component.portsProvidedQuantity || component.portCount}</div>
            
            <div className="text-gray-500">Port Speed</div>
            <div>{component.portSpeedType || component.portSpeed} Gbps</div>
            
            <div className="text-gray-500">Rack Units</div>
            <div>{component.ruSize || component.rackUnitsConsumed} RU</div>
          </div>
        );
      }
      break;

    // Add other component type cases as needed
    default:
      return (
        <div className="text-sm text-gray-500">
          No specific details available for this component type.
        </div>
      );
  }
};
