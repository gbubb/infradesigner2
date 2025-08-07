import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, AlertTriangle, AlertCircle, ChevronDown } from 'lucide-react';
import { formatPower } from '@/lib/formatters';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useDesignStore } from '@/store/designStore';
import { ComponentType, componentTypeToCategory } from '@/types/infrastructure/component-types';
import type { InfrastructureComponent } from '@/types/infrastructure';

interface RackPowerStats {
  idlePower: number;
  typicalPower: number;
  peakPower: number;
  powerByType: Record<ComponentType, { idle: number; typical: number; peak: number; count: number }>;
  powerByComponent: Array<{ 
    name: string; 
    type: ComponentType; 
    manufacturer: string;
    model: string;
    idle: number; 
    typical: number; 
    peak: number; 
  }>;
  componentsWithoutPower: Array<{ name: string; type: ComponentType }>;
  totalDevices: number;
}

interface RackPowerCardProps {
  rackProfileId: string;
  powerCapacity: number; // From requirements (watts)
}

type PowerState = 'idle' | 'typical' | 'peak';

const COLORS = {
  [ComponentType.Server]: '#8884d8',
  [ComponentType.Switch]: '#82ca9d',
  [ComponentType.Router]: '#ffc658',
  [ComponentType.Firewall]: '#ff7c7c',
  [ComponentType.Disk]: '#8dd1e1',
  [ComponentType.GPU]: '#d084d0',
  [ComponentType.PDU]: '#ffb347',
  [ComponentType.FiberPatchPanel]: '#67b7dc',
  [ComponentType.CopperPatchPanel]: '#a4de6c',
  [ComponentType.Cassette]: '#ffd93d',
  [ComponentType.Cable]: '#6c5ce7',
  [ComponentType.FiberCable]: '#a29bfe',
  [ComponentType.CopperCable]: '#fd79a8',
  [ComponentType.Transceiver]: '#00b894'
};


