import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useDesignStore } from '@/store/designStore';
import { useCostAnalysis } from '@/hooks/design/useCostAnalysis';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';

interface TCOAnalysisChartProps {
  clusterId: string;
  clusterName: string;
  clusterType: 'compute' | 'storage';
}

export const TCOAnalysisChart: React.FC<TCOAnalysisChartProps> = ({
  clusterId,
  clusterName,
  clusterType
}) => {
  const { requirements } = useDesignStore();
  const { operationalCosts } = useCostAnalysis();
  const { actualHardwareTotals } = useDesignCalculations();
  
  // State for scenario variables
  const [utilizationRange, setUtilizationRange] = useState([0, 100]);
  const [vCPURange, setVCPURange] = useState([1, 32]);
  const [memoryRange, setMemoryRange] = useState([1, 256]);
  const [azRange, setAZRange] = useState([1, 5]);

  // Generate data points for the chart
  const chartData = useMemo(() => {
    const data = [];
    const steps = 20; // Number of data points to generate
    
    // Get base values from requirements
    const baseVCPUs = requirements.computeRequirements?.averageVMVCPUs || 4;
    const baseMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 8;
    const baseAZs = requirements.computeRequirements?.computeClusters?.find(c => c.id === clusterId)?.availabilityZoneRedundancy === 'N+1' ? 3 : 2;
    
    // Calculate base costs
    const baseCosts = {
      compute: operationalCosts.amortizedMonthly,
      network: operationalCosts.networkMonthly,
      rack: operationalCosts.racksMonthly,
      energy: operationalCosts.energyMonthly,
      licensing: operationalCosts.licensingMonthly
    };

    // Generate data points
    for (let i = 0; i <= steps; i++) {
      const utilization = utilizationRange[0] + (i * (utilizationRange[1] - utilizationRange[0]) / steps);
      const vCPUs = vCPURange[0] + (i * (vCPURange[1] - vCPURange[0]) / steps);
      const memoryGB = memoryRange[0] + (i * (memoryRange[1] - memoryRange[0]) / steps);
      const azs = Math.round(azRange[0] + (i * (azRange[1] - azRange[0]) / steps));

      // Calculate costs based on utilization and resource changes
      const utilizationFactor = utilization / 100;
      const resourceFactor = (vCPUs / baseVCPUs) * (memoryGB / baseMemoryGB);
      const azFactor = azs / baseAZs;

      const costs = {
        utilization,
        vCPUs,
        memoryGB,
        azs,
        compute: baseCosts.compute * utilizationFactor * resourceFactor,
        network: baseCosts.network * utilizationFactor * azFactor,
        rack: baseCosts.rack * azFactor,
        energy: baseCosts.energy * utilizationFactor * resourceFactor * azFactor,
        licensing: baseCosts.licensing * utilizationFactor * resourceFactor,
        total: 0
      };

      // Calculate total cost
      costs.total = Object.values(costs).reduce((sum, cost) => 
        typeof cost === 'number' ? sum + cost : sum, 0);

      data.push(costs);
    }

    return data;
  }, [utilizationRange, vCPURange, memoryRange, azRange, requirements, operationalCosts, clusterId]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>TCO Analysis - {clusterName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Utilization Range (%)</Label>
              <Slider
                value={utilizationRange}
                onValueChange={setUtilizationRange}
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>vCPU Range</Label>
              <Slider
                value={vCPURange}
                onValueChange={setVCPURange}
                min={1}
                max={32}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Memory Range (GB)</Label>
              <Slider
                value={memoryRange}
                onValueChange={setMemoryRange}
                min={1}
                max={256}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Availability Zones</Label>
              <Slider
                value={azRange}
                onValueChange={setAZRange}
                min={1}
                max={5}
                step={1}
              />
            </div>
          </div>

          {/* Chart */}
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="utilization" 
                  label={{ value: 'Utilization (%)', position: 'insideBottom', offset: -5 }} 
                />
                <YAxis 
                  label={{ value: 'Monthly Cost ($)', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                  labelFormatter={(label) => `Utilization: ${label}%`}
                />
                <Legend />
                <Line type="monotone" dataKey="compute" stroke="#8884d8" name="Compute" />
                <Line type="monotone" dataKey="network" stroke="#82ca9d" name="Network" />
                <Line type="monotone" dataKey="rack" stroke="#ffc658" name="Rack" />
                <Line type="monotone" dataKey="energy" stroke="#ff8042" name="Energy" />
                <Line type="monotone" dataKey="licensing" stroke="#0088fe" name="Licensing" />
                <Line type="monotone" dataKey="total" stroke="#ff0000" name="Total" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 