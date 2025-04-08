
/**
 * Re-export calculation utilities from specialized modules
 */
export { 
  calculateStorageNodeCapacity,
  calculateStorageNodeQuantity 
} from './storageCalculations';

export { 
  calculateComputeNodeQuantity 
} from './computeCalculations';

export { 
  TB_TO_TIB_FACTOR,
  StoragePoolEfficiencyFactors 
} from './constants';

// Re-export the new resource calculation utilities
export {
  calculateAmortizedCosts,
  calculatePowerMetrics,
  calculateEnergyCosts,
  calculateUtilizationMetrics,
  getDeviceLifespans,
  getOperationalSettings,
  countComponentsByType
} from '@/hooks/design/utils/resourceCalculationUtils';
