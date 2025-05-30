import React from 'react';
import { TcoScenario } from '@/types/infrastructure/tco-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ScenarioComparisonChartProps {
  scenarios: TcoScenario[];
}

export const ScenarioComparisonChart: React.FC<ScenarioComparisonChartProps> = ({ scenarios }) => {
  // Filter scenarios with results
  const scenariosWithResults = scenarios.filter(s => s.results !== null);

  if (scenariosWithResults.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No scenario results available. Please calculate scenarios first.
        </CardContent>
      </Card>
    );
  }

  // Prepare data for the chart
  const chartData = scenariosWithResults.map(scenario => ({
    name: scenario.name,
    'TCO/VM': scenario.results!.tcoPerVM,
    'Total Monthly': scenario.results!.totalMonthlyCost,
    'Hardware': scenario.results!.costBreakdown.hardware,
    'Energy': scenario.results!.costBreakdown.energy,
    'Rack': scenario.results!.costBreakdown.rack,
    'Licensing': scenario.results!.costBreakdown.licensing,
    'Network': scenario.results!.costBreakdown.network,
    'Utilization': scenario.parameters.utilization
  }));

  return (
    <div className="space-y-6">
      {/* TCO per VM Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>TCO per VM Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="TCO/VM" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost Breakdown Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown by Scenario</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="Hardware" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="Energy" stackId="a" fill="#10b981" />
              <Bar dataKey="Rack" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Licensing" stackId="a" fill="#ef4444" />
              <Bar dataKey="Network" stackId="a" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Key Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Metrics Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Scenario</th>
                  <th className="text-right p-2">TCO/VM</th>
                  <th className="text-right p-2">Total Monthly</th>
                  <th className="text-right p-2">VM Capacity</th>
                  <th className="text-right p-2">Storage (TB)</th>
                  <th className="text-right p-2">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {scenariosWithResults.map(scenario => (
                  <tr key={scenario.id} className="border-b">
                    <td className="p-2">{scenario.name}</td>
                    <td className="text-right p-2">${scenario.results!.tcoPerVM.toFixed(2)}</td>
                    <td className="text-right p-2">${scenario.results!.totalMonthlyCost.toLocaleString()}</td>
                    <td className="text-right p-2">{scenario.results!.vmCapacity.toLocaleString()}</td>
                    <td className="text-right p-2">{scenario.results!.storageCapacity.toFixed(0)}</td>
                    <td className="text-right p-2">{scenario.parameters.utilization}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 