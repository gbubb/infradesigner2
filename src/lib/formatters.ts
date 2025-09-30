/**
 * Centralized formatting utilities for consistent display across the application
 */

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CNY': '¥',
  };
  return symbols[currency] || '$';
}

/**
 * Format bytes into human-readable units (KB, MB, GB, TB, PB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format power consumption in watts with appropriate units (W, kW, MW)
 */
export function formatPower(watts: number, decimals: number = 2): string {
  if (watts === 0) return '0 W';
  
  if (watts < 1000) {
    return `${watts.toFixed(decimals)} W`;
  } else if (watts < 1000000) {
    return `${(watts / 1000).toFixed(decimals)} kW`;
  } else {
    return `${(watts / 1000000).toFixed(decimals)} MW`;
  }
}

/**
 * Format percentage values with consistent decimal places
 */
export function formatPercentage(value: number, decimals: number = 1, includeSign: boolean = true): string {
  const formatted = value.toFixed(decimals);
  return includeSign ? `${formatted}%` : formatted;
}

/**
 * Format numbers with locale-specific thousands separators
 */
export function formatNumber(value: number, options?: {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  style?: 'decimal' | 'percent';
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
}): string {
  const defaultOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  };
  
  return value.toLocaleString('en-US', defaultOptions);
}

/**
 * Format currency values with proper symbol and decimals
 */
export function formatCurrency(value: number, currency: string = 'USD', showDecimals: boolean = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(value);
}

/**
 * Format currency in compact notation (e.g., $1.2K, $3.4M)
 */
export function formatCompactCurrency(value: number, decimals: number = 1, currency: string = 'USD'): string {
  if (!value || isNaN(value) || !isFinite(value)) {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}0`;
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const symbol = getCurrencySymbol(currency);

  if (absValue < 1000) {
    return `${sign}${symbol}${absValue.toFixed(0)}`;
  } else if (absValue < 1000000) {
    return `${sign}${symbol}${(absValue / 1000).toFixed(decimals)}K`;
  } else if (absValue < 1000000000) {
    return `${sign}${symbol}${(absValue / 1000000).toFixed(decimals)}M`;
  } else {
    return `${sign}${symbol}${(absValue / 1000000000).toFixed(decimals)}B`;
  }
}

/**
 * Format large numbers in compact notation (e.g., 1.2K, 3.4M)
 */
export function formatCompact(value: number, decimals: number = 1): string {
  if (value === 0) return '0';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue < 1000) {
    return `${sign}${absValue}`;
  } else if (absValue < 1000000) {
    return `${sign}${(absValue / 1000).toFixed(decimals)}K`;
  } else if (absValue < 1000000000) {
    return `${sign}${(absValue / 1000000).toFixed(decimals)}M`;
  } else {
    return `${sign}${(absValue / 1000000000).toFixed(decimals)}B`;
  }
}

/**
 * Format temperature values with unit symbol
 */
export function formatTemperature(value: number, unit: 'C' | 'F' = 'C', decimals: number = 1): string {
  return `${value.toFixed(decimals)}°${unit}`;
}

/**
 * Format network speed/bandwidth (Mbps, Gbps, Tbps)
 */
export function formatBandwidth(mbps: number, decimals: number = 1): string {
  if (mbps === 0) return '0 Mbps';
  
  if (mbps < 1000) {
    return `${mbps.toFixed(decimals)} Mbps`;
  } else if (mbps < 1000000) {
    return `${(mbps / 1000).toFixed(decimals)} Gbps`;
  } else {
    return `${(mbps / 1000000).toFixed(decimals)} Tbps`;
  }
}

/**
 * Format values with change indicators for comparison views
 */
export function formatWithChange(value: number, change: number, formatter: (v: number) => string = formatNumber): {
  value: string;
  change: string;
  changeClass: string;
} {
  const changeClass = change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-gray-500';
  const changePrefix = change > 0 ? '+' : '';
  
  return {
    value: formatter(value),
    change: `${changePrefix}${formatter(Math.abs(change))}`,
    changeClass
  };
}

/**
 * Format time duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
}

/**
 * Format rack units (RU)
 */
export function formatRackUnits(units: number): string {
  return `${units}U`;
}

/**
 * Format weight values with appropriate units
 */
export function formatWeight(kg: number, decimals: number = 1): string {
  if (kg === 0) return '0 kg';
  
  if (kg < 1) {
    return `${(kg * 1000).toFixed(decimals)} g`;
  } else if (kg < 1000) {
    return `${kg.toFixed(decimals)} kg`;
  } else {
    return `${(kg / 1000).toFixed(decimals)} t`;
  }
}

/**
 * Format efficiency percentage (e.g., PUE, PSU efficiency)
 */
export function formatEfficiency(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}`;
}

/**
 * Format cost per unit (e.g., $/GB, $/core)
 */
export function formatCostPerUnit(cost: number, unit: string, decimals: number = 2, currency: string = 'USD'): string {
  return `${formatCurrency(cost, currency, true)}/${unit}`;
}

/**
 * Preprocess number values for form validation
 */
export function preprocessNumber(val: unknown): number | undefined {
  if (val === '' || val === undefined || val === null) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
}