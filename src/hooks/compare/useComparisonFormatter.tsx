import React, { ReactElement } from 'react';
import { formatNumber, formatCurrency, formatPower, formatPercentage } from '@/lib/formatters';

export type FormatType = 'standard' | 'decimal' | 'currency' | 'power' | 'percentage';
export type BetterDirection = 'higher' | 'lower';

interface FormatterOptions {
  decimals?: number;
  showCurrencyDecimals?: boolean;
}

/**
 * Hook for formatting comparison values with change indicators
 * Provides consistent formatting across all comparison views
 */
export function useComparisonFormatter() {
  
  /**
   * Calculate percentage difference between two values
   */
  const getPercentDifference = (valueA: number, valueB: number): number => {
    if (valueA === 0) return valueB === 0 ? 0 : 100;
    return ((valueB - valueA) / valueA) * 100;
  };

  /**
   * Format a single value based on the format type
   */
  const formatValue = (
    value: number, 
    format: FormatType = 'standard',
    options?: FormatterOptions
  ): string => {
    switch (format) {
      case 'currency':
        return formatCurrency(value, 'USD', options?.showCurrencyDecimals);
      case 'power':
        return formatPower(value, options?.decimals ?? 2);
      case 'percentage':
        return formatPercentage(value, options?.decimals ?? 1);
      case 'decimal':
        return formatNumber(value, { 
          minimumFractionDigits: 0,
          maximumFractionDigits: options?.decimals ?? 2 
        });
      case 'standard':
      default:
        return formatNumber(value);
    }
  };

  /**
   * Format a value with change indicator for comparison views
   */
  const formatWithChange = (
    valueA: number,
    valueB: number,
    format: FormatType = 'standard',
    better: BetterDirection = 'higher',
    options?: FormatterOptions
  ): ReactElement => {
    const percentDiff = getPercentDifference(valueA, valueB);
    const isImprovement = (better === 'lower' && percentDiff < 0) || 
                          (better === 'higher' && percentDiff > 0);
    
    const formattedValue = formatValue(valueB, format, options);
    
    // If the difference is negligible, don't show a change indicator
    if (Math.abs(percentDiff) < 0.5) {
      return <span>{formattedValue}</span>;
    }
    
    return (
      <div className="flex flex-col">
        <span>{formattedValue}</span>
        <span className={`text-xs ${
          isImprovement ? 'text-green-600' : 'text-red-600'
        }`}>
          {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
        </span>
      </div>
    );
  };

  /**
   * Format a comparison metric with labels
   */
  const formatMetric = (
    label: string,
    valueA: number,
    valueB: number,
    format: FormatType = 'standard',
    better: BetterDirection = 'higher',
    options?: FormatterOptions
  ): ReactElement => {
    return (
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        {formatWithChange(valueA, valueB, format, better, options)}
      </div>
    );
  };

  /**
   * Get change indicator class based on improvement direction
   */
  const getChangeClass = (
    percentDiff: number,
    better: BetterDirection = 'higher'
  ): string => {
    if (Math.abs(percentDiff) < 0.5) {
      return 'text-gray-500';
    }
    
    const isImprovement = (better === 'lower' && percentDiff < 0) || 
                          (better === 'higher' && percentDiff > 0);
    
    return isImprovement ? 'text-green-600' : 'text-red-600';
  };

  /**
   * Format a simple difference value (e.g., "+10" or "-5")
   */
  const formatDifference = (
    valueA: number,
    valueB: number,
    format: FormatType = 'standard',
    options?: FormatterOptions
  ): string => {
    const diff = valueB - valueA;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${formatValue(Math.abs(diff), format, options)}`;
  };

  return {
    getPercentDifference,
    formatValue,
    formatWithChange,
    formatMetric,
    getChangeClass,
    formatDifference
  };
}