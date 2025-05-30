import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDesignStore } from '@/store/designStore';
import { useCostAnalysis } from '@/hooks/design/useCostAnalysis';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';

interface TCOAnalysisChartProps {
  clusterId: string;
  clusterName: string;
  clusterType: 'compute' | 'storage';
}

type AnalysisVariable = 'utilization' | 'vCPUs' | 'memory' | 'availabilityZones';

export const TCOAnalysisChart: React.FC<TCOAnalysisChartProps> = ({
  clusterId,
  clusterName,
  clusterType
}) => {
  const { requirements } = useDesignStore();
  const { operationalCosts } = useCostAnalysis();
  const { actualHardwareTotals } = useDesignCalculations();
  
  // State for scenario variables
  const [selectedVariable, setSelectedVariable] = useState<AnalysisVariable>('utilization');
  const [utilizationRange, setUtilizationRange] = useState([0, 100]);
  const [vCPURange, setVCPURange] = useState([1, 32]);
  const [memoryRange, setMemoryRange] = useState([1, 256]);
  const [azRange, setAZRange] = useState([1, 5]);

  // Get base values from requirements
  const baseValues = useMemo(() => {
    const baseVCPUs = requirements.computeRequirements?.averageVMVCPUs || 4;
    const baseMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 8;
    const baseAZs = requirements.computeRequirements?.computeClusters?.find(c => c.id === clusterId)?.availabilityZoneRedundancy === 'N+1' ? 3 : 2;
    const baseUtilization = 50; // Default utilization

    return {
      vCPUs: baseVCPUs,
      memory: baseMemoryGB,
      availabilityZones: baseAZs,
      utilization: baseUtilization
    };
  }, [requirements, clusterId]);

  // Generate data points for the chart
  const chartData = useMemo(() => {
    const data = [];
    const steps = 20; // Number of data points to generate
    
    // Get the range for the selected variable
    const range = {
      utilization: utilizationRange,
      vCPUs: vCPURange,
      memory: memoryRange,
      availabilityZones: azRange
    }[selectedVariable];

    // Calculate base costs per VM
    const totalVMs = actualHardwareTotals.totalVCPUs / baseValues.vCPUs;
    const baseCosts = {
      compute: operationalCosts.amortizedMonthly / totalVMs,
      network: operationalCosts.networkMonthly / totalVMs,
      rack: operationalCosts.racksMonthly / totalVMs,
      energy: operationalCosts.energyMonthly / totalVMs,
      licensing: operationalCosts.licensingMonthly / totalVMs
    };

    // Generate data points
    for (let i = 0; i <= steps; i++) {
      const value = range[0] + (i * (range[1] - range[0]) / steps);
      
      // Calculate factors based on the selected variable
      const factors = {
        utilization: value / 100,
        vCPUs: value / baseValues.vCPUs,
        memory: value / baseValues.memory,
        availabilityZones: value / baseValues.availabilityZones
      };

      // Calculate costs based on the selected variable
      const costs = {
        [selectedVariable]: value,
        compute: baseCosts.compute * factors[selectedVariable],
        network: baseCosts.network * factors[selectedVariable],
        rack: baseCosts.rack * factors[selectedVariable],
        energy: baseCosts.energy * factors[selectedVariable],
        licensing: baseCosts.licensing * factors[selectedVariable]
      };

      data.push(costs);
    }

    return data;
  }, [selectedVariable, utilizationRange, vCPURange, memoryRange, azRange, operationalCosts, actualHardwareTotals, baseValues]);

  // Get the appropriate range control based on selected variable
  const renderRangeControl = () => {
    switch (selectedVariable) {
      case 'utilization':
        return (
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
        );
      case 'vCPUs':
        return (
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
        );
      case 'memory':
        return (
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
        );
      case 'availabilityZones':
        return (
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
        );
    }
  };

  // Get axis labels based on selected variable
  const getAxisLabels = () => {
    const xAxisLabel = {
      utilization: 'Utilization (%)',
      vCPUs: 'vCPUs per VM',
      memory: 'Memory per VM (GB)',
      availabilityZones: 'Number of Availability Zones'
    }[selectedVariable];

    return {
      xAxis: xAxisLabel,
      yAxis: 'Monthly Cost per VM ($)'
    };
  };

  const axisLabels = getAxisLabels();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>TCO Analysis - {clusterName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Variable Selection */}
          <div className="flex items-center gap-4">
            <Label>Analyze by:</Label>
            <Select value={selectedVariable} onValueChange={(value: AnalysisVariable) => setSelectedVariable(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utilization">Utilization</SelectItem>
                <SelectItem value="vCPUs">vCPUs per VM</SelectItem>
                <SelectItem value="memory">Memory per VM</SelectItem>
                <SelectItem value="availabilityZones">Availability Zones</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Range Control */}
          {renderRangeControl()}

          {/* Chart */}
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={selectedVariable}
                  label={{ value: axisLabels.xAxis, position: 'insideBottom', offset: -5 }} 
                />
                <YAxis 
                  label={{ value: axisLabels.yAxis, angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                  labelFormatter={(label) => `${axisLabels.xAxis}: ${label}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="compute" 
                  stackId="1" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  name="Compute" 
                />
                <Area 
                  type="monotone" 
                  dataKey="network" 
                  stackId="1" 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  name="Network" 
                />
                <Area 
                  type="monotone" 
                  dataKey="rack" 
                  stackId="1" 
                  stroke="#ffc658" 
                  fill="#ffc658" 
                  name="Rack" 
                />
                <Area 
                  type="monotone" 
                  dataKey="energy" 
                  stackId="1" 
                  stroke="#ff8042" 
                  fill="#ff8042" 
                  name="Energy" 
                />
                <Area 
                  type="monotone" 
                  dataKey="licensing" 
                  stackId="1" 
                  stroke="#0088fe" 
                  fill="#0088fe" 
                  name="Licensing" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 