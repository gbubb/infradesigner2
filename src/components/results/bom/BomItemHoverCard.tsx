import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  InfrastructureComponent, 
  ComponentType, 
  Cable, 
  Server, 
  Disk, 
  Switch, 
  Router, 
  Firewall,
  FiberPatchPanel,
  CopperPatchPanel,
  Cassette
} from "@/types/infrastructure";
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
        const serverComponent = component as Server;
        if ('diskSlotQuantity' in serverComponent && serverComponent.diskSlotQuantity) {
          details.push({ label: "Disk Bays", value: serverComponent.diskSlotQuantity });
        }
        break;

      case ComponentType.Disk:
        const serverComponent = component as Server;
        if ('diskSlotQuantity' in serverComponent && serverComponent.diskSlotQuantity) {
          details.push({ label: "Disk Bays", value: serverComponent.diskSlotQuantity });
        }
        // Controller count not in standard Disk type
        break;

      case ComponentType.Switch:
      case ComponentType.Router:
      case ComponentType.Firewall: {
        if (component.type === ComponentType.Switch) {
          const switchComponent = component as Switch;
          if (switchComponent.portCount) {
            details.push({ label: "Port Count", value: switchComponent.portCount });
          }
          if (switchComponent.portSpeed) {
            details.push({ label: "Port Speed", value: switchComponent.portSpeed });
          }
        } else if (component.type === ComponentType.Router) {
          const routerComponent = component as Router;
          if (routerComponent.portCount) {
            details.push({ label: "Port Count", value: routerComponent.portCount });
          }
          if (routerComponent.portSpeed) {
            details.push({ label: "Port Speed", value: `${routerComponent.portSpeed}G` });
          }
        } else if (component.type === ComponentType.Firewall) {
          const firewallComponent = component as Firewall;
          if (firewallComponent.portCount) {
            details.push({ label: "Port Count", value: firewallComponent.portCount });
          }
          if (firewallComponent.throughput) {
            details.push({ label: "Throughput", value: `${firewallComponent.throughput} Gbps` });
          }
        }
        break;
      }

      case ComponentType.Cable: {
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
      }

      case ComponentType.FiberPatchPanel:
      case ComponentType.CopperPatchPanel:
      case ComponentType.Cassette: {
        if (component.portCount) {
          details.push({ label: "Port Count", value: component.portCount });
        }
        if (component.type === ComponentType.CopperPatchPanel) {
          const copperPanel = component as CopperPatchPanel;
          if (copperPanel.frontPortType) {
            details.push({ label: "Port Type", value: copperPanel.frontPortType });
          }
        } else if (component.type === ComponentType.Cassette) {
          const cassette = component as Cassette;
          if (cassette.frontPortType) {
            details.push({ label: "Port Type", value: cassette.frontPortType });
          }
        }
        break;
      }
    }

    // Common technical details
    if (component.powerTypical) {
      details.push({ label: "Power", value: `${component.powerTypical}W` });
    } else if (component.powerPeak) {
      details.push({ label: "Power", value: `${component.powerPeak}W` });
    }
    if (component.ruSize) {
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
        selectedComponentId: ('templateId' in component && (component as InfrastructureComponent & { templateId?: string }).templateId) || component.id,
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
          {'notes' in component && (component as InfrastructureComponent & { notes?: string }).notes && (
            <div className="text-xs">
              <span className="text-muted-foreground">Notes:</span>
              <p className="mt-1 text-xs">{(component as InfrastructureComponent & { notes?: string }).notes}</p>
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