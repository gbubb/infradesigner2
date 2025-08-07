import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InfrastructureComponent, ComponentType, Cable } from "@/types/infrastructure";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Cpu, HardDrive, Network, Cable as CableIcon, Router, Shield } from "lucide-react";

interface BomItemHoverCardProps {
  component: InfrastructureComponent;
  children: React.ReactNode;
}

export function BomItemHoverCard({ component, children }: BomItemHoverCardProps) {
  const navigate = useNavigate();

  const getComponentIcon = () => {
    switch (component.type) {
      case ComponentType.Server:
        return <Cpu className="h-5 w-5" />;
      case ComponentType.Disk:
        return <HardDrive className="h-5 w-5" />;
      case ComponentType.Switch:
        return <Network className="h-5 w-5" />;
      case ComponentType.Router:
        return <Router className="h-5 w-5" />;
      case ComponentType.Firewall:
        return <Shield className="h-5 w-5" />;
      case ComponentType.Cable:
      case ComponentType.FiberPatchPanel:
      case ComponentType.CopperPatchPanel:
      case ComponentType.Cassette:
        return <CableIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getComponentDetails = () => {
    const details: { label: string; value: string | number }[] = [];

    // Common details
    if (component.manufacturer) {
      details.push({ label: "Manufacturer", value: component.manufacturer });
    }
    if (component.model) {
      details.push({ label: "Model", value: component.model });
    }

    // Type-specific details
    switch (component.type) {
      case ComponentType.Server:
        if (component.cpuCores) {
          details.push({ label: "CPU Cores", value: component.cpuCores });
        }
        if (component.memoryGB) {
          details.push({ label: "Memory", value: `${component.memoryGB} GB` });
        }
        if ('diskBays' in component && (component as any).diskBays) {
          details.push({ label: "Disk Bays", value: (component as any).diskBays });
        }
        break;

      case ComponentType.Disk:
        if ('diskBays' in component && (component as any).diskBays) {
          details.push({ label: "Disk Bays", value: (component as any).diskBays });
        }
        if ('controllerCount' in component && (component as any).controllerCount) {
          details.push({ label: "Controllers", value: (component as any).controllerCount });
        }
        break;

      case ComponentType.Switch:
      case ComponentType.Router:
      case ComponentType.Firewall: {
        const port100GCount = 'port100GCount' in component ? (component as any).port100GCount : 0;
        const port400GCount = 'port400GCount' in component ? (component as any).port400GCount : 0;
        const port10GCount = 'port10GCount' in component ? (component as any).port10GCount : 0;
        const port25GCount = 'port25GCount' in component ? (component as any).port25GCount : 0;
        const totalPorts = (port100GCount || 0) + 
                          (port400GCount || 0) + 
                          (port10GCount || 0) + 
                          (port25GCount || 0);
        if (totalPorts > 0) {
          details.push({ label: "Total Ports", value: totalPorts });
        }
        if (port100GCount) {
          details.push({ label: "100G Ports", value: port100GCount });
        }
        if (port400GCount) {
          details.push({ label: "400G Ports", value: port400GCount });
        }
        break;
      }

      case ComponentType.Cable:
        const cableComponent = component as Cable;
        if (cableComponent.mediaType) {
          details.push({ label: "Media Type", value: cableComponent.mediaType });
        }
        if (cableComponent.connectorA_Type && cableComponent.connectorB_Type) {
          details.push({ 
            label: "Connectors", 
            value: `${cableComponent.connectorA_Type} to ${cableComponent.connectorB_Type}` 
          });
        }
        if (cableComponent.isBreakout) {
          details.push({ label: "Type", value: "Breakout Cable" });
        }
        break;

      case ComponentType.FiberPatchPanel:
      case ComponentType.CopperPatchPanel:
      case ComponentType.Cassette:
        if (component.portCount) {
          details.push({ label: "Port Count", value: component.portCount });
        }
        if ('mediaType' in component && (component as any).mediaType) {
          details.push({ label: "Media Type", value: (component as any).mediaType });
        }
        break;
    }

    // Common technical details
    if ('powerConsumptionW' in component && (component as any).powerConsumptionW) {
      details.push({ label: "Power", value: `${(component as any).powerConsumptionW}W` });
    } else if (component.powerTypical) {
      details.push({ label: "Power", value: `${component.powerTypical}W` });
    }
    if ('heightRU' in component && (component as any).heightRU) {
      details.push({ label: "Height", value: `${(component as any).heightRU}U` });
    } else if (component.ruSize) {
      details.push({ label: "Height", value: `${component.ruSize}U` });
    }
    if (component.cost) {
      details.push({ label: "Unit Cost", value: `$${component.cost.toLocaleString()}` });
    }

    return details;
  };

  const handleViewInLibrary = () => {
    // Navigate to component library with the component selected
    navigate('/components', { 
      state: { 
        selectedComponentId: (component as any).templateId || component.id,
        scrollToComponent: true 
      } 
    });
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="start">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getComponentIcon()}
              <div>
                <h4 className="text-sm font-semibold">{component.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {component.type.replace(/([A-Z])/g, ' $1').trim()}
                </p>
              </div>
            </div>
            <Badge variant="outline">{component.role || 'Unassigned'}</Badge>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {getComponentDetails().map((detail, idx) => (
              <div key={idx}>
                <span className="text-muted-foreground">{detail.label}:</span>
                <span className="ml-1 font-medium">{detail.value}</span>
              </div>
            ))}
          </div>

          {/* Notes if available */}
          {(component as any).notes && (
            <div className="text-xs">
              <span className="text-muted-foreground">Notes:</span>
              <p className="mt-1 text-xs">{(component as any).notes}</p>
            </div>
          )}

          {/* Action Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleViewInLibrary}
          >
            <ExternalLink className="mr-2 h-3 w-3" />
            View in Component Library
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}