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
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Operational Cost Alignment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Results Total</span>
            <div className="font-medium">${resultsTotal.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Model Total</span>
            <div className="font-medium">${modelTotal.toLocaleString()}</div>
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
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Overall Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Revenue</div>
              <div className="font-medium text-green-600">${totalRevenue.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Costs</div>
              <div className="font-medium text-red-600">${totalCosts.toLocaleString()}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Profit</div>
              <div className={`font-medium ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalProfit.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Margin</div>
              <div className={`font-medium ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitMargin.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="col-span-2 text-xs text-muted-foreground text-center pt-1 border-t">
            Annual Profit: ${(totalProfit * 12).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
