import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PricingModelService } from '@/services/pricing/pricingModelService';
import { formatMonthlyCurrency } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface PricingCurveChartProps {
  pricingService: PricingModelService;
  config: {
    vmSizeThreshold?: number;
    vmSizeCurveExponent?: number;
    vmSizeAcceleration?: number;
  };
}

export const PricingCurveChart: React.FC<PricingCurveChartProps> = ({ 
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
    
    // Generate data points along the natural ratio
    for (let vCPUs = 1; vCPUs <= 64; vCPUs += (vCPUs < 8 ? 1 : vCPUs < 32 ? 4 : 8)) {
      const memoryGB = vCPUs * naturalRatio;
      const pricing = pricingService.calculateVMPrice(vCPUs, memoryGB, 0);
      
      data.push({
        size: vCPUs,
        monthlyPrice: pricing.monthlyPrice,
        sizePremium: pricing.breakdown.vmSizePenalty * 100,
        ratioPremium: pricing.breakdown.ratioPenalty * 100,
        totalPremium: pricing.breakdown.sizePenalty * 100,
      });
    }
    
    return data;
  }, [pricingService, naturalRatio]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.size} vCPUs / {(data.size * naturalRatio).toFixed(0)} GB RAM</p>
          <p className="text-sm text-muted-foreground">
            Monthly: {formatMonthlyCurrency(data.monthlyPrice)}
          </p>
          <p className="text-sm text-muted-foreground">
            Size Premium: +{data.sizePremium.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground">
            Total Premium: +{data.totalPremium.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const threshold = config.vmSizeThreshold || 4;
  const exponent = config.vmSizeCurveExponent || 2;
  const acceleration = config.vmSizeAcceleration || 0.5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Size Premium Curve (Natural Ratio)
        </CardTitle>
        <CardDescription>
          Pricing along the optimal CPU:Memory ratio showing size premium effect
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={curveData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="size" 
                label={{ value: 'VM Size (vCPUs)', position: 'insideBottom', offset: -5 }}
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
              
              {/* Reference line at threshold */}
              <ReferenceLine 
                x={threshold} 
                stroke="#f59e0b" 
                strokeDasharray="5 5" 
                label="Threshold"
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
              
              {/* Size premium line */}
              <Line
                yAxisId="premium"
                type="monotone"
                dataKey="sizePremium"
                stroke="#ec4899"
                strokeWidth={2}
                name="Size Premium"
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Curve Parameters Display */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Curve Type</p>
              <p className="font-medium">
                {exponent === 1 ? 'Linear' : 
                 exponent === 2 ? 'Quadratic' : 
                 exponent === 3 ? 'Cubic' : 
                 `Power (${exponent.toFixed(1)})`}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Threshold</p>
              <p className="font-medium">{threshold} vCPUs</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Acceleration</p>
              <p className="font-medium">
                {acceleration < 0.3 ? 'Gentle' : 
                 acceleration < 0.7 ? 'Moderate' : 'Aggressive'}
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
            <p>
              This chart shows pricing along the natural CPU:Memory ratio (1:{naturalRatio.toFixed(1)}), 
              demonstrating how the size premium creates an upward curve as VM size increases. 
              The yellow line marks the threshold where premiums begin to apply significantly.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};