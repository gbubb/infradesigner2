
import React from 'react';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

export const renderComponentSpecificDetails = (component: InfrastructureComponent) => {
  switch (component.type) {
    case ComponentType.Server:
      if ('cpuModel' in component) {
        const totalCores = ('cpuSockets' in component && 'cpuCoresPerSocket' in component && component.cpuSockets && component.cpuCoresPerSocket) ? 
          (component.cpuSockets as number) * (component.cpuCoresPerSocket as number) : 
          ('coreCount' in component ? component.coreCount : 0) as number;
        
        const serverMemory = ('memoryCapacity' in component ? component.memoryCapacity : ('memoryGB' in component ? component.memoryGB : 0)) as number;
        
        return (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {component.serverRole && (
              <>
                <div className="text-gray-500">Server Role</div>
                <div>{component.serverRole}</div>
              </>
            )}
            
            <div className="text-gray-500">CPU Model</div>
            <div>{String(component.cpuModel ?? '')}</div>
            
            {'cpuSockets' in component && component.cpuSockets && (
              <>
                <div className="text-gray-500">CPU Sockets</div>
                <div>{component.cpuSockets as number}</div>
              </>
            )}
            
            {'cpuCoresPerSocket' in component && component.cpuCoresPerSocket && (
              <>
                <div className="text-gray-500">Cores per Socket</div>
                <div>{component.cpuCoresPerSocket as number}</div>
              </>
            )}
            
            <div className="text-gray-500">Total Cores</div>
            <div>{totalCores}</div>
            
            <div className="text-gray-500">Memory</div>
            <div>{serverMemory} GB</div>
            
            {'diskSlotType' in component && 'diskSlotQuantity' in component && Boolean(component.diskSlotType) && Boolean(component.diskSlotQuantity) && (
              <>
                <div className="text-gray-500">Disk Slots</div>
                <div>{Number(component.diskSlotQuantity)}x {String(component.diskSlotType)}</div>
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
            <div>{('portsProvidedQuantity' in component ? component.portsProvidedQuantity : ('portCount' in component ? component.portCount : 0)) as number}</div>
            
            <div className="text-gray-500">Port Speed</div>
            <div>{('portSpeedType' in component ? component.portSpeedType : ('portSpeed' in component ? component.portSpeed : '')) as string} Gbps</div>
            
            <div className="text-gray-500">Rack Units</div>
            <div>{('ruSize' in component ? component.ruSize : ('rackUnitsConsumed' in component ? component.rackUnitsConsumed : 1)) as number} RU</div>
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
