
export interface LicensingCost {
  id: string;
  name: string;
  amount: number;
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'annually';
  description?: string;
}

export interface LicensingRequirements {
  supportCostPerNode?: number;
  additionalCosts: LicensingCost[];
}
