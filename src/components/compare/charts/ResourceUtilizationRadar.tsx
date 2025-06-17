import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResourceMetrics, ChartTooltipPayload } from '@/types/compare';

interface ResourceUtilizationRadarProps {
  designAName: string;
  designBName: string;
  designAMetrics: ResourceMetrics;
  designBMetrics: ResourceMetrics;
}

export const ResourceUtilizationRadar: React.FC<ResourceUtilizationRadarProps> = ({
  designAName,
  designBName,
  designAMetrics,
  designBMetrics,
}) => {
  // Normalize data to 0-100 scale for better visualization
  const normalizeData = () => {
    const maxValues = {
      vCPUs: Math.max(designAMetrics.vCPUs || 0, designBMetrics.vCPUs || 0),
      memoryTB: Math.max(designAMetrics.memoryTB || 0, designBMetrics.memoryTB || 0),
      storageTB: Math.max(designAMetrics.storageTB || 0, designBMetrics.storageTB || 0),
      powerKW: Math.max(designAMetrics.powerKW || 0, designBMetrics.powerKW || 0),
      rackUnits: Math.max(designAMetrics.rackUnits || 0, designBMetrics.rackUnits || 0),
    };

    // Helper function to safely normalize values
    const safeNormalize = (value: number, max: number) => {
      if (!max || max === 0) return 0;
      const normalized = (value / max) * 100;
      return isNaN(normalized) || !isFinite(normalized) ? 0 : normalized;
    };

    return [
      {
        metric: 'vCPUs',
        [designAName]: safeNormalize(designAMetrics.vCPUs || 0, maxValues.vCPUs),
        [designBName]: safeNormalize(designBMetrics.vCPUs || 0, maxValues.vCPUs),
        fullMark: 100,
      },
      {
        metric: 'Memory',
        [designAName]: safeNormalize(designAMetrics.memoryTB || 0, maxValues.memoryTB),
        [designBName]: safeNormalize(designBMetrics.memoryTB || 0, maxValues.memoryTB),
        fullMark: 100,
      },
      {
        metric: 'Storage',
        [designAName]: safeNormalize(designAMetrics.storageTB || 0, maxValues.storageTB),
        [designBName]: safeNormalize(designBMetrics.storageTB || 0, maxValues.storageTB),
        fullMark: 100,
      },
      {
        metric: 'Power',
        [designAName]: safeNormalize(designAMetrics.powerKW || 0, maxValues.powerKW),
        [designBName]: safeNormalize(designBMetrics.powerKW || 0, maxValues.powerKW),
        fullMark: 100,
      },
      {
        metric: 'Rack Space',
        [designAName]: safeNormalize(designAMetrics.rackUnits || 0, maxValues.rackUnits),
        [designBName]: safeNormalize(designBMetrics.rackUnits || 0, maxValues.rackUnits),
        fullMark: 100,
      },
    ];
  };

  const data = normalizeData();

  const CustomTooltip = ({ active, payload }: ChartTooltipPayload) => {
    if (active && payload && payload.length) {
      const metricName = payload[0].payload.metric;
      const actualValues = {
        vCPUs: { A: designAMetrics.vCPUs, B: designBMetrics.vCPUs, unit: '' },
        Memory: { A: designAMetrics.memoryTB, B: designBMetrics.memoryTB, unit: ' TB' },
        Storage: { A: designAMetrics.storageTB, B: designBMetrics.storageTB, unit: ' TB' },
        Power: { A: designAMetrics.powerKW, B: designBMetrics.powerKW, unit: ' kW' },
        'Rack Space': { A: designAMetrics.rackUnits, B: designBMetrics.rackUnits, unit: ' RU' },
      };

      const values = actualValues[metricName as keyof typeof actualValues];
      
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{metricName}</p>
          <p className="text-sm">
            {designAName}: {values.A.toLocaleString()}{values.unit}
          </p>
          <p className="text-sm">
            {designBName}: {values.B.toLocaleString()}{values.unit}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Difference: {values.A > 0 ? ((values.B - values.A) / values.A * 100).toFixed(1) : 'N/A'}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate efficiency metrics
  const calculateEfficiencyMetrics = () => {
    const designAEfficiency = {
      cpuPerRU: designAMetrics.rackUnits > 0 ? designAMetrics.vCPUs / designAMetrics.rackUnits : 0,
      tbPerRU: designAMetrics.rackUnits > 0 ? designAMetrics.storageTB / designAMetrics.rackUnits : 0,
      cpuPerKW: designAMetrics.powerKW > 0 ? designAMetrics.vCPUs / designAMetrics.powerKW : 0,
    };

    const designBEfficiency = {
      cpuPerRU: designBMetrics.rackUnits > 0 ? designBMetrics.vCPUs / designBMetrics.rackUnits : 0,
      tbPerRU: designBMetrics.rackUnits > 0 ? designBMetrics.storageTB / designBMetrics.rackUnits : 0,
      cpuPerKW: designBMetrics.powerKW > 0 ? designBMetrics.vCPUs / designBMetrics.powerKW : 0,
    };

    return { designAEfficiency, designBEfficiency };
  };

  const { designAEfficiency, designBEfficiency } = calculateEfficiencyMetrics();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Utilization Comparison</CardTitle>
        <p className="text-sm text-muted-foreground">Comparing vCPUs, Memory, Usable Storage, Power, and Rack Space requirements</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={data}>
            <PolarGrid strokeDasharray="3 3" className="stroke-muted" />
            <PolarAngleAxis dataKey="metric" className="text-sm" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar 
              name={designAName} 
              dataKey={designAName} 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Radar 
              name={designBName} 
              dataKey={designBName} 
              stroke="#10b981" 
              fill="#10b981" 
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Legend />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>

        {/* Efficiency Metrics */}
        <div className="mt-6">
          <h5 className="font-medium mb-3">Efficiency Metrics</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">vCPUs per Rack Unit</p>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{designAName}:</span> {designAEfficiency.cpuPerRU.toFixed(1)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{designBName}:</span> {designBEfficiency.cpuPerRU.toFixed(1)}
                </p>
                <p className={`text-sm font-medium ${designAEfficiency.cpuPerRU > 0 ? (designBEfficiency.cpuPerRU > designAEfficiency.cpuPerRU ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                  {designAEfficiency.cpuPerRU > 0 ? 
                    `${((designBEfficiency.cpuPerRU - designAEfficiency.cpuPerRU) / designAEfficiency.cpuPerRU * 100).toFixed(1)}% difference` :
                    'No comparison available'
                  }
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">TB Storage per Rack Unit</p>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{designAName}:</span> {designAEfficiency.tbPerRU.toFixed(2)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{designBName}:</span> {designBEfficiency.tbPerRU.toFixed(2)}
                </p>
                <p className={`text-sm font-medium ${designAEfficiency.tbPerRU > 0 ? (designBEfficiency.tbPerRU > designAEfficiency.tbPerRU ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                  {designAEfficiency.tbPerRU > 0 ? 
                    `${((designBEfficiency.tbPerRU - designAEfficiency.tbPerRU) / designAEfficiency.tbPerRU * 100).toFixed(1)}% difference` :
                    'No comparison available'
                  }
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">vCPUs per kW</p>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{designAName}:</span> {designAEfficiency.cpuPerKW.toFixed(1)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{designBName}:</span> {designBEfficiency.cpuPerKW.toFixed(1)}
                </p>
                <p className={`text-sm font-medium ${designAEfficiency.cpuPerKW > 0 ? (designBEfficiency.cpuPerKW > designAEfficiency.cpuPerKW ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                  {designAEfficiency.cpuPerKW > 0 ? 
                    `${((designBEfficiency.cpuPerKW - designAEfficiency.cpuPerKW) / designAEfficiency.cpuPerKW * 100).toFixed(1)}% difference` :
                    'No comparison available'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};