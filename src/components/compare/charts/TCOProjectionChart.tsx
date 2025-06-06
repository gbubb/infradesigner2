import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TCOProjectionChartProps {
  designAName: string;
  designBName: string;
  designACapitalCost: number;
  designBCapitalCost: number;
  designAOperationalCost: number;
  designBOperationalCost: number;
  years?: number;
}

export const TCOProjectionChart: React.FC<TCOProjectionChartProps> = ({
  designAName,
  designBName,
  designACapitalCost,
  designBCapitalCost,
  designAOperationalCost,
  designBOperationalCost,
  years = 5,
}) => {
  // Generate data points for each year
  const data = Array.from({ length: years + 1 }, (_, year) => ({
    year: `Year ${year}`,
    designA: (designACapitalCost || 0) + ((designAOperationalCost || 0) * 12 * year),
    designB: (designBCapitalCost || 0) + ((designBOperationalCost || 0) * 12 * year),
  }));

  const formatCurrency = (value: number) => {
    if (!value || isNaN(value) || !isFinite(value)) return '$0';
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const diff = payload[1].value - payload[0].value;
      const savings = diff < 0 ? Math.abs(diff) : 0;
      
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          {savings > 0 && (
            <p className="text-sm text-green-600 mt-2">
              {designBName} saves: {formatCurrency(savings)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate break-even point if applicable
  const calculateBreakEven = () => {
    if (designACapitalCost === designBCapitalCost) return null;
    
    const monthlyDiff = designBOperationalCost - designAOperationalCost;
    if (monthlyDiff === 0) return null;
    
    const capitalDiff = designBCapitalCost - designACapitalCost;
    const breakEvenMonths = -capitalDiff / (monthlyDiff * 12);
    
    if (breakEvenMonths > 0 && breakEvenMonths <= years) {
      return breakEvenMonths;
    }
    return null;
  };

  const breakEvenYears = calculateBreakEven();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Cost of Ownership (TCO) Projection</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="year" className="text-sm" />
            <YAxis tickFormatter={formatCurrency} className="text-sm" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="designA" 
              name={designAName}
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="designB" 
              name={designBName}
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Summary Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Initial Investment Difference</p>
            <p className="text-lg font-semibold">
              {formatCurrency(Math.abs(designBCapitalCost - designACapitalCost))}
            </p>
            <p className="text-sm text-muted-foreground">
              {designBCapitalCost > designACapitalCost ? `${designBName} costs more upfront` : `${designAName} costs more upfront`}
            </p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Monthly Operational Difference</p>
            <p className="text-lg font-semibold">
              {formatCurrency(Math.abs(designBOperationalCost - designAOperationalCost))}
            </p>
            <p className="text-sm text-muted-foreground">
              {designBOperationalCost > designAOperationalCost ? `${designBName} costs more monthly` : `${designAName} costs more monthly`}
            </p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">{years}-Year TCO Difference</p>
            <p className="text-lg font-semibold">
              {formatCurrency(Math.abs(data[years].designB - data[years].designA))}
            </p>
            <p className="text-sm text-muted-foreground">
              {data[years].designB > data[years].designA ? `${designBName} costs more overall` : `${designAName} costs more overall`}
            </p>
          </div>
        </div>

        {breakEvenYears && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm">
              <span className="font-semibold">Break-even point:</span> The designs reach cost parity after {breakEvenYears.toFixed(1)} years
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};