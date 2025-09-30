import { useDesignStore } from '@/store/designStore';

/**
 * Hook to get the current design's currency setting
 * @returns The currency code (e.g., 'USD', 'EUR', 'GBP'), defaults to 'USD'
 */
export const useCurrency = (): string => {
  const currency = useDesignStore(
    state => state.activeDesign?.requirements?.physicalConstraints?.currency
  );

  return currency || 'USD';
};