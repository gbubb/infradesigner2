
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { InfrastructureDesign } from "@/types/infrastructure";
import { useDesignComparison } from "@/hooks/design/useDesignComparison";
import { ArrowDownIcon, ArrowUpIcon, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CostComparisonProps {
  leftDesign: InfrastructureDesign;
  rightDesign: InfrastructureDesign;
}

export function CostComparison({ leftDesign, rightDesign }: CostComparisonProps) {
  const comparison = useDesignComparison(leftDesign, rightDesign);

  // Helper to format numbers with commas
  const formatCurrency = (num: number) => {
    return `€${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  // Helper to render the difference icon
  const renderDifferenceIcon = (diffPercent: number, lowerIsBetter = true) => {
    if (Math.abs(diffPercent) < 1) return <Minus className="h-4 w-4 text-gray-500" />;
    if ((diffPercent < 0 && lowerIsBetter) || (diffPercent > 0 && !lowerIsBetter)) {
      return <ArrowDownIcon className="h-4 w-4 text-green-500" />;
    }
    return <ArrowUpIcon className="h-4 w-4 text-red-500" />;
  };

  // Helper to get color for difference
  const getDiffColor = (diff: number, lowerIsBetter = true) => {
    if (Math.abs(diff) < 1) return "text-gray-500";
    if ((diff < 0 && lowerIsBetter) || (diff > 0 && !lowerIsBetter)) {
      return "text-green-600";
    }
    return "text-red-600";
  };

  // Prepare chart data
  const costBreakdownData = [
    {
      name: leftDesign.name,
      Compute: comparison.left.computeCost,
      Storage: comparison.left.storageCost,
      Network: comparison.left.networkCost
    },
    {
      name: rightDesign.name,
      Compute: comparison.right.computeCost,
      Storage: comparison.right.storageCost,
      Network: comparison.right.networkCost
    }
  ];
  
  // Calculate operational costs for each design
  const calculateOperationalCosts = (design: InfrastructureDesign) => {
    if (!design.components || design.components.length === 0) {
      return {
        monthlyEnergyCost: 0,
        monthlyColoCost: 0,
        annualOperationalCost: 0,
        threeYearTCO: 0,
        capitalCost: 0,
      };
    }
    
    // Calculate power components
    const operationalLoadPercent = design.requirements?.physicalConstraints?.operationalCosts?.operationalLoad || 50;
    const operationalLoadFraction = operationalLoadPercent / 100;
    const energyPricePerKwh = design.requirements?.physicalConstraints?.operationalCosts?.energyPricePerKwh || 0.25;
    
    // Calculate capital cost (sum of all component costs)
    const capitalCost = design.components.reduce((sum, comp) => {
      const quantity = comp.quantity || 1;
      return sum + (comp.cost * quantity);
    }, 0);
    
    // Calculate power metrics
    let totalMaxPower = 0;
    let totalMinPower = 0;
    let totalOperationalPower = 0;
    
    design.components.forEach(component => {
      const quantity = component.quantity || 1;
      const maxPower = component.powerRequired * quantity;
      
      totalMaxPower += maxPower;
      totalMinPower += maxPower / 3;
      
      const remainingPower = maxPower - (maxPower / 3);
      totalOperationalPower += (maxPower / 3) + (operationalLoadFraction * remainingPower);
    });
    
    // Calculate energy costs
    const operationalPowerKw = totalOperationalPower / 1000; // Convert watts to kilowatts
    const dailyEnergyCost = operationalPowerKw * 24 * energyPricePerKwh;
    const monthlyEnergyCost = dailyEnergyCost * 30; // Assuming 30 days per month
    
    // Calculate colocation costs if enabled
    let monthlyColoCost = 0;
    const totalRackQuantity = (design.requirements?.physicalConstraints?.computeStorageRackQuantity || 0) +
      (design.requirements?.networkRequirements?.dedicatedNetworkCoreRacks ? 2 : 0);
      
    if (design.requirements?.physicalConstraints?.operationalCosts?.coloRacks) {
      const rackCostPerMonth = design.requirements?.physicalConstraints?.operationalCosts?.rackCostPerMonth || 0;
      monthlyColoCost = totalRackQuantity * rackCostPerMonth;
    }
    
    const monthlyOperationalCost = monthlyEnergyCost + monthlyColoCost;
    const annualOperationalCost = monthlyOperationalCost * 12;
    const threeYearTCO = capitalCost + (annualOperationalCost * 3);
    
    return {
      monthlyEnergyCost,
      monthlyColoCost,
      annualOperationalCost,
      threeYearTCO,
      capitalCost,
    };
  };
  
  const leftOpCosts = calculateOperationalCosts(leftDesign);
  const rightOpCosts = calculateOperationalCosts(rightDesign);
  
  // Calculate percentage differences for operational costs
  const calculateDifference = (left: number, right: number) => {
    if (left === 0 && right === 0) return 0;
    if (left === 0) return 100; // Right is infinitely more
    return ((right - left) / left) * 100;
  };
  
  const opCostDifferences = {
    monthlyEnergyCost: calculateDifference(leftOpCosts.monthlyEnergyCost, rightOpCosts.monthlyEnergyCost),
    monthlyColoCost: calculateDifference(leftOpCosts.monthlyColoCost, rightOpCosts.monthlyColoCost),
    annualOperationalCost: calculateDifference(leftOpCosts.annualOperationalCost, rightOpCosts.annualOperationalCost),
    threeYearTCO: calculateDifference(leftOpCosts.threeYearTCO, rightOpCosts.threeYearTCO),
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Total Cost Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Total Cost</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Cost</span>
              <div className="flex items-center gap-2">
                <span>{formatCurrency(comparison.left.totalCost)}</span>
                <span>vs</span>
                <span className="font-medium">{formatCurrency(comparison.right.totalCost)}</span>
                <span className={`flex items-center text-sm ${getDiffColor(comparison.differences.totalCost)}`}>
                  {renderDifferenceIcon(comparison.differences.totalCost)}
                  {Math.abs(comparison.differences.totalCost).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                className="h-2"
                value={comparison.left.totalCost} 
                max={Math.max(comparison.left.totalCost, comparison.right.totalCost)}
              />
              <Progress 
                className="h-2"
                value={comparison.right.totalCost} 
                max={Math.max(comparison.left.totalCost, comparison.right.totalCost)}
              />
            </div>
          </div>
          
          {/* Cost breakdown chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={costBreakdownData}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip
                  formatter={(value) => [`€${Number(value).toLocaleString()}`, '']}
                />
                <Legend />
                <Bar dataKey="Compute" fill="#8884d8" stackId="a" name="Compute" />
                <Bar dataKey="Storage" fill="#82ca9d" stackId="a" name="Storage" />
                <Bar dataKey="Network" fill="#ffc658" stackId="a" name="Network" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Unit Economics Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Economics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cost per vCPU */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cost per vCPU</span>
              <div className="flex items-center gap-2">
                <span>{formatCurrency(comparison.left.costPerVCPU)}</span>
                <span>vs</span>
                <span className="font-medium">{formatCurrency(comparison.right.costPerVCPU)}</span>
                <span className={`flex items-center text-sm ${getDiffColor(comparison.differences.costPerVCPU)}`}>
                  {renderDifferenceIcon(comparison.differences.costPerVCPU)}
                  {Math.abs(comparison.differences.costPerVCPU).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                className="h-2"
                value={comparison.left.costPerVCPU} 
                max={Math.max(comparison.left.costPerVCPU, comparison.right.costPerVCPU)}
              />
              <Progress 
                className="h-2"
                value={comparison.right.costPerVCPU} 
                max={Math.max(comparison.left.costPerVCPU, comparison.right.costPerVCPU)}
              />
            </div>
          </div>

          {/* Cost per TB */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cost per TB Storage</span>
              <div className="flex items-center gap-2">
                <span>{formatCurrency(comparison.left.costPerStorageTB)}</span>
                <span>vs</span>
                <span className="font-medium">{formatCurrency(comparison.right.costPerStorageTB)}</span>
                <span className={`flex items-center text-sm ${getDiffColor(comparison.differences.costPerStorageTB)}`}>
                  {renderDifferenceIcon(comparison.differences.costPerStorageTB)}
                  {Math.abs(comparison.differences.costPerStorageTB).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                className="h-2"
                value={comparison.left.costPerStorageTB} 
                max={Math.max(comparison.left.costPerStorageTB, comparison.right.costPerStorageTB)}
              />
              <Progress 
                className="h-2"
                value={comparison.right.costPerStorageTB} 
                max={Math.max(comparison.left.costPerStorageTB, comparison.right.costPerStorageTB)}
              />
            </div>
          </div>

          {/* Component cost breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Component Cost Breakdown</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{leftDesign.name}</p>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt>Compute:</dt>
                    <dd>{formatCurrency(comparison.left.computeCost)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Storage:</dt>
                    <dd>{formatCurrency(comparison.left.storageCost)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Network:</dt>
                    <dd>{formatCurrency(comparison.left.networkCost)}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{rightDesign.name}</p>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt>Compute:</dt>
                    <dd>{formatCurrency(comparison.right.computeCost)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Storage:</dt>
                    <dd>{formatCurrency(comparison.right.storageCost)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Network:</dt>
                    <dd>{formatCurrency(comparison.right.networkCost)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* TCO Comparison */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Total Cost of Ownership Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-medium mb-3">{leftDesign.name}</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Capital Expenditure</dt>
                  <dd className="font-medium">{formatCurrency(leftOpCosts.capitalCost)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Monthly Energy Cost</dt>
                  <dd className="font-medium">{formatCurrency(leftOpCosts.monthlyEnergyCost)}</dd>
                </div>
                {leftOpCosts.monthlyColoCost > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Monthly Colocation Cost</dt>
                    <dd className="font-medium">{formatCurrency(leftOpCosts.monthlyColoCost)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Annual Operational Cost</dt>
                  <dd className="font-medium">{formatCurrency(leftOpCosts.annualOperationalCost)}</dd>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <dt className="font-medium">3-Year Total Cost of Ownership</dt>
                  <dd className="font-bold">{formatCurrency(leftOpCosts.threeYearTCO)}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-3">{rightDesign.name}</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Capital Expenditure</dt>
                  <dd className="font-medium">{formatCurrency(rightOpCosts.capitalCost)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Monthly Energy Cost</dt>
                  <dd className="font-medium">
                    {formatCurrency(rightOpCosts.monthlyEnergyCost)}
                    {Math.abs(opCostDifferences.monthlyEnergyCost) > 1 && (
                      <span className={`ml-2 text-xs ${getDiffColor(opCostDifferences.monthlyEnergyCost)}`}>
                        {opCostDifferences.monthlyEnergyCost > 0 ? '+' : ''}
                        {opCostDifferences.monthlyEnergyCost.toFixed(1)}%
                      </span>
                    )}
                  </dd>
                </div>
                {(rightOpCosts.monthlyColoCost > 0 || leftOpCosts.monthlyColoCost > 0) && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Monthly Colocation Cost</dt>
                    <dd className="font-medium">
                      {formatCurrency(rightOpCosts.monthlyColoCost)}
                      {Math.abs(opCostDifferences.monthlyColoCost) > 1 && rightOpCosts.monthlyColoCost > 0 && leftOpCosts.monthlyColoCost > 0 && (
                        <span className={`ml-2 text-xs ${getDiffColor(opCostDifferences.monthlyColoCost)}`}>
                          {opCostDifferences.monthlyColoCost > 0 ? '+' : ''}
                          {opCostDifferences.monthlyColoCost.toFixed(1)}%
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Annual Operational Cost</dt>
                  <dd className="font-medium">
                    {formatCurrency(rightOpCosts.annualOperationalCost)}
                    {Math.abs(opCostDifferences.annualOperationalCost) > 1 && (
                      <span className={`ml-2 text-xs ${getDiffColor(opCostDifferences.annualOperationalCost)}`}>
                        {opCostDifferences.annualOperationalCost > 0 ? '+' : ''}
                        {opCostDifferences.annualOperationalCost.toFixed(1)}%
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <dt className="font-medium">3-Year Total Cost of Ownership</dt>
                  <dd className="font-bold">
                    {formatCurrency(rightOpCosts.threeYearTCO)}
                    {Math.abs(opCostDifferences.threeYearTCO) > 1 && (
                      <span className={`ml-2 text-xs ${getDiffColor(opCostDifferences.threeYearTCO)}`}>
                        {opCostDifferences.threeYearTCO > 0 ? '+' : ''}
                        {opCostDifferences.threeYearTCO.toFixed(1)}%
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
