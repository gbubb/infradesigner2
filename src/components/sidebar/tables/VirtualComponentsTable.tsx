import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VirtualTable, VirtualTableColumn } from '@/components/ui/virtual-table';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Pencil, Copy, Trash, Zap } from 'lucide-react';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCurrency, formatPower } from '@/lib/formatters';

interface VirtualComponentsTableProps {
  components: InfrastructureComponent[];
  isDefaultForTypeAndRole: (id: string) => boolean;
  onToggleDefault: (id: string, isDefault: boolean) => void;
  onEdit: (component: InfrastructureComponent) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
}

export const VirtualComponentsTable: React.FC<VirtualComponentsTableProps> = ({
  components,
  isDefaultForTypeAndRole,
  onToggleDefault,
  onEdit,
  onClone,
  onDelete
}) => {
  const navigate = useNavigate();

  const handlePowerPrediction = (component: InfrastructureComponent) => {
    navigate('/model', { 
      state: { 
        selectedTab: 'power',
        selectedComponentId: component.id 
      } 
    });
  };

  const columns: VirtualTableColumn<InfrastructureComponent>[] = useMemo(() => [
    {
      header: 'Name',
      accessor: 'name',
      className: 'font-medium',
    },
    {
      header: 'Type',
      accessor: 'type',
    },
    {
      header: 'Manufacturer',
      accessor: 'manufacturer',
    },
    {
      header: 'Model',
      accessor: 'model',
    },
    {
      header: 'Cost',
      accessor: (item) => formatCurrency(item.cost),
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      header: 'Power (W)',
      accessor: (item) => formatPower(item.powerRequired),
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      header: 'Default',
      accessor: (item) => (
        <div className="flex justify-center">
          <Switch
            checked={isDefaultForTypeAndRole(item.id)}
            onCheckedChange={(checked) => onToggleDefault(item.id, checked)}
          />
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      header: 'Actions',
      accessor: (item) => (
        <div className="flex justify-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onClone(item.id)}>
            <Copy className="h-4 w-4" />
          </Button>
          {item.type === ComponentType.Server && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => handlePowerPrediction(item)}>
                  <Zap className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Use in Power Prediction</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
    },
  ], [isDefaultForTypeAndRole, onToggleDefault, onEdit, onClone, onDelete, handlePowerPrediction]);

  return (
    <TooltipProvider>
      <VirtualTable
        data={components}
        columns={columns}
        getRowKey={(item) => item.id}
        emptyMessage="No components found matching your criteria"
        rowHeight={56}
        overscan={5}
      />
    </TooltipProvider>
  );
};