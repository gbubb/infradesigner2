import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useDesignStore } from '@/store/designStore';
import { useCostAnalysis } from '@/hooks/design/useCostAnalysis';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';

interface TCOAnalysisChartProps {
  clusterId: string;
  clusterName: string;
  clusterType: 'compute' | 'storage';
  currentUtilization: number; // Add this prop to sync with the main model's utilization
}

type AnalysisMode = 'utilization' | 'design';
type DesignVariable = 'vCPUs' | 'memory' | 'availabilityZones';

export const TCOAnalysisChart: React.FC<TCOAnalysisChartProps> = ({
  clusterId,
  clusterName,
  clusterType,
  currentUtilization
}) => {
  const { requirements, updateRequirements } = useDesignStore();
  const { operationalCosts } = useCostAnalysis();
  const { actualHardwareTotals } = useDesignCalculations();
  
  // State for analysis mode and variables
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('utilization');
  const [selectedDesignVariable, setSelectedDesignVariable] = useState<DesignVariable>('vCPUs');
  const [designVariableRange, setDesignVariableRange] = useState([1, 32]);
  const [utilizationRange, setUtilizationRange] = useState([0, 100]);

  // Get base values from requirements
  const baseValues = useMemo(() => {
    const baseVCPUs = requirements.computeRequirements?.averageVMVCPUs || 4;
    const baseMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 8;
    const baseAZs = requirements.computeRequirements?.computeClusters?.find(c => c.id === clusterId)?.availabilityZoneRedundancy === 'N+1' ? 3 : 2;

    return {
      vCPUs: baseVCPUs,
      memory: baseMemoryGB,
      availabilityZones: baseAZs
    };
  }, [requirements, clusterId]);

  // Generate data points for the chart
  const chartData = useMemo(() => {
    const data = [];
    const steps = 20; // Number of data points to generate

    if (analysisMode === 'utilization') {
      // Utilization analysis mode
      const range = utilizationRange;
      const totalVMs = actualHardwareTotals.totalVCPUs / baseValues.vCPUs;
      
      // Calculate base costs per VM
      const baseCosts = {
        compute: operationalCosts.amortizedMonthly / totalVMs,
        network: operationalCosts.networkMonthly / totalVMs,
        rack: operationalCosts.racksMonthly / totalVMs,
        energy: operationalCosts.energyMonthly / totalVMs,
        licensing: operationalCosts.licensingMonthly / totalVMs
      };

      // Generate data points for utilization analysis
      for (let i = 0; i <= steps; i++) {
        const utilization = range[0] + (i * (range[1] - range[0]) / steps);
        const utilizationFactor = utilization / 100;

        const costs = {
          utilization,
          compute: baseCosts.compute * utilizationFactor,
          network: baseCosts.network * utilizationFactor,
          rack: baseCosts.rack * utilizationFactor,
          energy: baseCosts.energy * utilizationFactor,
          licensing: baseCosts.licensing * utilizationFactor
        };

        data.push(costs);
      }
    } else {
      // Design capacity analysis mode
      const range = designVariableRange;
      const baseValue = baseValues[selectedDesignVariable];
      
      // Generate data points for design capacity analysis
      for (let i = 0; i <= steps; i++) {
        const value = range[0] + (i * (range[1] - range[0]) / steps);
        const factor = value / baseValue;

        // Calculate costs based on the design variable
        const costs = {
          [selectedDesignVariable]: value,
          compute: operationalCosts.amortizedMonthly * factor,
          network: operationalCosts.networkMonthly * factor,
          rack: operationalCosts.racksMonthly * factor,
          energy: operationalCosts.energyMonthly * factor,
          licensing: operationalCosts.licensingMonthly * factor
        };

        data.push(costs);
      }
    }

    return data;
  }, [
    analysisMode,
    utilizationRange,
    designVariableRange,
    selectedDesignVariable,
    operationalCosts,
    actualHardwareTotals,
    baseValues
  ]);

  // Get the appropriate range control based on analysis mode
  const renderRangeControl = () => {
    if (analysisMode === 'utilization') {
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
    } else {
      const rangeConfig = {
        vCPUs: { min: 1, max: 32, step: 1, label: 'vCPU Range' },
        memory: { min: 1, max: 256, step: 1, label: 'Memory Range (GB)' },
        availabilityZones: { min: 1, max: 5, step: 1, label: 'Availability Zones' }
      }[selectedDesignVariable];

      return (
        <div className="space-y-2">
          <Label>{rangeConfig.label}</Label>
          <Slider
            value={designVariableRange}
            onValueChange={setDesignVariableRange}
            min={rangeConfig.min}
            max={rangeConfig.max}
            step={rangeConfig.step}
          />
        </div>
      );
    }
  };

  // Get axis labels based on analysis mode
  const getAxisLabels = () => {
    if (analysisMode === 'utilization') {
      return {
        xAxis: 'Utilization (%)',
        yAxis: 'Monthly Cost per VM ($)'
      };
    } else {
      const xAxisLabel = {
        vCPUs: 'vCPUs per VM',
        memory: 'Memory per VM (GB)',
        availabilityZones: 'Number of Availability Zones'
      }[selectedDesignVariable];

      return {
        xAxis: xAxisLabel,
        yAxis: 'Monthly Cost per VM ($)'
      };
    }
  };

  const axisLabels = getAxisLabels();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>TCO Analysis - {clusterName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Analysis Mode Selection */}
          <div className="space-y-4">
            <Label>Analysis Mode:</Label>
            <RadioGroup
              value={analysisMode}
              onValueChange={(value: AnalysisMode) => setAnalysisMode(value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="utilization" id="utilization" />
                <Label htmlFor="utilization">Utilization Analysis</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="design" id="design" />
                <Label htmlFor="design">Design Capacity Analysis</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Variable Selection (for design mode) */}
          {analysisMode === 'design' && (
            <div className="flex items-center gap-4">
              <Label>Analyze by:</Label>
              <Select 
                value={selectedDesignVariable} 
                onValueChange={(value: DesignVariable) => setSelectedDesignVariable(value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vCPUs">vCPUs per VM</SelectItem>
                  <SelectItem value="memory">Memory per VM</SelectItem>
                  <SelectItem value="availabilityZones">Availability Zones</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Range Control */}
          {renderRangeControl()}

          {/* Chart */}
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={analysisMode === 'utilization' ? 'utilization' : selectedDesignVariable}
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