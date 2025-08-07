
import React from 'react';
import { 
  Server, 
  Network, 
  HardDrive, 
  Router,
  Shield
} from 'lucide-react';
import { 
  InfrastructureComponent, 
  ComponentType,
  Server as ServerType,
  Switch as SwitchType,
  Router as RouterType,
  Disk as DiskType
} from '@/types/infrastructure';

// Helper function to get the icon based on component type
const getComponentIcon = (type: ComponentType) => {
  switch (type) {
    case ComponentType.Server:
      return <Server className="h-10 w-10 text-infra-component-server" />;
    case ComponentType.Switch:
      return <Network className="h-10 w-10 text-infra-component-network" />;
    case ComponentType.Router:
      return <Router className="h-10 w-10 text-infra-component-network" />;
    case ComponentType.Firewall:
      return <Shield className="h-10 w-10 text-infra-component-security" />;
    case ComponentType.Disk:
      return <HardDrive className="h-10 w-10 text-infra-component-storage" />;
    default:
      return <Server className="h-10 w-10 text-gray-400" />;
  }
};

// Helper function to get a summary of the component
const getComponentSummary = (component: InfrastructureComponent): string => {
  switch (component.type) {
    case ComponentType.Server:
      return `${(component as ServerType).coreCount} cores, ${(component as ServerType).memoryGB}GB RAM`;
    case ComponentType.Switch:
    case ComponentType.Router:
      return `${(component as SwitchType | RouterType).portCount} ports @ ${(component as SwitchType | RouterType).portSpeed}Gbps`;
    case ComponentType.Disk:
      return `${(component as DiskType).capacityTB}TB, ${(component as DiskType).interface}`;
    default:
      return `${component.manufacturer} ${component.model}`;
  }
};

interface ComponentCardProps {
  component: InfrastructureComponent;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({ component }) => {
  const startDrag = (e: React.DragEvent) => {
    e.dataTransfer.setData('component', JSON.stringify(component));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div 
      className="component-card"
      draggable
      onDragStart={startDrag}
    >
      <div className="mb-2">{getComponentIcon(component.type)}</div>
      <h3 className="text-sm font-medium">{component.name}</h3>
      <p className="text-xs text-gray-500 mt-1">{getComponentSummary(component)}</p>
      <div className="mt-2 text-xs text-gray-500 flex justify-between w-full">
        <span>${component.cost}</span>
        <span>{component.powerTypical || 0}W</span>
      </div>
    </div>
  );
};