export const RackPowerCard: React.FC<RackPowerCardProps> = ({ rackProfileId, powerCapacity }) => {
  const [selectedPowerState, setSelectedPowerState] = useState<PowerState>('peak');
  const [popoverPowerState, setPopoverPowerState] = useState<PowerState>('peak');
  
  const { activeDesign, componentTemplates } = useDesignStore();
  
  // Create a dependency key that changes when rack devices change
  const rackDevicesKey = useMemo(() => {
    const rack = activeDesign?.rackprofiles?.find(r => r.id === rackProfileId);
    return `${rack?.devices?.length || 0}-${rack?.devices?.map(d => d.deviceId).join(',') || ''}`;
  }, [activeDesign?.rackprofiles, rackProfileId]);
  
  // Calculate power statistics for the rack
  const rackPowerStats = useMemo<RackPowerStats | null>(() => {
    if (!activeDesign?.rackprofiles || !rackProfileId || !activeDesign?.components) return null;
    
    const rack = activeDesign.rackprofiles.find(r => r.id === rackProfileId);
    if (!rack || !rack.devices || rack.devices.length === 0) {
      return {
        idlePower: 0,
        typicalPower: 0,
        peakPower: 0,
        powerByType: {},
        powerByComponent: [],
        componentsWithoutPower: [],
        totalDevices: 0
      };
    }
    
    let idlePower = 0;
    let typicalPower = 0;
    let peakPower = 0;
    const powerByType: Partial<Record<ComponentType, { idle: number; typical: number; peak: number; count: number }>> = {};
    const powerByComponent: Array<{ 
      name: string; 
      type: ComponentType; 
      manufacturer: string;
      model: string;
      idle: number; 
      typical: number; 
      peak: number; 
    }> = [];
    const componentsWithoutPower: Array<{ name: string; type: ComponentType }> = [];
    let totalDevices = 0;
    
    rack.devices.forEach(device => {
      // Find the component by its deviceId - first in components, then in templates
      let component = activeDesign.components.find(c => c.id === device.deviceId);
      
      // If not found in components, check componentTemplates
      if (!component) {
        component = componentTemplates?.find(c => c.id === device.deviceId);
      }
      
      if (component) {
        totalDevices++;
        
        // Check if component has all power fields
        const hasCompletePowerData = 
          component.powerIdle !== undefined && 
          component.powerTypical !== undefined && 
          component.powerPeak !== undefined &&
          (component.powerIdle > 0 || component.powerTypical > 0 || component.powerPeak > 0);
        
        if (!hasCompletePowerData && component.powerTypical === undefined) {
          componentsWithoutPower.push({
            name: component.name || 'Unknown',
            type: component.type as ComponentType
          });
        }
        
        // Calculate power values
        let deviceIdlePower = 0;
        let deviceTypicalPower = 0;
        let devicePeakPower = 0;
        
        if (hasCompletePowerData) {
          deviceIdlePower = component.powerIdle || 0;
          deviceTypicalPower = component.powerTypical || 0;
          devicePeakPower = component.powerPeak || 0;
        } else if (component.powerTypical) {
          // Use powerTypical if only that field is available
          const basePower = component.powerTypical || 0;
          deviceTypicalPower = basePower;
          deviceIdlePower = basePower * 0.5; // Assume idle is 50% of typical
          devicePeakPower = basePower * 1.67; // Assume peak is 167% of typical
        }
        
        // Each placed device represents one unit in the rack
        const quantity = 1;
        
        idlePower += deviceIdlePower * quantity;
        typicalPower += deviceTypicalPower * quantity;
        peakPower += devicePeakPower * quantity;
        
        // Add to component breakdown - include all components regardless of power
        // This ensures switches and other components appear even with 0W power
        powerByComponent.push({
          name: component.name || 'Unknown',
          type: component.type as ComponentType,
          manufacturer: component.manufacturer || '',
          model: component.model || '',
          idle: deviceIdlePower,
          typical: deviceTypicalPower,
          peak: devicePeakPower
        });
        
        // Aggregate by type
        const componentType = component.type as ComponentType;
        if (!powerByType[componentType]) {
          powerByType[componentType] = { idle: 0, typical: 0, peak: 0, count: 0 };
        }
        powerByType[componentType].idle += deviceIdlePower * quantity;
        powerByType[componentType].typical += deviceTypicalPower * quantity;
        powerByType[componentType].peak += devicePeakPower * quantity;
        powerByType[componentType].count += quantity;
      }
    });
    
    return {
      idlePower,
      typicalPower,
      peakPower,
      powerByType,
      powerByComponent,
      componentsWithoutPower,
      totalDevices
    };
  }, [activeDesign?.rackprofiles, activeDesign?.components, componentTemplates, rackProfileId]);
  
  // Get current power based on selected state
  const getCurrentPower = (stats: RackPowerStats | null, state: PowerState) => {
    if (!stats) return 0;
    switch (state) {
      case 'idle': return stats.idlePower;
      case 'typical': return stats.typicalPower;
      case 'peak': return stats.peakPower;
    }
  };
  
  const currentPower = getCurrentPower(rackPowerStats, selectedPowerState);
  const utilizationPercentage = powerCapacity > 0 ? (currentPower / powerCapacity) * 100 : 0;
  
  // Determine color based on utilization
  const getUtilizationColor = (percentage: number) => {
    if (percentage < 60) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Prepare data for component breakdown - group identical components
  const componentBreakdownData = useMemo(() => {
    if (!rackPowerStats) return [];
    
    // Group identical components
    const groupedComponents = new Map<string, {
      name: string;
      type: ComponentType;
      manufacturer: string;
      model: string;
      count: number;
      powerPerUnit: number;
      totalPower: number;
    }>();
    
    rackPowerStats.powerByComponent.forEach(comp => {
      // Remove numeric suffix from component name for grouping
      const baseName = comp.name.replace(/-\d+$/, '');
      const key = `${baseName}-${comp.manufacturer}-${comp.model}`;
      const powerValue = comp[popoverPowerState];
      
      // Include all components, even those with 0W power
      if (groupedComponents.has(key)) {
        const existing = groupedComponents.get(key)!;
        existing.count += 1;
        existing.totalPower += powerValue;
      } else {
        groupedComponents.set(key, {
          name: baseName,
          type: comp.type,
          manufacturer: comp.manufacturer,
          model: comp.model,
          count: 1,
          powerPerUnit: powerValue,
          totalPower: powerValue
        });
      }
    });
    
    // Convert to array and sort by total power
    return Array.from(groupedComponents.values())
      .sort((a, b) => b.totalPower - a.totalPower);
  }, [rackPowerStats, popoverPowerState]);
  
  // Calculate average device power and additional devices possible
  const { averageDevicePower, additionalDevicesPossible } = useMemo(() => {
    if (!rackPowerStats || rackPowerStats.totalDevices === 0) {
      return { averageDevicePower: 0, additionalDevicesPossible: 0 };
    }
    
    const avgPower = getCurrentPower(rackPowerStats, popoverPowerState) / rackPowerStats.totalDevices;
    const remainingPower = powerCapacity - getCurrentPower(rackPowerStats, 'peak');
    const additionalByPower = remainingPower > 0 ? Math.floor(remainingPower / avgPower) : 0;
    
    // Get available RU from rack stats if available
    const rack = activeDesign?.rackprofiles?.find(r => r.id === rackProfileId);
    const totalRU = rack?.uHeight || 42;
    const usedRU = rack?.devices?.reduce((sum, device) => {
      let component = activeDesign?.components?.find(c => c.id === device.deviceId);
      if (!component) {
        component = componentTemplates?.find(c => c.id === device.deviceId);
      }
      const deviceRU = component?.ruSize || 1;
      return sum + deviceRU;
    }, 0) || 0;
    const availableRU = totalRU - usedRU;
    
    // Assume average device is 2RU
    const additionalBySpace = Math.floor(availableRU / 2);
    
    return {
      averageDevicePower: avgPower,
      additionalDevicesPossible: Math.min(additionalByPower, additionalBySpace)
    };
  }, [rackPowerStats, popoverPowerState, powerCapacity, activeDesign?.rackprofiles, activeDesign?.components, componentTemplates, rackProfileId]);
  
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Rack Power
        </h3>
        
        {rackPowerStats ? (
          <div className="space-y-4">
            {/* Power state selector */}
            <Select value={selectedPowerState} onValueChange={(value) => setSelectedPowerState(value as PowerState)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="idle">Idle Power</SelectItem>
                <SelectItem value="typical">Typical Power</SelectItem>
                <SelectItem value="peak">Peak Power</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Power warnings */}
            {utilizationPercentage > 100 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Critical: Power consumption exceeds rack capacity!
                </AlertDescription>
              </Alert>
            )}
            {utilizationPercentage > 80 && utilizationPercentage <= 100 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: Power consumption above 80% of capacity
                </AlertDescription>
              </Alert>
            )}
            
            {/* Progress bar for power utilization */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`${getUtilizationColor(utilizationPercentage)} h-2.5 rounded-full transition-all duration-300`} 
                style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
              />
            </div>
            
            {/* Numerical display */}
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatPower(currentPower)} / {formatPower(powerCapacity)}
              </div>
              <div className="text-sm text-muted-foreground">
                {utilizationPercentage.toFixed(1)}% Utilization
              </div>
            </div>
            
            {/* Power breakdown popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1">
                  View Power Breakdown
                  <ChevronDown className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px]">
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Power Breakdown by Component</h4>
                  
                  {/* Power state selector in popover */}
                  <Select value={popoverPowerState} onValueChange={(value) => setPopoverPowerState(value as PowerState)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idle">Idle Power</SelectItem>
                      <SelectItem value="typical">Typical Power</SelectItem>
                      <SelectItem value="peak">Peak Power</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Component list with grouping */}
                  {componentBreakdownData.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white border-b">
                          <tr>
                            <th className="text-left py-2">Component</th>
                            <th className="text-center py-2">Qty</th>
                            <th className="text-right py-2">Per Unit</th>
                            <th className="text-right py-2">Total</th>
                            <th className="text-right py-2">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {componentBreakdownData.map((item, index) => {
                            const currentTotalPower = getCurrentPower(rackPowerStats, popoverPowerState);
                            const percentage = currentTotalPower > 0 ? (item.totalPower / currentTotalPower) * 100 : 0;
                            const displayName = `${item.name} (${item.manufacturer} ${item.model})`.trim();
                            return (
                              <tr key={index} className="border-b">
                                <td className="py-2 pr-2">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded" 
                                      style={{ backgroundColor: COLORS[item.type] || '#666' }}
                                    />
                                    <span className="truncate max-w-[250px]" title={displayName}>
                                      {displayName}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-center py-2">{item.count}</td>
                                <td className="text-right py-2">{formatPower(item.powerPerUnit)}</td>
                                <td className="text-right py-2 font-medium">{formatPower(item.totalPower)}</td>
                                <td className="text-right py-2">{percentage > 0 ? `${percentage.toFixed(1)}%` : '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-t-2">
                          <tr>
                            <td className="py-2 font-medium">Total</td>
                            <td className="text-center py-2 font-medium">{rackPowerStats.totalDevices}</td>
                            <td className="text-right py-2">-</td>
                            <td className="text-right py-2 font-medium">
                              {formatPower(getCurrentPower(rackPowerStats, popoverPowerState))}
                            </td>
                            <td className="text-right py-2 font-medium">100%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No power data available
                    </div>
                  )}
                  
                  {/* Metrics */}
                  <div className="space-y-2 text-sm border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Device Power:</span>
                      <span className="font-medium">{formatPower(averageDevicePower)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Additional Average Devices Possible:</span>
                      <span className="font-medium">{additionalDevicesPossible}</span>
                    </div>
                  </div>
                  
                  {/* Components without power data */}
                  {rackPowerStats.componentsWithoutPower.length > 0 && (
                    <div className="space-y-2 border-t pt-4">
                      <h5 className="font-medium text-sm text-orange-600">Components with Incomplete Power Data:</h5>
                      <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                        {rackPowerStats.componentsWithoutPower.map((comp, index) => (
                          <li key={index} className="text-muted-foreground">
                            • {comp.name} ({comp.type})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <p className="text-muted-foreground">No power data available</p>
        )}
      </CardContent>
    </Card>
  );
};