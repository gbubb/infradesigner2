
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DesignMetrics, SignificantDifferences, FormatType, BetterDirection } from '@/types/compare';

interface ComparePowerMetricsProps {
  designAName: string;
  designBName: string;
  metricsA: DesignMetrics;
  metricsB: DesignMetrics;
  significantDifferences: SignificantDifferences;
}

export const ComparePowerMetrics: React.FC<ComparePowerMetricsProps> = ({
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
    if (format === 'decimal') {
      formattedValue = valueB.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else if (format === 'currency') {
      formattedValue = `€${valueB.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } else if (format === 'power') {
      formattedValue = `${valueB.toLocaleString()} W`;
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
      <h3 className="text-lg font-medium">Power & Energy</h3>
      
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="flex items-center">
          <span>Maximum Power</span>
          {significantDifferences.totalPower && (
            <Badge variant="outline" className="ml-2">Significant</Badge>
          )}
        </div>
        <div className="text-center">
          {metricsA.maximumPower.toLocaleString()} W
        </div>
        <div className="text-center">
          {formatWithChange(metricsA.maximumPower, metricsB.maximumPower, 'power', 'lower')}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="flex items-center">
          <span>Operational Power</span>
        </div>
        <div className="text-center">
          {metricsA.operationalPower.toLocaleString()} W
        </div>
        <div className="text-center">
          {formatWithChange(metricsA.operationalPower, metricsB.operationalPower, 'power', 'lower')}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="flex items-center">
          <span>Monthly Energy Cost</span>
        </div>
        <div className="text-center">
          €{metricsA.energyCostMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
        <div className="text-center">
          {formatWithChange(metricsA.energyCostMonthly, metricsB.energyCostMonthly, 'currency', 'lower')}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="flex items-center">
          <span>Power Efficiency (vCPUs per kW)</span>
        </div>
        <div className="text-center">
          {(metricsA.totalVCPUs / (metricsA.operationalPower / 1000)).toLocaleString(undefined, { maximumFractionDigits: 1 })}
        </div>
        <div className="text-center">
          {formatWithChange(
            metricsA.totalVCPUs / (metricsA.operationalPower / 1000),
            metricsB.totalVCPUs / (metricsB.operationalPower / 1000),
            'decimal',
            'higher'
          )}
        </div>
      </div>
    </div>
  );
};
