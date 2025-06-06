import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BreakEvenIndicatorsProps {
  marginBreakEvenMonth: number | null;
  profitBreakEvenMonth: number | null;
}

export const BreakEvenIndicators: React.FC<BreakEvenIndicatorsProps> = ({
  marginBreakEvenMonth,
  profitBreakEvenMonth
}) => {
  if (marginBreakEvenMonth === null && profitBreakEvenMonth === null) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Break-even Points</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {marginBreakEvenMonth !== null && isFinite(marginBreakEvenMonth) && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded-full" />
              <div>
                <p className="text-sm font-medium">Monthly Margin Positive</p>
                <p className="text-2xl font-bold">{marginBreakEvenMonth.toFixed(1)} months</p>
              </div>
            </div>
          )}
          {profitBreakEvenMonth !== null && isFinite(profitBreakEvenMonth) && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full" />
              <div>
                <p className="text-sm font-medium">Cumulative Profit Positive</p>
                <p className="text-2xl font-bold">{profitBreakEvenMonth.toFixed(1)} months</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};