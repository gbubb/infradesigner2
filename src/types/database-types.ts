// Database-specific types

export interface DesignDatabaseRow {
  id: string;
  name: string;
  description?: string;
  requirements: string;
  components: string;
  component_roles: string;
  selected_disks_by_role: string;
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
  details?: Record<string, any>;
  created_at?: string;
}