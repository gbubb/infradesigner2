
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
    return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
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
    </div>
  );
}
