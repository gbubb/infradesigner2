
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OperationalCostAlignmentProps {
  resultsTotal: number;
  modelTotal: number;
}

interface OverallAnalysisProps {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  profitMargin: number;
}

export const OperationalCostAlignmentCard: React.FC<OperationalCostAlignmentProps> = ({
  resultsTotal,
  modelTotal
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operational Cost Alignment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Results Function Total:</span>
            <div className="font-medium">€{resultsTotal.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Model Function Total:</span>
            <div className="font-medium">€{modelTotal.toLocaleString()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const OverallSummaryCard: React.FC<OverallAnalysisProps> = ({
  totalRevenue,
  totalCosts,
  totalProfit,
  profitMargin
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall Revenue & Profit Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <h4 className="font-medium text-green-600">Total Revenue</h4>
            <div className="font-medium text-xl">€{totalRevenue.toLocaleString()}</div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-red-600">Total Costs</h4>
            <div className="font-medium text-xl">€{totalCosts.toLocaleString()}</div>
          </div>
          
          <div className="space-y-2">
            <h4 className={`font-medium ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Net Profit/Loss
            </h4>
            <div className={`font-medium text-xl ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{totalProfit.toLocaleString()}
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-blue-600">Profit Margin</h4>
            <div className={`font-medium text-xl ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitMargin.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Annual: €{(totalProfit * 12).toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
