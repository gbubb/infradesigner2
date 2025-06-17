import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DesignMetrics, SignificantDifferences, FormatType, BetterDirection } from '@/types/compare';

interface CompareCostMetricsProps {
  designAName: string;
  designBName: string;
  metricsA: DesignMetrics;
  metricsB: DesignMetrics;
  significantDifferences: SignificantDifferences;
}

export const CompareCostMetrics: React.FC<CompareCostMetricsProps> = ({
  designAName,
  designBName,
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
  const formatWithChange = (valueA: number, valueB: number, format: FormatType = 'standard', better: BetterDirection = 'lower') => {
    const percentDiff = getPercentDifference(valueA, valueB);
    const isImprovement = (better === 'lower' && percentDiff < 0) || (better === 'higher' && percentDiff > 0);
    
    let formattedValue;
    if (format === 'currency') {
      formattedValue = `$${valueB.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } else if (format === 'decimal') {
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
      <h3 className="text-lg font-medium">Cost Analysis</h3>
      
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="flex items-center">
          <span>Total Capital Cost</span>
          {significantDifferences.totalCost && (
            <Badge variant="outline" className="ml-2">Significant</Badge>
          )}
        </div>
        <div className="text-center">
          ${metricsA.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
        <div className="text-center">
          {formatWithChange(metricsA.totalCost, metricsB.totalCost, 'currency', 'lower')}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="flex items-center">
          <span>Monthly Operational Cost</span>
          {significantDifferences.monthlyCost && (
            <Badge variant="outline" className="ml-2">Significant</Badge>
          )}
        </div>
        <div className="text-center">
          ${metricsA.monthlyCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
        <div className="text-center">
          {formatWithChange(metricsA.monthlyCost, metricsB.monthlyCost, 'currency', 'lower')}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="flex items-center">
          <span>Cost per vCPU</span>
          {significantDifferences.costPerVCPU && (
            <Badge variant="outline" className="ml-2">Significant</Badge>
          )}
        </div>
        <div className="text-center">
          ${metricsA.costPerVCPU.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
        <div className="text-center">
          {formatWithChange(metricsA.costPerVCPU, metricsB.costPerVCPU, 'currency', 'lower')}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="flex items-center">
          <span>Cost per TB</span>
          {significantDifferences.costPerTB && (
            <Badge variant="outline" className="ml-2">Significant</Badge>
          )}
        </div>
        <div className="text-center">
          ${metricsA.costPerTB.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
        <div className="text-center">
          {formatWithChange(metricsA.costPerTB, metricsB.costPerTB, 'currency', 'lower')}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="flex items-center">
          <span>Monthly cost for an average VM</span>
          {significantDifferences.monthlyCostPerAverageVM && (
            <Badge variant="outline" className="ml-2">Significant</Badge>
          )}
        </div>
        <div className="text-center">
          {metricsA.monthlyCostPerAverageVM > 0
            ? `$${metricsA.monthlyCostPerAverageVM.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            : 'N/A'}
        </div>
        <div className="text-center">
          {metricsB.monthlyCostPerAverageVM > 0
            ? formatWithChange(metricsA.monthlyCostPerAverageVM, metricsB.monthlyCostPerAverageVM, 'currency', 'lower')
            : 'N/A'}
        </div>
      </div>
    </div>
  );
};
