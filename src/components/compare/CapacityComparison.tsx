
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { InfrastructureDesign } from "@/types/infrastructure";
import { useDesignComparison } from "@/hooks/design/useDesignComparison";
import { ArrowDownIcon, ArrowUpIcon, Minus } from "lucide-react";

interface CapacityComparisonProps {
  leftDesign: InfrastructureDesign;
  rightDesign: InfrastructureDesign;
}

export function CapacityComparison({ leftDesign, rightDesign }: CapacityComparisonProps) {
  const comparison = useDesignComparison(leftDesign, rightDesign);

  // Helper to format numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Helper to render the difference icon
  const renderDifferenceIcon = (diffPercent: number) => {
    if (Math.abs(diffPercent) < 1) return <Minus className="h-4 w-4 text-gray-500" />;
    if (diffPercent > 0) return <ArrowUpIcon className="h-4 w-4 text-green-500" />;
    return <ArrowDownIcon className="h-4 w-4 text-red-500" />;
  };

  // Helper to get color for difference
  const getDiffColor = (diff: number, higherIsBetter = true) => {
    if (Math.abs(diff) < 1) return "text-gray-500";
    if ((diff > 0 && higherIsBetter) || (diff < 0 && !higherIsBetter)) {
      return "text-green-600";
    }
    return "text-red-600";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Compute capacity comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Compute Capacity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* vCPU Comparison */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">vCPUs</span>
              <div className="flex items-center gap-2">
                <span>{formatNumber(comparison.left.totalVCPUs)}</span>
                <span>vs</span>
                <span className="font-medium">{formatNumber(comparison.right.totalVCPUs)}</span>
                <span className={`flex items-center text-sm ${getDiffColor(comparison.differences.totalVCPUs)}`}>
                  {renderDifferenceIcon(comparison.differences.totalVCPUs)}
                  {Math.abs(comparison.differences.totalVCPUs).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                className="h-2"
                value={comparison.left.totalVCPUs} 
                max={Math.max(comparison.left.totalVCPUs, comparison.right.totalVCPUs)}
              />
              <Progress 
                className="h-2"
                value={comparison.right.totalVCPUs} 
                max={Math.max(comparison.left.totalVCPUs, comparison.right.totalVCPUs)}
              />
            </div>
          </div>

          {/* Memory Comparison */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Memory</span>
              <div className="flex items-center gap-2">
                <span>{formatNumber(comparison.left.totalMemoryGB)} GB</span>
                <span>vs</span>
                <span className="font-medium">{formatNumber(comparison.right.totalMemoryGB)} GB</span>
                <span className={`flex items-center text-sm ${getDiffColor(comparison.differences.totalMemoryGB)}`}>
                  {renderDifferenceIcon(comparison.differences.totalMemoryGB)}
                  {Math.abs(comparison.differences.totalMemoryGB).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                className="h-2"
                value={comparison.left.totalMemoryGB} 
                max={Math.max(comparison.left.totalMemoryGB, comparison.right.totalMemoryGB)}
              />
              <Progress 
                className="h-2"
                value={comparison.right.totalMemoryGB} 
                max={Math.max(comparison.left.totalMemoryGB, comparison.right.totalMemoryGB)}
              />
            </div>
          </div>

          {/* Compute Node Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Compute Nodes</span>
              <div className="flex items-center gap-2">
                <span>{formatNumber(comparison.left.computeNodeCount)}</span>
                <span>vs</span>
                <span className="font-medium">{formatNumber(comparison.right.computeNodeCount)}</span>
                <span className={`flex items-center text-sm ${getDiffColor(comparison.differences.computeNodeCount, false)}`}>
                  {renderDifferenceIcon(comparison.differences.computeNodeCount)}
                  {Math.abs(comparison.differences.computeNodeCount).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                className="h-2"
                value={comparison.left.computeNodeCount} 
                max={Math.max(comparison.left.computeNodeCount, comparison.right.computeNodeCount)}
              />
              <Progress 
                className="h-2"
                value={comparison.right.computeNodeCount} 
                max={Math.max(comparison.left.computeNodeCount, comparison.right.computeNodeCount)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage capacity comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Capacity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total Storage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Storage</span>
              <div className="flex items-center gap-2">
                <span>{formatNumber(comparison.left.totalStorageTB)} TB</span>
                <span>vs</span>
                <span className="font-medium">{formatNumber(comparison.right.totalStorageTB)} TB</span>
                <span className={`flex items-center text-sm ${getDiffColor(comparison.differences.totalStorageTB)}`}>
                  {renderDifferenceIcon(comparison.differences.totalStorageTB)}
                  {Math.abs(comparison.differences.totalStorageTB).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                className="h-2"
                value={comparison.left.totalStorageTB} 
                max={Math.max(comparison.left.totalStorageTB, comparison.right.totalStorageTB)}
              />
              <Progress 
                className="h-2"
                value={comparison.right.totalStorageTB} 
                max={Math.max(comparison.left.totalStorageTB, comparison.right.totalStorageTB)}
              />
            </div>
          </div>

          {/* Storage Nodes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Storage Nodes</span>
              <div className="flex items-center gap-2">
                <span>{formatNumber(comparison.left.storageNodeCount)}</span>
                <span>vs</span>
                <span className="font-medium">{formatNumber(comparison.right.storageNodeCount)}</span>
                <span className={`flex items-center text-sm ${getDiffColor(comparison.differences.storageNodeCount, false)}`}>
                  {renderDifferenceIcon(comparison.differences.storageNodeCount)}
                  {Math.abs(comparison.differences.storageNodeCount).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                className="h-2"
                value={comparison.left.storageNodeCount} 
                max={Math.max(comparison.left.storageNodeCount, comparison.right.storageNodeCount)}
              />
              <Progress 
                className="h-2"
                value={comparison.right.storageNodeCount} 
                max={Math.max(comparison.left.storageNodeCount, comparison.right.storageNodeCount)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Physical Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Physical Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Power Consumption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Power Consumption</span>
              <div className="flex items-center gap-2">
                <span>{formatNumber(comparison.left.totalPower)} W</span>
                <span>vs</span>
                <span className="font-medium">{formatNumber(comparison.right.totalPower)} W</span>
                <span className={`flex items-center text-sm ${getDiffColor(comparison.differences.totalPower, false)}`}>
                  {renderDifferenceIcon(comparison.differences.totalPower)}
                  {Math.abs(comparison.differences.totalPower).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                className="h-2"
                value={comparison.left.totalPower} 
                max={Math.max(comparison.left.totalPower, comparison.right.totalPower)}
              />
              <Progress 
                className="h-2"
                value={comparison.right.totalPower} 
                max={Math.max(comparison.left.totalPower, comparison.right.totalPower)}
              />
            </div>
          </div>

          {/* Rack Units */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rack Units</span>
              <div className="flex items-center gap-2">
                <span>{formatNumber(comparison.left.totalRackUnits)} RU</span>
                <span>vs</span>
                <span className="font-medium">{formatNumber(comparison.right.totalRackUnits)} RU</span>
                <span className={`flex items-center text-sm ${getDiffColor(comparison.differences.totalRackUnits, false)}`}>
                  {renderDifferenceIcon(comparison.differences.totalRackUnits)}
                  {Math.abs(comparison.differences.totalRackUnits).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                className="h-2"
                value={comparison.left.totalRackUnits} 
                max={Math.max(comparison.left.totalRackUnits, comparison.right.totalRackUnits)}
              />
              <Progress 
                className="h-2"
                value={comparison.right.totalRackUnits} 
                max={Math.max(comparison.left.totalRackUnits, comparison.right.totalRackUnits)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
