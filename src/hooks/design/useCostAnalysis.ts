
import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useHardwareTotals } from './useHardwareTotals';

export const useCostAnalysis = () => {
  const { activeDesign } = useDesignStore();
  const { actualHardwareTotals } = useHardwareTotals();
  
  // Calculate total cost
  const totalCost = useMemo(() => {
    if (!activeDesign?.components) return 0;
    return activeDesign.components.reduce((total, component) => {
      return total + (component.cost * (component.quantity || 1));
    }, 0);
  }, [activeDesign]);
  
  // Cost metrics
  const costPerVCPU = useMemo(() => {
    if (!actualHardwareTotals.totalVCPUs || !totalCost) return 0;
    return totalCost / actualHardwareTotals.totalVCPUs;
  }, [actualHardwareTotals.totalVCPUs, totalCost]);
  
  const costPerTB = useMemo(() => {
    if (!actualHardwareTotals.totalStorageTB || !totalCost) return 0;
    return totalCost / actualHardwareTotals.totalStorageTB;
  }, [actualHardwareTotals.totalStorageTB, totalCost]);

  return {
    totalCost,
    costPerVCPU,
    costPerTB
  };
};
