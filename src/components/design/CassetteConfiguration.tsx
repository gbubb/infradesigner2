
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDesignStore } from '@/store/designStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComponentType, ConnectorType } from '@/types/infrastructure';

interface CassetteConfigurationProps {
  roleId: string;
}

export const CassetteConfiguration: React.FC<CassetteConfigurationProps> = ({ roleId }) => {
  const {
    componentTemplates,
    selectedCassettesByRole,
    addCassetteToPanel,
    removeCassetteFromPanel,
    componentRoles
  } = useDesignStore();

  const [selectedCassetteId, setSelectedCassetteId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const cassettes = componentTemplates.filter(
    c => c.type === ComponentType.Cassette
  );

  const role = componentRoles.find(r => r.id === roleId);
  const assignedPanel = role?.assignedComponentId 
    ? componentTemplates.find(c => c.id === role.assignedComponentId)
    : null;

  const cassetteSlots = assignedPanel?.cassetteCapacity || 0;
  
  const currentCassettes = selectedCassettesByRole[roleId] || [];
  const usedSlots = currentCassettes.reduce((total, item) => total + item.quantity, 0);
  const availableSlots = Math.max(0, cassetteSlots - usedSlots);

  // For port summary calculation
  const portSummary = currentCassettes.reduce((summary, cassetteItem) => {
    const cassette = componentTemplates.find(c => c.id === cassetteItem.cassetteId);
    if (cassette) {
      const portType = (cassette as any).portType || 'Unknown';
      const portQuantity = (cassette as any).portQuantity || 0;
      const totalPorts = portQuantity * cassetteItem.quantity;
      
      if (summary[portType]) {
        summary[portType] += totalPorts;
      } else {
        summary[portType] = totalPorts;
      }
    }
    return summary;
  }, {} as Record<string, number>);

  const handleAddCassette = () => {
    if (selectedCassetteId && quantity > 0) {
      const actualQuantity = Math.min(quantity, availableSlots);
      if (actualQuantity > 0) {
        addCassetteToPanel(roleId, selectedCassetteId, actualQuantity);
        setSelectedCassetteId('');
        setQuantity(1);
      }
    }
  };

  const getPortTypeLabel = (portType: string): string => {
    switch (portType) {
      case ConnectorType.RJ45: return 'RJ45';
      case ConnectorType.MPO12: return 'MPO-12';
      case ConnectorType.LC: return "LC";
      case ConnectorType.SFP: return 'SFP';
      case ConnectorType.QSFP: return 'QSFP';
      default: return portType;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">
        Cassettes ({usedSlots}/{cassetteSlots} slots used)
      </div>
      
      {availableSlots > 0 ? (
        <div className="flex items-end gap-3">
          <div className="flex-grow">
            <Label htmlFor="cassette-select">Cassette Type</Label>
            <Select
              value={selectedCassetteId}
              onValueChange={setSelectedCassetteId}
            >
              <SelectTrigger id="cassette-select">
                <SelectValue placeholder="Select cassette" />
              </SelectTrigger>
              <SelectContent>
                {cassettes.map(cassette => (
                  <SelectItem key={cassette.id} value={cassette.id}>
                    {cassette.name} ({(cassette as any).portQuantity}x {getPortTypeLabel((cassette as any).portType)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={availableSlots}
              value={quantity}
              onChange={(e) => setQuantity(Math.min(parseInt(e.target.value) || 1, availableSlots))}
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleAddCassette}
            disabled={!selectedCassetteId}
            className="h-10 w-10"
          >
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>
      ) : (
        <div className="text-sm text-amber-500">
          No more cassette slots available in this panel.
        </div>
      )}
      
      {currentCassettes.length > 0 && (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cassette</TableHead>
                <TableHead>Port Type</TableHead>
                <TableHead>Ports/Cassette</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Total Ports</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCassettes.map((item) => {
                const cassette = componentTemplates.find(c => c.id === item.cassetteId);
                if (!cassette) return null;
                const portType = (cassette as any).portType || 'Unknown';
                
                return (
                  <TableRow key={item.cassetteId}>
                    <TableCell>{cassette.name}</TableCell>
                    <TableCell>{getPortTypeLabel(portType)}</TableCell>
                    <TableCell>{(cassette as any).portQuantity || 0}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.quantity * ((cassette as any).portQuantity || 0)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCassetteFromPanel(roleId, item.cassetteId)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          <div className="rounded-md border p-4">
            <div className="font-medium mb-2">Port Summary</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Port Type</TableHead>
                  <TableHead>Total Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(portSummary).map(([portType, count]) => (
                  <TableRow key={portType}>
                    <TableCell>{getPortTypeLabel(portType)}</TableCell>
                    <TableCell>{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      
      {currentCassettes.length === 0 && (
        <div className="text-sm text-muted-foreground italic">
          No cassettes added. Add cassettes to provide ports.
        </div>
      )}
    </div>
  );
};
