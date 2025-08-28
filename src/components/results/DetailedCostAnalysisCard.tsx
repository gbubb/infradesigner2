
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface DetailedCostAnalysisCardProps {
  capitalCost: number;
  operationalCosts: {
    racksMonthly: number;
    facilityMonthly?: number;
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
  facilityType?: 'none' | 'colocation' | 'owned';
  facilityCosts?: {
    totalMonthlyCost: number;
    costPerRack: number;
    costPerKW: number;
    costLayerBreakdowns?: Array<{
      layerName: string;
      monthlyAmount: number;
    }>;
  };
  lifespans?: {
    compute: number;
    storage: number;
    network: number;
  };
}

const DetailedCostAnalysisCardComponent: React.FC<DetailedCostAnalysisCardProps> = ({
  capitalCost,
  operationalCosts,
  amortizedCostsByType,
  totalCostOfOwnership,
  licensingCosts,
  facilityType = 'none',
  facilityCosts,
  lifespans = { compute: 3, storage: 3, network: 3 }
}) => {
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
              {/* Facility Costs Section */}
              {facilityType === 'colocation' && operationalCosts.racksMonthly > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rack Colocation</span>
                  <span className="font-medium">${operationalCosts.racksMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              
              {facilityType === 'owned' && operationalCosts.facilityMonthly !== undefined && operationalCosts.facilityMonthly > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Datacenter Facility</span>
                    <span className="font-medium">${operationalCosts.facilityMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  {facilityCosts?.costLayerBreakdowns && facilityCosts.costLayerBreakdowns.length > 0 && (
                    <div className="ml-4 space-y-1 text-sm">
                      {facilityCosts.costLayerBreakdowns.slice(0, 3).map((layer, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{layer.layerName}</span>
                          <span>${layer.monthlyAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                      ))}
                      {facilityCosts.costLayerBreakdowns.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{facilityCosts.costLayerBreakdowns.length - 3} more...</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {facilityType !== 'owned' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Energy Consumption</span>
                  <span className="font-medium">${operationalCosts.energyMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              
              <div className="space-y-1 ml-4">
                <h4 className="text-sm font-medium">Hardware Amortization</h4>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compute Hardware ({lifespans.compute} year lifespan)</span>
                  <span className="font-medium">${amortizedCostsByType.compute.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage Hardware ({lifespans.storage} year lifespan)</span>
                  <span className="font-medium">${amortizedCostsByType.storage.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network Hardware ({lifespans.network} year lifespan)</span>
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
        </div>
      </CardContent>
    </Card>
  );
};

export const DetailedCostAnalysisCard = React.memo(DetailedCostAnalysisCardComponent);
