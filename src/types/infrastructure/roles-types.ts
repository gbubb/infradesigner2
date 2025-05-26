// Component role interfaces
export interface ComponentRole {
  id: string;
  name?: string;
  role: string;
  description: string;
  requiredCount: number;
  adjustedRequiredCount?: number;
  assignedComponentId?: string;
  clusterInfo?: ClusterInfo;
  calculationSteps?: string[]; // Add calculationSteps property
}

// ClusterInfo interface
export interface ClusterInfo {
  clusterId: string;
  clusterName: string;
  clusterIndex: number;
}
