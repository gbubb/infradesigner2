import { DesignRequirements } from "@/types/infrastructure/requirements-types";

export const makeRequirements = (
  overrides: Partial<DesignRequirements> = {}
): DesignRequirements => ({
  computeRequirements: { computeClusters: [] },
  storageRequirements: { storageClusters: [] },
  networkRequirements: {},
  physicalConstraints: {},
  licensingRequirements: { additionalCosts: [] },
  pricingRequirements: {
    computePricing: {} as never,
    storagePricing: {} as never,
  },
  ...overrides,
});
