
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Cable as CableIcon } from 'lucide-react';
import { ComponentType, InfrastructureComponent, FiberPatchPanel, CopperPatchPanel, Cassette, Cable } from '@/types/infrastructure';
import { BomItemHoverCard } from './BomItemHoverCard';
import { CableLineItem } from './networkBomUtils';
import { useCurrency } from '@/hooks/useCurrency';
import { formatCurrency } from '@/lib/formatters';

interface CablingTableProps {
  summarizedComponentsByCategory: Record<string, (InfrastructureComponent & { summarizedQuantity: number })[]>;
  cableLineItems: Record<string, CableLineItem>;
  getBomGroupKey: (component: InfrastructureComponent) => string;
  onExport: (category: string) => void;
  componentTemplates?: InfrastructureComponent[];
}

const CablingTableComponent: React.FC<CablingTableProps> = ({
  summarizedComponentsByCategory,
  cableLineItems,
  getBomGroupKey,
  onExport,
  componentTemplates = []
}) => {
  const currency = useCurrency();

  // Helper to find cable template
  const getCableTemplate = (cableTemplateId: string | undefined) => {
    if (!cableTemplateId) return null;
    return componentTemplates.find(c => c.id === cableTemplateId && c.type === ComponentType.Cable);
  };

  return (
  <div>
    <div className="flex flex-row items-center justify-between mb-2">
      <h2 className="text-lg font-semibold">Cabling Components</h2>
      <Button onClick={() => onExport('Cabling')} variant="ghost" size="sm">
        <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Cabling
      </Button>
    </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Manufacturer</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Unit Cost</TableHead>
          <TableHead className="text-right">Total Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Standard Cabling Inventory */}
        {[...(summarizedComponentsByCategory['Cabling'] || []), ...(summarizedComponentsByCategory['Cables'] || [])].map((component) => {
          const quantity = component.summarizedQuantity;
          const totalCost = component.cost * quantity;
          let details = '-';
          if (component.type === ComponentType.FiberPatchPanel) {
            const fiberPanel = component as unknown as FiberPatchPanel;
            details = `${component.ruSize}RU, ${fiberPanel.cassetteCapacity} cassettes`;
          }
          else if (component.type === ComponentType.CopperPatchPanel) {
            const copperPanel = component as unknown as CopperPatchPanel;
            details = `${component.ruSize}RU, ${copperPanel.portQuantity} ports`;
          }
          else if (component.type === ComponentType.Cassette) {
            const cassette = component as unknown as Cassette;
            details = `${cassette.portType}, ${cassette.portQuantity} ports`;
          }
          else if (component.type === ComponentType.Cable) {
            const cable = component as unknown as Cable;
            details = `${cable.length}m, ${cable.connectorA_Type} to ${cable.connectorB_Type}, ${cable.mediaType}`;
          }
          return (
            <BomItemHoverCard key={`cabling-${getBomGroupKey(component)}`} component={component}>
              <TableRow className="cursor-pointer">
                <TableCell>{component.type}</TableCell>
                <TableCell>{component.manufacturer}</TableCell>
                <TableCell>{component.model}</TableCell>
                <TableCell>{details}</TableCell>
                <TableCell className="text-right">{quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(component.cost, currency)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalCost, currency)}</TableCell>
              </TableRow>
            </BomItemHoverCard>
          );
        })}
        {/* Cable Line Items (from Network Connections) */}
        {Object.values(cableLineItems).map((item: CableLineItem, idx: number) => {
          const cableTemplate = getCableTemplate(item.cableTemplateId);
          const rowContent = (
            <TableRow className={cableTemplate ? "cursor-pointer" : ""}>
              <TableCell>
                <CableIcon className="inline-block mr-1" size={16}/>
                {item.cableType}
              </TableCell>
              <TableCell>{item.manufacturer}</TableCell>
              <TableCell>{item.model}</TableCell>
              <TableCell>{item.connectorTypes}, {item.lengthMeters}m</TableCell>
              <TableCell className="text-right">{item.count}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.costPer, currency)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total, currency)}</TableCell>
            </TableRow>
          );
          
          if (cableTemplate) {
            return (
              <BomItemHoverCard key={`cableline-${item.cableTemplateId}-${item.lengthMeters}-${idx}`} component={cableTemplate}>
                {rowContent}
              </BomItemHoverCard>
            );
          }
          
          return <React.Fragment key={`cableline-${item.cableTemplateId}-${item.lengthMeters}-${idx}`}>{rowContent}</React.Fragment>;
        })}
      </TableBody>
    </Table>
  </div>
  );
};

export const CablingTable = React.memo(CablingTableComponent);
export default CablingTable;
