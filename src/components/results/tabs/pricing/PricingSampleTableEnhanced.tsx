import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VMPricing, PricingModelService } from '@/services/pricing/pricingModelService';
import { formatPreciseCurrency, formatMonthlyCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChartIcon } from 'lucide-react';

interface PricingSampleTableEnhancedProps {
  pricingService: PricingModelService;
}

type FlavorType = 'balanced' | 'cpu-optimized' | 'memory-optimized';

interface FlavorConfig {
  name: string;
  description: string;
  specs: Array<{ vCPU: number; memoryGB: number; name: string }>;
}

const flavorConfigs: Record<FlavorType, FlavorConfig> = {
  'balanced': {
    name: 'Balanced',
    description: 'Standard 1:4 ratio (vCPU:Memory)',
    specs: [
      { vCPU: 1, memoryGB: 4, name: 'Small' },
      { vCPU: 2, memoryGB: 8, name: 'Medium' },
      { vCPU: 4, memoryGB: 16, name: 'Large' },
      { vCPU: 8, memoryGB: 32, name: 'XLarge' },
      { vCPU: 16, memoryGB: 64, name: '2XLarge' },
      { vCPU: 32, memoryGB: 128, name: '4XLarge' },
      { vCPU: 48, memoryGB: 192, name: '6XLarge' },
      { vCPU: 64, memoryGB: 256, name: '8XLarge' },
    ]
  },
  'cpu-optimized': {
    name: 'CPU Optimized',
    description: 'Compute-intensive 1:2 ratio',
    specs: [
      { vCPU: 2, memoryGB: 4, name: 'C.Small' },
      { vCPU: 4, memoryGB: 8, name: 'C.Medium' },
      { vCPU: 8, memoryGB: 16, name: 'C.Large' },
      { vCPU: 16, memoryGB: 32, name: 'C.XLarge' },
      { vCPU: 32, memoryGB: 64, name: 'C.2XLarge' },
      { vCPU: 48, memoryGB: 96, name: 'C.3XLarge' },
      { vCPU: 64, memoryGB: 128, name: 'C.4XLarge' },
      { vCPU: 96, memoryGB: 192, name: 'C.6XLarge' },
    ]
  },
  'memory-optimized': {
    name: 'Memory Optimized',
    description: 'Memory-intensive 1:8 ratio',
    specs: [
      { vCPU: 2, memoryGB: 16, name: 'M.Small' },
      { vCPU: 4, memoryGB: 32, name: 'M.Medium' },
      { vCPU: 8, memoryGB: 64, name: 'M.Large' },
      { vCPU: 16, memoryGB: 128, name: 'M.XLarge' },
      { vCPU: 32, memoryGB: 256, name: 'M.2XLarge' },
      { vCPU: 48, memoryGB: 384, name: 'M.3XLarge' },
      { vCPU: 64, memoryGB: 512, name: 'M.4XLarge' },
      { vCPU: 96, memoryGB: 768, name: 'M.6XLarge' },
    ]
  }
};

const CostBreakdownPieChart: React.FC<{ pricing: VMPricing; currency: string }> = ({ pricing, currency }) => {
  const data = [
    {
      name: 'Compute',
      value: pricing.breakdown.computeCost,
      color: '#3b82f6',
    },
    {
      name: 'Memory',
      value: pricing.breakdown.networkCost,
      color: '#10b981',
    },
    {
      name: 'Storage',
      value: pricing.breakdown.storageCost,
      color: '#f59e0b',
    },
    {
      name: 'Licensing',
      value: pricing.breakdown.licensingCost,
      color: '#8b5cf6',
    },
  ].filter(item => item.value > 0);

  const totalBaseCost = data.reduce((sum, item) => sum + item.value, 0);
  const ratioPremiumCost = totalBaseCost * pricing.breakdown.ratioPenalty;
  const sizePremiumCost = totalBaseCost * pricing.breakdown.vmSizePenalty;
  
  if (ratioPremiumCost > 0) {
    data.push({
      name: 'Ratio Premium',
      value: ratioPremiumCost,
      color: '#ef4444',
    });
  }
  
  if (sizePremiumCost > 0) {
    data.push({
      name: 'Size Premium',
      value: sizePremiumCost,
      color: '#ec4899',
    });
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string }> }) => {
    if (active && payload && payload[0]) {
      const value = payload[0].value;
      const percentage = ((value / pricing.baseHourlyPrice) * 100).toFixed(1);
      
      return (
        <div className="bg-background border rounded-lg shadow-lg p-2">
          <p className="text-xs font-medium">{payload[0].name}</p>
          <p className="text-xs text-muted-foreground">
            {formatPreciseCurrency(value, currency)}/hr ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="space-y-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-medium">
              {formatPreciseCurrency(item.value, currency)}/hr
            </span>
          </div>
        ))}
      </div>
      
      <div className="border-t pt-2 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Hourly:</span>
          <span className="font-bold">{formatPreciseCurrency(pricing.baseHourlyPrice, currency)}/hr</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Monthly:</span>
          <span className="font-bold text-green-600">
            {formatMonthlyCurrency(pricing.monthlyPrice, currency)}/mo
          </span>
        </div>
      </div>
    </div>
  );
};

