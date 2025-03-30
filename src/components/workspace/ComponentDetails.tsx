
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trash2, Copy, Edit } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType, Server, Switch, Router, Disk } from '@/types/infrastructure';

interface ComponentDetailsProps {
  open: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

export const ComponentDetails: React.FC<ComponentDetailsProps> = ({ open, onClose, onDelete }) => {
  const { selectedComponentId, placedComponents } = useDesignStore();
  
  const component = selectedComponentId ? placedComponents[selectedComponentId] : null;
  
  if (!component) {
    return null;
  }

  // Render specific component properties based on type
  const renderComponentSpecificDetails = () => {
    switch (component.type) {
      case ComponentType.Server:
        const server = component as Server;
        return (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">CPU Model</div>
              <div>{server.cpuModel}</div>
              
              <div className="text-gray-500">CPU Count</div>
              <div>{server.cpuCount}</div>
              
              <div className="text-gray-500">Cores</div>
              <div>{server.coreCount}</div>
              
              <div className="text-gray-500">Memory</div>
              <div>{server.memoryGB} GB</div>
              
              <div className="text-gray-500">Storage</div>
              <div>{server.storageCapacityTB} TB</div>
              
              <div className="text-gray-500">Network</div>
              <div>{server.networkPorts} ports @ {server.networkPortSpeed} Gbps</div>
              
              <div className="text-gray-500">Rack Units</div>
              <div>{server.rackUnitsConsumed} RU</div>
            </div>
          </>
        );
      
      case ComponentType.Switch:
      case ComponentType.Router:
        const networkDevice = component as Switch | Router;
        return (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">Ports</div>
              <div>{networkDevice.portCount}</div>
              
              <div className="text-gray-500">Port Speed</div>
              <div>{networkDevice.portSpeed} Gbps</div>
              
              <div className="text-gray-500">Rack Units</div>
              <div>{networkDevice.rackUnitsConsumed} RU</div>

              {component.type === ComponentType.Router && (
                <>
                  <div className="text-gray-500">Throughput</div>
                  <div>{(component as Router).throughput} Gbps</div>
                  
                  <div className="text-gray-500">Protocols</div>
                  <div>{(component as Router).supportedProtocols.join(', ')}</div>
                </>
              )}
            </div>
          </>
        );
      
      case ComponentType.Disk:
        const disk = component as Disk;
        return (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">Capacity</div>
              <div>{disk.capacityTB} TB</div>
              
              <div className="text-gray-500">Form Factor</div>
              <div>{disk.formFactor}</div>
              
              <div className="text-gray-500">Interface</div>
              <div>{disk.interface}</div>
              
              {disk.iops && (
                <>
                  <div className="text-gray-500">IOPS</div>
                  <div>{disk.iops.toLocaleString()}</div>
                </>
              )}
              
              {disk.readSpeed && (
                <>
                  <div className="text-gray-500">Read Speed</div>
                  <div>{disk.readSpeed} MB/s</div>
                </>
              )}
              
              {disk.writeSpeed && (
                <>
                  <div className="text-gray-500">Write Speed</div>
                  <div>{disk.writeSpeed} MB/s</div>
                </>
              )}
            </div>
          </>
        );
      
      default:
        return (
          <div className="text-sm text-gray-500">
            No specific details available for this component type.
          </div>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle>{component.name}</SheetTitle>
        </SheetHeader>
        
        <div className="py-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">Manufacturer</div>
            <div>{component.manufacturer}</div>
            
            <div className="text-gray-500">Model</div>
            <div>{component.model}</div>
            
            <div className="text-gray-500">Cost</div>
            <div>${component.cost}</div>
            
            <div className="text-gray-500">Power</div>
            <div>{component.powerRequired} W</div>
          </div>
          
          <Separator className="my-4" />
          
          {renderComponentSpecificDetails()}
        </div>
        
        <SheetFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
