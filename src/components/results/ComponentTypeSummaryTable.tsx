
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InfrastructureComponent } from '@/types/infrastructure';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartPie } from 'lucide-react';
import { ChartTooltipProps } from '@/types/component-types';

interface ComponentTypeSummaryTableProps {
  componentsByType: Record<string, InfrastructureComponent[]>;
}

// Define consistent colors for component types
const COLORS = {
  server: '#4299E1', 
  storage: '#ED8936',
  switch: '#48BB78',
  firewall: '#F56565',
  disk: '#805AD5',
  gpu: '#ECC94B',
  other: '#CBD5E0'
};

export const ComponentTypeSummaryTable: React.FC<ComponentTypeSummaryTableProps> = ({ componentsByType }) => {
  // Calculate totals and prepare data for charts
  const typeData = React.useMemo(() => {
    return Object.entries(componentsByType).map(([type, components]) => {
      const totalTypeQuantity = components.reduce((sum, comp) => sum + (comp.quantity || 1), 0);
      const totalTypeCost = components.reduce((sum, comp) => sum + ((comp.cost || 0) * (comp.quantity || 1)), 0);
      const totalTypePower = components.reduce((sum, comp) => sum + ((comp.powerTypical || 0) * (comp.quantity || 1)), 0);
      
      const totalTypeRU = components.reduce((sum, comp) => {
        if ('ruSize' in comp && comp.ruSize) {
          return sum + (comp.ruSize * (comp.quantity || 1));
        }
        return sum;
      }, 0);
      
      return {
        type: type.charAt(0).toUpperCase() + type.slice(1),
        quantity: totalTypeQuantity,
        cost: isFinite(totalTypeCost) ? totalTypeCost : 0,
        power: isFinite(totalTypePower) ? totalTypePower : 0,
        rackUnits: isFinite(totalTypeRU) ? totalTypeRU : 0,
        originalType: type // keep original type for color assignment
      };
    }).filter(item => item.quantity > 0); // Filter out types with no components
  }, [componentsByType]);
  
  // Get a color for a component type
  const getTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('server')) return COLORS.server;
    if (lowerType.includes('storage') || lowerType === 'disk') return COLORS.storage;
    if (lowerType.includes('switch')) return COLORS.switch;
    if (lowerType.includes('firewall')) return COLORS.firewall;
    if (lowerType.includes('disk')) return COLORS.disk;
    if (lowerType.includes('gpu')) return COLORS.gpu;
    return COLORS.other;
  };
  
  // Format for chart labels
  interface LabelProps {
    payload: {
      type: string;
      [key: string]: unknown;
    };
    percent: number;
  }
  
  const formatLabelValue = (value: number, name: string, props: LabelProps) => {
    const item = props.payload;
    return `${name}: ${item.type} (${props.percent.toFixed(1)}%)`;
  };
  
  // Custom tooltip for pie charts
  const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      // Cast to include percent property that Recharts adds for pie charts
      const payloadItem = payload[0] as typeof payload[0] & { percent?: number };
      const data = payloadItem.payload as {
        type: string;
        cost?: number;
        power?: number;
        rackUnits?: number;
      };
      return (
        <div className="bg-white p-2 border shadow-md rounded-md">
          <p className="font-medium">{data.type}</p>
          {data.cost && <p className="text-sm">${data.cost.toLocaleString()}</p>}
          {data.power && <p className="text-sm">{data.power.toLocaleString()} W</p>}
          {data.rackUnits && data.rackUnits > 0 && <p className="text-sm">{data.rackUnits} RU</p>}
          <p className="text-xs text-gray-500">
            {payloadItem.percent ? (payloadItem.percent * 100).toFixed(1) : '0'}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Component Type Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="charts">
              <ChartPie className="mr-2 h-4 w-4" />
              Charts
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Total Power (W)</TableHead>
                  <TableHead>Total RU</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeData.map(item => (
                  <TableRow key={item.type}>
                    <TableCell className="font-medium">{item.type}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>${item.cost.toLocaleString()}</TableCell>
                    <TableCell>{item.power.toLocaleString()} W</TableCell>
                    <TableCell>{item.rackUnits > 0 ? `${item.rackUnits} RU` : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          
          <TabsContent value="charts">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cost Distribution Chart */}
              <div className="border rounded p-4">
                <h3 className="text-center font-medium mb-4">Cost Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="cost"
                      nameKey="type"
                      label={(entry) => `${entry.type}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getTypeColor(entry.originalType)} />
                      ))}
                    </Pie>
                    <Legend formatter={(value) => value} />
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Power Distribution Chart */}
              <div className="border rounded p-4">
                <h3 className="text-center font-medium mb-4">Power Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="power"
                      nameKey="type"
                      label={(entry) => `${entry.type}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getTypeColor(entry.originalType)} />
                      ))}
                    </Pie>
                    <Legend formatter={(value) => value} />
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Rack Units Distribution Chart */}
              <div className="border rounded p-4">
                <h3 className="text-center font-medium mb-4">Rack Units Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={typeData.filter(item => item.rackUnits > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="rackUnits"
                      nameKey="type"
                      label={(entry) => `${entry.type}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
                    >
                      {typeData
                        .filter(item => item.rackUnits > 0)
                        .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getTypeColor(entry.originalType)} />
                        ))}
                    </Pie>
                    <Legend formatter={(value) => value} />
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
