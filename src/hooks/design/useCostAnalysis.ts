
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useHardwareTotals } from './useHardwareTotals';

export const useCostAnalysis = () => {
  const { activeDesign } = useDesignStore();
  const { actualHardwareTotals } = useHardwareTotals();
  
  // Calculate total cost
  const totalCost = useMemo(() => {
    if (!activeDesign?.components || activeDesign.components.length === 0) return 0;
    return activeDesign.components.reduce((total, component) => {
      const quantity = component.quantity || 1;
      return total + (component.cost * quantity);
    }, 0);
  }, [activeDesign]);
  
  // Cost metrics
  const costPerVCPU = useMemo(() => {
    if (!actualHardwareTotals.totalVCPUs || actualHardwareTotals.totalVCPUs === 0 || !totalCost) return 0;
    return totalCost / actualHardwareTotals.totalVCPUs;
  }, [actualHardwareTotals.totalVCPUs, totalCost]);
  
  const costPerTB = useMemo(() => {
    if (!actualHardwareTotals.totalStorageTB || actualHardwareTotals.totalStorageTB === 0 || !totalCost) return 0;
    return totalCost / actualHardwareTotals.totalStorageTB;
  }, [actualHardwareTotals.totalStorageTB, totalCost]);

  return {
    totalCost,
    costPerVCPU,
    costPerTB
  };
};
