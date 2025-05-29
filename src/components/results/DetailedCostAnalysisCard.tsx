
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface DetailedCostAnalysisCardProps {
  capitalCost: number;
  operationalCosts: {
    racksMonthly: number;
    energyMonthly: number;
    amortizedMonthly: number;
    licensingMonthly?: number;
    totalMonthly: number;
  };
  amortizedCostsByType: {
    compute: number;
    storage: number;
    network: number;
    total: number;
  };
  totalCostOfOwnership: number;
  licensingCosts?: {
    oneTime: number;
    monthly: number;
  };
}

export const DetailedCostAnalysisCard: React.FC<DetailedCostAnalysisCardProps> = ({
  capitalCost,
  operationalCosts,
  amortizedCostsByType,
  totalCostOfOwnership,
  licensingCosts
}) => {
  // Calculate first year operational costs (monthly × 12)
  const firstYearOperationalCost = operationalCosts.totalMonthly * 12;

  // Calculate hardware capital cost (excluding licensing)
  const hardwareCapitalCost = licensingCosts ? capitalCost - licensingCosts.oneTime : capitalCost;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Cost Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">1. Capital Costs</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hardware Cost</span>
                <span className="font-medium">${hardwareCapitalCost.toLocaleString()}</span>
              </div>
              {licensingCosts && licensingCosts.oneTime > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">One-time Licensing</span>
                  <span className="font-medium">${licensingCosts.oneTime.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Total Capital Cost</span>
                <span>${capitalCost.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-2">2. Operational Costs (Monthly)</h3>
            <div className="space-y-2">
              {operationalCosts.racksMonthly > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rack Colocation</span>
                  <span className="font-medium">${operationalCosts.racksMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Energy Consumption</span>
                <span className="font-medium">${operationalCosts.energyMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              
              <div className="space-y-1 ml-4">
                <h4 className="text-sm font-medium">Hardware Amortization</h4>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compute Hardware</span>
                  <span className="font-medium">${amortizedCostsByType.compute.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage Hardware</span>
                  <span className="font-medium">${amortizedCostsByType.storage.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network Hardware</span>
                  <span className="font-medium">${amortizedCostsByType.network.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total Amortized</span>
                  <span>${amortizedCostsByType.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {licensingCosts && licensingCosts.monthly > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Licensing and Support</h4>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Licensing & Support</span>
                      <span className="font-medium">${licensingCosts.monthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-between pt-2 border-t font-medium">
                <span>Total Monthly Operational Cost</span>
                <span>${operationalCosts.totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-2">3. Total Cost of Ownership (First Year)</h3>
            <div className="flex justify-between font-bold text-lg">
              <span>First Year Operational Costs</span>
              <span>${firstYearOperationalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Includes 12 months of operational costs (amortization, energy, rack colocation, and licensing)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
