export interface ClusterPricing {
  clusterId: string;
  clusterName: string;
  clusterType: 'compute' | 'storage';
  pricePerMonth: number;
  pricePerHour: number; // calculated field
  rackUnits?: number; // Number of rack units per device
  powerWatts?: number; // Power consumption in watts per device
}

export interface PricingRequirements {
  computePricing: ClusterPricing[];
  storagePricing: ClusterPricing[];
}