export const PricingSampleTableEnhanced: React.FC<PricingSampleTableEnhancedProps> = ({
  pricingService
}) => {
  const [selectedFlavor, setSelectedFlavor] = useState<FlavorType>('balanced');
  const currency = useCurrency();
  
  const calculatedPrices = useMemo(() => {
    const config = flavorConfigs[selectedFlavor];
    return config.specs.map(spec => ({
      ...spec,
      pricing: pricingService.calculateVMPrice(spec.vCPU, spec.memoryGB, 100)
    }));
  }, [pricingService, selectedFlavor]);

  const getSizeBadgeColor = (vCPU: number) => {
    if (vCPU <= 2) return 'default';
    if (vCPU <= 8) return 'secondary';
    if (vCPU <= 16) return 'outline';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sample VM Pricing</CardTitle>
            <CardDescription>
              {flavorConfigs[selectedFlavor].description}
            </CardDescription>
          </div>
          <Select value={selectedFlavor} onValueChange={(v) => setSelectedFlavor(v as FlavorType)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balanced">Balanced Flavors</SelectItem>
              <SelectItem value="cpu-optimized">CPU Optimized</SelectItem>
              <SelectItem value="memory-optimized">Memory Optimized</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Size</TableHead>
              <TableHead className="text-center">vCPUs</TableHead>
              <TableHead className="text-center">Memory (GB)</TableHead>
              <TableHead className="text-right">Hourly</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead className="text-center">Premiums</TableHead>
              <TableHead className="text-center">Cost Breakdown</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calculatedPrices.map((item, index) => {
              const badgeColor = getSizeBadgeColor(item.vCPU);
              
              return (
                <TableRow key={index}>
                  <TableCell>
                    <Badge variant={badgeColor as 'default' | 'secondary' | 'outline' | 'destructive'}>
                      {item.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">{item.vCPU}</TableCell>
                  <TableCell className="text-center font-medium">{item.memoryGB}</TableCell>
                  <TableCell className="text-right">
                    {formatPreciseCurrency(item.pricing.baseHourlyPrice, currency)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatMonthlyCurrency(item.pricing.monthlyPrice, currency)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      {item.pricing.breakdown.ratioPenalty > 0.01 && (
                        <span className="text-xs text-orange-600">
                          R: +{(item.pricing.breakdown.ratioPenalty * 100).toFixed(0)}%
                        </span>
                      )}
                      {item.pricing.breakdown.vmSizePenalty > 0.01 && (
                        <span className="text-xs text-purple-600">
                          S: +{(item.pricing.breakdown.vmSizePenalty * 100).toFixed(0)}%
                        </span>
                      )}
                      {item.pricing.breakdown.ratioPenalty <= 0.01 && 
                       item.pricing.breakdown.vmSizePenalty <= 0.01 && (
                        <span className="text-xs text-green-600">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <PieChartIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">
                            Cost Breakdown - {item.name}
                          </h4>
                          <CostBreakdownPieChart pricing={item.pricing} currency={currency} />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Legend:</strong> R = Ratio Premium (deviation from natural CPU:Memory ratio), 
            S = Size Premium (large VM scheduling penalty). 
            Click the pie chart icon to see detailed cost breakdown for each flavor.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};