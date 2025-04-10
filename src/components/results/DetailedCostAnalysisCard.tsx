
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

interface DetailedCostAnalysisCardProps {
  totalCost: number;
  componentsByType: Record<string, InfrastructureComponent[]>;
  monthlyEnergyCost: number;
  monthlyColoCost: number;
  totalRackQuantity: number;
}

export const DetailedCostAnalysisCard: React.FC<DetailedCostAnalysisCardProps> = ({
  totalCost,
  componentsByType,
  monthlyEnergyCost,
  monthlyColoCost,
  totalRackQuantity,
}) => {
  const formatCost = (amount: number) => {
    return `€${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate total costs by type
  const costsByType: Record<string, number> = {};
  Object.entries(componentsByType).forEach(([type, components]) => {
    costsByType[type] = components.reduce(
      (sum, comp) => sum + comp.cost * (comp.quantity || 1), 
      0
    );
  });

  // Calculate total capital cost
  const totalCapitalCost = Object.values(costsByType).reduce((sum, cost) => sum + cost, 0);
  
  // Calculate total operational cost (monthly)
  const totalOperationalCost = monthlyEnergyCost + monthlyColoCost;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Detailed Cost Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Capital Costs */}
          <div>
            <h3 className="text-lg font-medium mb-4">Capital Costs</h3>
            <dl className="space-y-3">
              {Object.entries(costsByType).map(([type, cost]) => (
                <div key={type} className="flex justify-between">
                  <dt className="text-muted-foreground capitalize">{type}</dt>
                  <dd className="font-medium">{formatCost(cost)}</dd>
                </div>
              ))}
              <div className="pt-3 border-t flex justify-between">
                <dt className="font-medium">Total Capital Cost</dt>
                <dd className="font-bold">{formatCost(totalCapitalCost)}</dd>
              </div>
            </dl>
          </div>

          {/* Operational Costs */}
          <div>
            <h3 className="text-lg font-medium mb-4">Operational Costs (Monthly)</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Energy Consumption</dt>
                <dd className="font-medium">{formatCost(monthlyEnergyCost)}</dd>
              </div>
              {monthlyColoCost > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Colocation ({totalRackQuantity} rack{totalRackQuantity !== 1 ? 's' : ''})
                  </dt>
                  <dd className="font-medium">{formatCost(monthlyColoCost)}</dd>
                </div>
              )}
              <div className="pt-3 border-t flex justify-between">
                <dt className="font-medium">Total Monthly Operational Cost</dt>
                <dd className="font-bold">{formatCost(totalOperationalCost)}</dd>
              </div>
            </dl>

            {/* Annual operational cost */}
            <div className="mt-4 pt-3 border-t flex justify-between">
              <span className="font-medium">Annual Operational Cost</span>
              <span className="font-bold">{formatCost(totalOperationalCost * 12)}</span>
            </div>

            {/* 3-Year TCO */}
            <div className="mt-4 pt-3 border-t flex justify-between">
              <span className="font-medium">3-Year Total Cost of Ownership (TCO)</span>
              <span className="font-bold">{formatCost(totalCapitalCost + (totalOperationalCost * 36))}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
