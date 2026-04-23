
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DesignMetrics, SignificantDifferences, FormatType, BetterDirection } from '@/types/compare';

interface CompareResourceMetricsProps {
  designAName: string;
  designBName: string;
  metricsA: DesignMetrics;
  metricsB: DesignMetrics;
  significantDifferences: SignificantDifferences;
}

export const CompareResourceMetrics: React.FC<CompareResourceMetricsProps> = ({
  designAName: _designAName,
  designBName: _designBName,
  metricsA,
  metricsB,
  significantDifferences
}) => {
  // Helper to calculate percentage difference
  const getPercentDifference = (valueA: number, valueB: number) => {
    if (valueA === 0) return valueB === 0 ? 0 : 100;
    return ((valueB - valueA) / valueA) * 100;
  };
  
  // Helper to format a value with a change indicator
  const formatWithChange = (valueA: number, valueB: number, format: FormatType = 'standard', better: BetterDirection = 'higher') => {
    const percentDiff = getPercentDifference(valueA, valueB);
    const isImprovement = (better === 'lower' && percentDiff < 0) || (better === 'higher' && percentDiff > 0);
    
    let formattedValue;
    if (format === 'decimal') {
      formattedValue = valueB.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else {
      formattedValue = valueB.toLocaleString();
    }
    
    if (Math.abs(percentDiff) < 0.5) {
      return <span>{formattedValue}</span>;
    }
    
    return (
      <div className="flex flex-col">
        <span>{formattedValue}</span>
        <span className={`text-xs ${isImprovement ? 'text-green-500' : 'text-red-500'}`}>
          {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Resource Metrics</h3>
      
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="flex items-center">
          <span>Total vCPUs</span>
          {significantDifferences.totalVCPUs && (
            <Badge variant="outline" className="ml-2">Significant</Badge>
          )}
        </div>
        <div className="text-center">
          {metricsA.totalVCPUs.toLocaleString()}
        </div>
        <div className="text-center">
          {formatWithChange(metricsA.totalVCPUs, metricsB.totalVCPUs)}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="flex items-center">
          <span>Total Memory (TB)</span>
          {significantDifferences.totalMemoryTB && (
            <Badge variant="outline" className="ml-2">Significant</Badge>
          )}
        </div>
        <div className="text-center">
          {metricsA.totalMemoryTB.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
        <div className="text-center">
          {formatWithChange(metricsA.totalMemoryTB, metricsB.totalMemoryTB, 'decimal')}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="flex items-center">
          <span>Total Storage (TB)</span>
          {significantDifferences.totalStorageTB && (
            <Badge variant="outline" className="ml-2">Significant</Badge>
          )}
        </div>
        <div className="text-center">
          {metricsA.totalStorageTB.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
        <div className="text-center">
          {formatWithChange(metricsA.totalStorageTB, metricsB.totalStorageTB, 'decimal')}
        </div>
      </div>
    </div>
  );
};
