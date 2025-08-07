import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComponentWithPlacement } from '@/types/service-types';
import { ComponentType, componentTypeToCategory } from '@/types/infrastructure/component-types';
import { formatPower } from '@/lib/formatters';

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

const PowerConsumptionTableComponent: React.FC<PowerConsumptionTableProps> = ({
  components,
  operationalLoadPercentage
}) => {
  // Group components by type and calculate power consumption
  const powerBreakdown = React.useMemo(() => {
    const breakdown: Record<string, DevicePowerBreakdown> = {};

    components.forEach(component => {
      const quantity = component.quantity || 1;
      
      // Determine category and device type based on component type and role
      const componentCategory = componentTypeToCategory[component.type];
      const category = componentCategory || 'Other';
      let deviceType = 'Unknown Device';
      
      // Determine device type based on component type and role
      switch (component.type) {
        case ComponentType.Server:
          if (component.role === 'computeNode') {
            deviceType = 'Compute Node';
          } else if (component.role === 'gpuNode') {
            deviceType = 'GPU Node';
          } else if (component.role === 'hyperConvergedNode') {
            deviceType = 'Hyper-Converged Node';
          } else {
            deviceType = 'Server';
          }
          break;
          
        case ComponentType.Disk:
          if (component.role === 'storageNode') {
            deviceType = 'Storage Node';
          } else if (component.role === 'storageController') {
            deviceType = 'Storage Controller';
          } else {
            deviceType = 'Storage Device';
          }
          break;
          
        case ComponentType.Switch:
          if (component.role === 'spineSwitch') {
            deviceType = 'Spine Switch';
          } else if (component.role === 'leafSwitch') {
            deviceType = 'Leaf Switch';
          } else if (component.role === 'borderLeafSwitch') {
            deviceType = 'Border Leaf Switch';
          } else if (component.role === 'coreSwitch') {
            deviceType = 'Core Switch';
          } else if (component.role === 'managementSwitch') {
            deviceType = 'Management Switch';
          } else if (component.role === 'storageSwitch') {
            deviceType = 'Storage Switch';
          } else {
            deviceType = 'Network Switch';
          }
          break;
          
        case ComponentType.Router:
          deviceType = 'Router';
          break;
          
        case ComponentType.Firewall:
          deviceType = 'Firewall';
          break;
          
        case ComponentType.GPU:
          deviceType = 'GPU';
          break;
          
        case ComponentType.Transceiver:
          deviceType = 'Transceiver';
          break;
          
        case ComponentType.PDU:
          deviceType = 'PDU';
          break;
          
        default:
          deviceType = component.type;
      }

      // Create a key based on component type and role
      const key = `${component.type}-${component.role || 'default'}`;

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

export const PowerConsumptionTable = React.memo(PowerConsumptionTableComponent);