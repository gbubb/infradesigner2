import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComponentWithPlacement } from '@/types/design';

interface PowerConsumptionTableProps {
  components: ComponentWithPlacement[];
  operationalLoadPercentage: number;
}

interface DevicePowerBreakdown {
  category: string;
  deviceType: string;
  quantity: number;
  idlePower: number;
  typicalPower: number;
  peakPower: number;
  operationalPower: number;
  totalIdlePower: number;
  totalTypicalPower: number;
  totalPeakPower: number;
  totalOperationalPower: number;
}

export const PowerConsumptionTable: React.FC<PowerConsumptionTableProps> = ({
  components,
  operationalLoadPercentage
}) => {
  // Group components by type and calculate power consumption
  const powerBreakdown = React.useMemo(() => {
    const breakdown: Record<string, DevicePowerBreakdown> = {};

    components.forEach(component => {
      const quantity = component.quantity || 1;
      
      // Determine category based on component type and role
      let category = 'Other';
      if (component.type === 'compute') {
        category = 'Compute';
      } else if (component.type === 'storage') {
        category = 'Storage';
      } else if (component.type === 'network') {
        if (component.subType === 'router') {
          category = 'Router';
        } else if (component.subType === 'firewall') {
          category = 'Firewall';
        } else {
          category = 'Switch';
        }
      } else if (component.type === 'accessory') {
        category = 'Accessory';
      }

      const deviceType = component.name || 'Unknown Device';
      const key = `${category}-${deviceType}`;

      // Calculate power values
      let idlePower = 0;
      let typicalPower = 0;
      let peakPower = component.powerRequired || 0;
      let operationalPower = 0;

      if (component.powerIdle !== undefined && component.powerTypical !== undefined && component.powerPeak !== undefined 
          && (component.powerIdle > 0 || component.powerTypical > 0 || component.powerPeak > 0)) {
        // Use enhanced power values
        idlePower = component.powerIdle;
        typicalPower = component.powerTypical;
        peakPower = component.powerPeak;
        
        // Calculate operational power based on load percentage
        if (operationalLoadPercentage <= 10) {
          operationalPower = idlePower;
        } else if (operationalLoadPercentage <= 50) {
          const ratio = (operationalLoadPercentage - 10) / 40;
          operationalPower = idlePower + (typicalPower - idlePower) * ratio;
        } else if (operationalLoadPercentage <= 80) {
          const ratio = (operationalLoadPercentage - 50) / 30;
          operationalPower = typicalPower + (peakPower - typicalPower) * ratio;
        } else {
          operationalPower = peakPower;
        }
      } else {
        // Fallback to legacy calculation
        idlePower = peakPower / 3;
        typicalPower = peakPower * 0.5; // Assume typical is 50% of peak
        const remainingPower = peakPower - idlePower;
        const loadFactor = operationalLoadPercentage / 100;
        operationalPower = idlePower + (remainingPower * loadFactor);
      }

      if (breakdown[key]) {
        // Update existing entry
        breakdown[key].quantity += quantity;
        breakdown[key].totalIdlePower += idlePower * quantity;
        breakdown[key].totalTypicalPower += typicalPower * quantity;
        breakdown[key].totalPeakPower += peakPower * quantity;
        breakdown[key].totalOperationalPower += operationalPower * quantity;
      } else {
        // Create new entry
        breakdown[key] = {
          category,
          deviceType,
          quantity,
          idlePower,
          typicalPower,
          peakPower,
          operationalPower,
          totalIdlePower: idlePower * quantity,
          totalTypicalPower: typicalPower * quantity,
          totalPeakPower: peakPower * quantity,
          totalOperationalPower: operationalPower * quantity
        };
      }
    });

    // Convert to array and sort by category and device type
    return Object.values(breakdown).sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.deviceType.localeCompare(b.deviceType);
    });
  }, [components, operationalLoadPercentage]);

  // Helper function to format power values
  const formatPower = (watts: number) => {
    if (watts >= 10000) {
      return `${(watts / 1000).toFixed(1)} kW`;
    }
    return `${Math.round(watts)} W`;
  };

  // Calculate totals
  const totals = React.useMemo(() => {
    return powerBreakdown.reduce((acc, item) => {
      acc.totalIdlePower += item.totalIdlePower;
      acc.totalTypicalPower += item.totalTypicalPower;
      acc.totalPeakPower += item.totalPeakPower;
      acc.totalOperationalPower += item.totalOperationalPower;
      return acc;
    }, {
      totalIdlePower: 0,
      totalTypicalPower: 0,
      totalPeakPower: 0,
      totalOperationalPower: 0
    });
  }, [powerBreakdown]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Power Consumption Breakdown by Device</h4>
        <span className="text-xs text-muted-foreground">
          Operational Load: {operationalLoadPercentage}%
        </span>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Device Type</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right">Idle (per unit)</TableHead>
              <TableHead className="text-right">Typical (per unit)</TableHead>
              <TableHead className="text-right">Peak (per unit)</TableHead>
              <TableHead className="text-right">Total Idle</TableHead>
              <TableHead className="text-right">Total Typical</TableHead>
              <TableHead className="text-right">Total Peak</TableHead>
              <TableHead className="text-right font-medium">Total Operational</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {powerBreakdown.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.category}</TableCell>
                <TableCell>{item.deviceType}</TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right text-sm">{formatPower(item.idlePower)}</TableCell>
                <TableCell className="text-right text-sm">{formatPower(item.typicalPower)}</TableCell>
                <TableCell className="text-right text-sm">{formatPower(item.peakPower)}</TableCell>
                <TableCell className="text-right">{formatPower(item.totalIdlePower)}</TableCell>
                <TableCell className="text-right">{formatPower(item.totalTypicalPower)}</TableCell>
                <TableCell className="text-right">{formatPower(item.totalPeakPower)}</TableCell>
                <TableCell className="text-right font-medium bg-green-50">{formatPower(item.totalOperationalPower)}</TableCell>
              </TableRow>
            ))}
            {powerBreakdown.length > 0 && (
              <TableRow className="font-medium bg-gray-50">
                <TableCell colSpan={6} className="text-right">Total:</TableCell>
                <TableCell className="text-right">{formatPower(totals.totalIdlePower)}</TableCell>
                <TableCell className="text-right">{formatPower(totals.totalTypicalPower)}</TableCell>
                <TableCell className="text-right">{formatPower(totals.totalPeakPower)}</TableCell>
                <TableCell className="text-right bg-green-100">{formatPower(totals.totalOperationalPower)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};