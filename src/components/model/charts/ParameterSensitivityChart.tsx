import React, { useState, useMemo } from 'react';
import { TcoScenario } from '@/types/infrastructure/tco-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ParameterSensitivityChartProps {
  scenarios: TcoScenario[];
  baseScenarioId?: string;
}

type ParameterKey = 'computeScale' | 'storageScale' | 'utilization' | 'availabilityZones' | 'rackQuantity' | 'powerEfficiency';

const parameterLabels: Record<ParameterKey, string> = {
  computeScale: 'Compute Scale Factor',
  storageScale: 'Storage Scale Factor',
  utilization: 'Utilization %',
  availabilityZones: 'Availability Zones',
  rackQuantity: 'Rack Quantity',
  powerEfficiency: 'Power Efficiency'
};

export const ParameterSensitivityChart: React.FC<ParameterSensitivityChartProps> = ({ 
  scenarios, 
  baseScenarioId 
}) => {
  const [selectedParameter, setSelectedParameter] = useState<ParameterKey>('computeScale');
  const [selectedMetric, setSelectedMetric] = useState<'tcoPerVM' | 'totalMonthlyCost'>('tcoPerVM');

  // Filter scenarios with results
  const scenariosWithResults = scenarios.filter(s => s.results !== null);
  const baseScenario = baseScenarioId 
    ? scenariosWithResults.find(s => s.id === baseScenarioId) 
    : scenariosWithResults[0];

  // Generate sensitivity data
  const sensitivityData = useMemo(() => {
    if (!baseScenario) return [];

    const parameterValues = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];
    const data: any[] = [];

    parameterValues.forEach(value => {
      const dataPoint: any = { [selectedParameter]: value };
      
      // Find scenarios that match this parameter value
      scenariosWithResults.forEach(scenario => {
        if (Math.abs(scenario.parameters[selectedParameter] - value) < 0.01) {
          dataPoint[scenario.name] = selectedMetric === 'tcoPerVM' 
            ? scenario.results!.tcoPerVM 
            : scenario.results!.totalMonthlyCost;
        }
      });

      // If we have any data for this value, add it
      if (Object.keys(dataPoint).length > 1) {
        data.push(dataPoint);
      }
    });

    return data;
  }, [scenariosWithResults, selectedParameter, selectedMetric, baseScenario]);

  if (scenariosWithResults.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No scenario results available. Please calculate scenarios first.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Parameter Sensitivity Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Parameter</label>
              <Select value={selectedParameter} onValueChange={(value) => setSelectedParameter(value as ParameterKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(parameterLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Metric</label>
              <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tcoPerVM">TCO per VM</SelectItem>
                  <SelectItem value="totalMonthlyCost">Total Monthly Cost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {sensitivityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={sensitivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={selectedParameter} 
                  label={{ value: parameterLabels[selectedParameter], position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ 
                    value: selectedMetric === 'tcoPerVM' ? 'TCO per VM ($)' : 'Total Monthly Cost ($)', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                />
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  labelFormatter={(value) => `${parameterLabels[selectedParameter]}: ${value}`}
                />
                <Legend />
                {scenariosWithResults.map((scenario, index) => (
                  <Line
                    key={scenario.id}
                    type="monotone"
                    dataKey={scenario.name}
                    stroke={`hsl(${index * 60}, 70%, 50%)`}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-muted-foreground p-8">
              Create multiple scenarios with varying {parameterLabels[selectedParameter]} values to see sensitivity analysis.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Impact Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Sensitivity Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-blue-50 rounded">
              <p className="font-medium text-blue-900">Compute Scale Impact</p>
              <p className="text-blue-700">Doubling compute capacity typically increases TCO per VM by 40-60% due to fixed costs being spread across more resources.</p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="font-medium text-green-900">Utilization Impact</p>
              <p className="text-green-700">Increasing utilization from 50% to 80% can reduce TCO per VM by up to 35% as fixed costs are distributed across more active workloads.</p>
            </div>
            <div className="p-3 bg-orange-50 rounded">
              <p className="font-medium text-orange-900">Scale Efficiency</p>
              <p className="text-orange-700">Larger deployments benefit from economies of scale in network and infrastructure costs, reducing per-unit TCO.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 