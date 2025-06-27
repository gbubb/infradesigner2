import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { Server } from '@/types/infrastructure/server-types';
import { PowerCalculationResult } from './powerCalculations';
import { saveComponent } from '@/services/componentService';
import { useDesignStore } from '@/store/designStore';
import { toast } from 'sonner';

interface PowerValuesPushCardProps {
  selectedServer: Server;
  calculationResult: PowerCalculationResult;
}

export const PowerValuesPushCard: React.FC<PowerValuesPushCardProps> = ({
  selectedServer,
  calculationResult
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { loadComponentsFromDB } = useDesignStore();

  // Get current power values from the selected server
  const currentValues = {
    idle: selectedServer.powerIdle || 0,
    typical: selectedServer.powerTypical || selectedServer.powerRequired || 0,
    peak: selectedServer.powerPeak || 0
  };

  // Get calculated power values
  const calculatedValues = {
    idle: calculationResult.idlePowerW,
    typical: calculationResult.averagePowerW,
    peak: calculationResult.peakPowerW
  };

  // Check if values are different
  const hasChanges = 
    Math.abs(currentValues.idle - calculatedValues.idle) > 1 ||
    Math.abs(currentValues.typical - calculatedValues.typical) > 1 ||
    Math.abs(currentValues.peak - calculatedValues.peak) > 1;

  // Check if current values exist
  const hasCurrentValues = currentValues.idle > 0 || currentValues.typical > 0 || currentValues.peak > 0;

  const handlePushValues = async () => {
    setIsUpdating(true);
    try {
      // Create updated server component with new power values
      const updatedServer: Server = {
        ...selectedServer,
        powerIdle: calculatedValues.idle,
        powerTypical: calculatedValues.typical,
        powerPeak: calculatedValues.peak
      };

      // Save the updated component
      const success = await saveComponent(updatedServer);
      
      if (success) {
        toast.success('Power values updated successfully');
        // Refresh the component templates to reflect the changes
        await loadComponentsFromDB();
      } else {
        toast.error('Failed to update power values');
      }
    } catch (error) {
      console.error('Error updating power values:', error);
      toast.error('An error occurred while updating power values');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Power Values Update
        </CardTitle>
        <CardDescription>
          Compare current component power values with calculated values and update the component if needed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current vs Calculated Values Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Power State</TableHead>
              <TableHead className="text-right">Current (W)</TableHead>
              <TableHead className="text-right">Calculated (W)</TableHead>
              <TableHead className="text-right">Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Idle</TableCell>
              <TableCell className="text-right">
                {hasCurrentValues ? currentValues.idle : (
                  <Badge variant="secondary" className="text-xs">Not set</Badge>
                )}
              </TableCell>
              <TableCell className="text-right font-medium text-green-600">
                {calculatedValues.idle}
              </TableCell>
              <TableCell className="text-right">
                {hasCurrentValues ? (
                  <Badge 
                    variant={Math.abs(currentValues.idle - calculatedValues.idle) > 1 ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {currentValues.idle > calculatedValues.idle ? '+' : ''}
                    {Math.round(currentValues.idle - calculatedValues.idle)}W
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">New</Badge>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Typical</TableCell>
              <TableCell className="text-right">
                {hasCurrentValues ? currentValues.typical : (
                  <Badge variant="secondary" className="text-xs">Not set</Badge>
                )}
              </TableCell>
              <TableCell className="text-right font-medium text-green-600">
                {calculatedValues.typical}
              </TableCell>
              <TableCell className="text-right">
                {hasCurrentValues ? (
                  <Badge 
                    variant={Math.abs(currentValues.typical - calculatedValues.typical) > 1 ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {currentValues.typical > calculatedValues.typical ? '+' : ''}
                    {Math.round(currentValues.typical - calculatedValues.typical)}W
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">New</Badge>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Peak</TableCell>
              <TableCell className="text-right">
                {hasCurrentValues ? currentValues.peak : (
                  <Badge variant="secondary" className="text-xs">Not set</Badge>
                )}
              </TableCell>
              <TableCell className="text-right font-medium text-green-600">
                {calculatedValues.peak}
              </TableCell>
              <TableCell className="text-right">
                {hasCurrentValues ? (
                  <Badge 
                    variant={Math.abs(currentValues.peak - calculatedValues.peak) > 1 ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {currentValues.peak > calculatedValues.peak ? '+' : ''}
                    {Math.round(currentValues.peak - calculatedValues.peak)}W
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">New</Badge>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Status Alert */}
        {!hasCurrentValues ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This component doesn't have power values set yet. The calculated values will be added as new power consumption data.
            </AlertDescription>
          </Alert>
        ) : !hasChanges ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Current power values match the calculated values. No update needed.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Calculated power values differ from current component values. Consider updating the component with the calculated values.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          <Button
            onClick={handlePushValues}
            disabled={isUpdating || (!hasChanges && hasCurrentValues)}
            className="gap-2"
          >
            {isUpdating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Updating...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                {hasCurrentValues ? 'Update Power Values' : 'Set Power Values'}
              </>
            )}
          </Button>
        </div>

        {/* Component Info */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <div className="font-medium mb-1">Component Details:</div>
          <div>{selectedServer.manufacturer} {selectedServer.model}</div>
          <div>ID: {selectedServer.id}</div>
        </div>
      </CardContent>
    </Card>
  );
}; 