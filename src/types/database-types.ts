// Database-specific types

export interface DesignDatabaseRow {
  id: string;
  name: string;
  description?: string;
  requirements: string;
  components: string;
  component_roles: string;
  selected_disks_by_role: string;
  selected_disks_by_storage_cluster?: string;
  selected_gpus_by_role: string;
  connection_rules: string;
  placement_rules?: string;
  row_layout?: string;
  createdat: string;
  updatedat: string;
  user_id?: string;
  is_public?: boolean;
  sharing_id?: string;
  rackprofiles?: string;
}

export interface ComponentDatabaseRow {
  id: string;
  name: string;
  type: string;
  manufacturer?: string;
  model?: string;
  description?: string;
  cost?: number;
  powerrequired?: number;
  serverrole?: string;
  switchrole?: string;
  isdefault?: boolean;
  details?: Record<string, unknown>;
  created_at?: string;
}

export interface FacilityDatabaseRow {
  id: string;
  name: string;
  location?: string;
  description?: string;
  hierarchy_config?: string;
  power_infrastructure?: string;
  cost_layers?: string;
  constraints?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface FacilityHierarchyDatabaseRow {
  id: string;
  facility_id: string;
  name: string;
  parent_id?: string;
  level: number;
  custom_attributes?: string;
  capacity?: string;
  assigned_racks?: number;
  actual_power_kw?: number;
  rack_capacity?: string;
  created_at?: string;
  updated_at?: string;
}