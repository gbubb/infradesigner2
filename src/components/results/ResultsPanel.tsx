
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDesignStore } from '@/store/designStore';

export const ResultsPanel: React.FC = () => {
  const { requirements, placedComponents } = useDesignStore();
  
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Design Results</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Resource Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Compute:</span>
                <span className="font-medium">{requirements.computeRequirements.totalVCPUs || 0} vCPUs, {(requirements.computeRequirements.totalMemoryTB || 0).toFixed(2)} TB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Storage:</span>
                <span className="font-medium">{requirements.storageRequirements.totalCapacityTB || 0} TiB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required Racks:</span>
                <span className="font-medium">{requirements.physicalConstraints.availableRacks || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Cost Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Cost:</span>
                <span className="font-medium">$0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost per vCPU:</span>
                <span className="font-medium">$0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost per TB:</span>
                <span className="font-medium">$0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Required Components</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Total Power (W)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Servers</TableCell>
                <TableCell>0</TableCell>
                <TableCell>$0</TableCell>
                <TableCell>0 W</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Network Equipment</TableCell>
                <TableCell>0</TableCell>
                <TableCell>$0</TableCell>
                <TableCell>0 W</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Storage</TableCell>
                <TableCell>0</TableCell>
                <TableCell>$0</TableCell>
                <TableCell>0 W</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
