import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PricingModelService } from '@/services/pricing/pricingModelService';
import { formatMonthlyCurrency } from '@/lib/utils';
import { Activity } from 'lucide-react';

interface RatioPremiumChartProps {
  pricingService: PricingModelService;
  config: {
    sizePenaltyFactor?: number;
    ratioPenaltyExponent?: number;
  };
}

export const RatioPremiumChart: React.FC<RatioPremiumChartProps> = ({ 
  pricingService,
  config 
}) => {
  // Get the natural ratio from the cluster capacity
  const naturalRatio = useMemo(() => {
    const capacity = pricingService['calculateClusterCapacity']();
    if (capacity.totalvCPUs === 0 || capacity.totalMemoryGB === 0) {
      return 4; // Default fallback if no cluster data
    }
    // Calculate the natural CPU:Memory ratio
    return capacity.totalMemoryGB / capacity.totalvCPUs;
  }, [pricingService]);
  
  const curveData = useMemo(() => {
    const data = [];
    const fixedVCPUs = 8; // Use 8 vCPUs as our fixed size for demonstration
    
    // Generate data points with varying memory to show ratio effect
    const ratios = [
      0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32
    ];
    
    for (const memRatio of ratios) {
      const memoryGB = fixedVCPUs * memRatio;
      const pricing = pricingService.calculateVMPrice(fixedVCPUs, memoryGB, 0);
      const actualRatio = memoryGB / fixedVCPUs;
      const deviationPercent = ((actualRatio - naturalRatio) / naturalRatio) * 100;
      
      data.push({
        ratio: actualRatio,
        memoryGB: memoryGB,
        deviationPercent: deviationPercent,
        monthlyPrice: pricing.monthlyPrice,
        ratioPremium: pricing.breakdown.ratioPenalty * 100,
        totalPremium: pricing.breakdown.sizePenalty * 100,
      });
    }
    
    return data;
  }, [pricingService, naturalRatio]);

  interface TooltipPayload {
    memoryGB: number;
    ratio: number;
    deviationPercent: number;
    monthlyPrice: number;
    premium: number;
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: TooltipPayload }> }) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">8 vCPUs / {data.memoryGB.toFixed(0)} GB RAM</p>
          <p className="text-sm text-muted-foreground">
            Ratio: 1:{data.ratio.toFixed(1)}
          </p>
          <p className="text-sm text-muted-foreground">
            Deviation: {data.deviationPercent > 0 ? '+' : ''}{data.deviationPercent.toFixed(0)}%
          </p>
          <p className="text-sm text-muted-foreground">
            Monthly: {formatMonthlyCurrency(data.monthlyPrice)}
          </p>
          <p className="text-sm text-muted-foreground">
            Ratio Premium: +{data.ratioPremium.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const penaltyFactor = config.sizePenaltyFactor || 0.5;
  const exponent = config.ratioPenaltyExponent || 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Ratio Premium Curve
        </CardTitle>
        <CardDescription>
          Pricing premium applied when CPU:Memory ratio deviates from the natural ratio (1:{naturalRatio.toFixed(1)})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={curveData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="ratio" 
                label={{ value: 'Memory per vCPU Ratio', position: 'insideBottom', offset: -5 }}
                tickFormatter={(value) => `1:${value.toFixed(0)}`}
              />
              <YAxis 
                yAxisId="price"
                label={{ value: 'Monthly Price ($)', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <YAxis 
                yAxisId="premium"
                orientation="right"
                label={{ value: 'Premium (%)', angle: 90, position: 'insideRight' }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Reference line at natural ratio */}
              <ReferenceLine 
                x={naturalRatio} 
                stroke="#10b981" 
                strokeDasharray="5 5" 
                label={`Natural Ratio (1:${naturalRatio.toFixed(1)})`}
                yAxisId="price"
              />
              
              {/* Monthly price line */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="monthlyPrice"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Monthly Price"
                dot={false}
              />
              
              {/* Ratio premium line */}
              <Line
                yAxisId="premium"
                type="monotone"
                dataKey="ratioPremium"
                stroke="#f97316"
                strokeWidth={2}
                name="Ratio Premium"
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Curve Parameters Display */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Penalty Factor</p>
              <p className="font-medium">{(penaltyFactor * 100).toFixed(0)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Curve Type</p>
              <p className="font-medium">
                {exponent === 1 ? 'Linear' : 
                 exponent === 2 ? 'Quadratic' : 
                 exponent === 3 ? 'Cubic' : 
                 `Power (${exponent.toFixed(1)})`}
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
            <p>
              This chart shows how pricing increases when VM configurations deviate from the natural 
              CPU:Memory ratio. The green line marks the optimal ratio based on your infrastructure. 
              VMs that are either CPU-heavy (low ratio) or memory-heavy (high ratio) incur additional 
              premiums due to resource imbalance.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};