import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, ComposedChart } from 'recharts';
import { TrendingUp, AlertTriangle, Zap, Server } from 'lucide-react';
import { PowerLayer } from '@/types/infrastructure/datacenter-types';

interface CapacityPlanningViewProps {
  currentUsage: {
    racks: number;
    powerKW: number;
  };
  capacity: {
    totalRacks: number;
    totalPowerKW: number;
  };
  powerInfrastructure: PowerLayer[];
}

export const CapacityPlanningView: React.FC<CapacityPlanningViewProps> = ({
  currentUsage,
  capacity,
  powerInfrastructure
}) => {
  const [growthRate, setGrowthRate] = useState(20); // 20% annual growth default
  const [planningHorizon, setPlanningHorizon] = useState(36); // 36 months default

  // Generate projection data
  const generateProjections = () => {
    const data = [];
    const monthlyGrowthRate = Math.pow(1 + growthRate / 100, 1 / 12) - 1;
    
    let projectedRacks = currentUsage.racks;
    let projectedPower = currentUsage.powerKW;
    
    for (let i = 0; i <= planningHorizon; i++) {
      const rackUtilization = projectedRacks / capacity.totalRacks;
      const powerUtilization = projectedPower / capacity.totalPowerKW;
      
      data.push({
        month: i,
        label: i === 0 ? 'Now' : `+${i}mo`,
        racks: Math.round(projectedRacks),
        power: Math.round(projectedPower),
        rackUtilization: rackUtilization * 100,
        powerUtilization: powerUtilization * 100,
        rackCapacity: capacity.totalRacks,
        powerCapacity: capacity.totalPowerKW,
        bottleneck: rackUtilization > 1 || powerUtilization > 1 ? 
          (rackUtilization > powerUtilization ? 'racks' : 'power') : null
      });
      
      if (i > 0) {
        projectedRacks *= (1 + monthlyGrowthRate);
        projectedPower *= (1 + monthlyGrowthRate);
      }
    }
    
    return data;
  };

  const projectionData = generateProjections();

  // Find when capacity will be exceeded
  const capacityExceededMonth = projectionData.findIndex(d => 
    d.rackUtilization > 100 || d.powerUtilization > 100
  );

  // Calculate available headroom
  const rackHeadroom = capacity.totalRacks - currentUsage.racks;
  const powerHeadroom = capacity.totalPowerKW - currentUsage.powerKW;
  const rackHeadroomPercent = (rackHeadroom / capacity.totalRacks) * 100;
  const powerHeadroomPercent = (powerHeadroom / capacity.totalPowerKW) * 100;

  return (
    <div className="space-y-6">
      {/* Planning Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Annual Growth Rate: {growthRate}%
          </label>
          <Slider
            value={[growthRate]}
            onValueChange={([value]) => setGrowthRate(value)}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Planning Horizon: {planningHorizon} months
          </label>
          <Slider
            value={[planningHorizon]}
            onValueChange={([value]) => setPlanningHorizon(value)}
            min={12}
            max={60}
            step={6}
            className="w-full"
          />
        </div>
      </div>

      {/* Capacity Alerts */}
      {capacityExceededMonth > 0 && capacityExceededMonth <= planningHorizon && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            At {growthRate}% annual growth, capacity will be exceeded in {capacityExceededMonth} months.
            Plan expansion before month {Math.floor(capacityExceededMonth * 0.8)} to maintain safe margins.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="utilization" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="utilization">Utilization Forecast</TabsTrigger>
          <TabsTrigger value="absolute">Absolute Growth</TabsTrigger>
          <TabsTrigger value="headroom">Available Headroom</TabsTrigger>
        </TabsList>

        {/* Utilization Forecast */}
        <TabsContent value="utilization" className="space-y-4">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={projectionData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 120]} />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="rackUtilization"
                  fill="#3b82f6"
                  stroke="#3b82f6"
                  fillOpacity={0.3}
                  name="Rack Utilization"
                />
                <Area
                  type="monotone"
                  dataKey="powerUtilization"
                  fill="#f59e0b"
                  stroke="#f59e0b"
                  fillOpacity={0.3}
                  name="Power Utilization"
                />
                <Line
                  y={100}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Capacity Limit"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Absolute Growth */}
        <TabsContent value="absolute" className="space-y-4">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis 
                  yAxisId="left" 
                  className="text-xs"
                  label={{ value: 'Racks', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  className="text-xs"
                  label={{ value: 'Power (kW)', angle: 90, position: 'insideRight' }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="racks"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Racks"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="rackCapacity"
                  stroke="#3b82f6"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Rack Capacity"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="power"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="Power"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="powerCapacity"
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Power Capacity"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Available Headroom */}
        <TabsContent value="headroom" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium">Rack Capacity</h4>
                </div>
                <Badge variant={rackHeadroomPercent < 20 ? "destructive" : "secondary"}>
                  {rackHeadroomPercent.toFixed(0)}% Available
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used</span>
                  <span>{currentUsage.racks} racks</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Available</span>
                  <span>{rackHeadroom} racks</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Capacity</span>
                  <span>{capacity.totalRacks} racks</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-600" />
                  <h4 className="font-medium">Power Capacity</h4>
                </div>
                <Badge variant={powerHeadroomPercent < 20 ? "destructive" : "secondary"}>
                  {powerHeadroomPercent.toFixed(0)}% Available
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used</span>
                  <span>{(currentUsage.powerKW / 1000).toFixed(1)} MW</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Available</span>
                  <span>{(powerHeadroom / 1000).toFixed(1)} MW</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Capacity</span>
                  <span>{(capacity.totalPowerKW / 1000).toFixed(1)} MW</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottleneck Analysis */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Expansion Recommendations
            </h4>
            <div className="space-y-2 text-sm">
              {rackHeadroomPercent < powerHeadroomPercent ? (
                <>
                  <p>• Rack space is your primary constraint ({rackHeadroomPercent.toFixed(0)}% remaining)</p>
                  <p>• Consider adding {Math.ceil(rackHeadroom * 0.5)} racks in the next expansion</p>
                  <p>• Power infrastructure has sufficient headroom ({powerHeadroomPercent.toFixed(0)}% remaining)</p>
                </>
              ) : (
                <>
                  <p>• Power capacity is your primary constraint ({powerHeadroomPercent.toFixed(0)}% remaining)</p>
                  <p>• Consider upgrading power infrastructure by {Math.ceil(powerHeadroom * 0.5 / 1000)} MW</p>
                  <p>• Rack space has sufficient headroom ({rackHeadroomPercent.toFixed(0)}% remaining)</p>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};