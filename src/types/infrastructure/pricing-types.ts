
export interface ClusterPricing {
  clusterId: string;
  clusterName: string;
  clusterType: 'compute' | 'storage';
  pricePerMonth: number;
  pricePerHour: number; // calculated field
}

export interface PricingRequirements {
  computePricing: ClusterPricing[];
  storagePricing: ClusterPricing[];
}
