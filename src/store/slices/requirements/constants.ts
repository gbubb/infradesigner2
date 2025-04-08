
// Storage efficiency factors
export const TB_TO_TIB_FACTOR = 0.909495;

export const StoragePoolEfficiencyFactors: Record<string, number> = {
  '3 Replica': 0.33333,
  '2 Replica': 0.5,
  'Erasure Coding 4+2': 0.66666,
  'Erasure Coding 8+3': 0.72727,
  'Erasure Coding 8+4': 0.66666,
  'Erasure Coding 10+4': 0.71428
};
