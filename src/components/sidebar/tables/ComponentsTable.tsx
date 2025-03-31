
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Pencil, Copy, Trash } from 'lucide-react';
import { InfrastructureComponent } from '@/types/infrastructure';

interface ComponentsTableProps {
  components: InfrastructureComponent[];
  isDefaultForTypeAndRole: (id: string) => boolean;
  onToggleDefault: (id: string, isDefault: boolean) => void;
  onEdit: (component: InfrastructureComponent) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ComponentsTable: React.FC<ComponentsTableProps> = ({
  components,
  isDefaultForTypeAndRole,
  onToggleDefault,
  onEdit,
  onClone,
  onDelete
}) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Manufacturer</TableHead>
            <TableHead>Model</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Power (W)</TableHead>
            <TableHead className="text-center">Default</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components.length > 0 ? (
            components.map((component) => (
              <TableRow key={component.id}>
                <TableCell className="font-medium">{component.name}</TableCell>
                <TableCell>{component.type}</TableCell>
                <TableCell>{component.manufacturer}</TableCell>
                <TableCell>{component.model}</TableCell>
                <TableCell className="text-right">${component.cost}</TableCell>
                <TableCell className="text-right">{component.powerRequired}W</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={isDefaultForTypeAndRole(component.id)}
                    onCheckedChange={(checked) => onToggleDefault(component.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(component)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onClone(component.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(component.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No components found matching your criteria
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
