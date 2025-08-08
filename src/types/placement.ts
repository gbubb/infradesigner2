// Placement-related type definitions

import { InfrastructureComponent } from './infrastructure';

export interface PlacedComponent {
  id: string;
  component: InfrastructureComponent;
  quantity: number;
  metadata?: {
    availability_zone?: string;
    rack_id?: string;
    cluster_id?: string;
    cluster_name?: string;
    role?: string;
  };
}

export interface ComputeCluster {
  id: string;
  name: string;
  role: string; // e.g., 'Production Compute', 'GPU Compute', 'Storage'
  nodeType: InfrastructureComponent;
  nodeCount: number;
  specifications: {
    totalCores: number;
    totalMemoryGB: number;
    totalStorageGB?: number;
    gpuCount?: number;
  };
}