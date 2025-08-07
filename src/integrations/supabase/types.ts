export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      components: {
        Row: {
          cost: number | null
          created_at: string | null
          description: string | null
          details: Json | null
          id: string
          isdefault: boolean | null
          manufacturer: string | null
          model: string | null
          name: string
          power_idle: number | null
          power_peak: number | null
          power_typical: number | null
          powerrequired: number | null
          serverrole: string | null
          switchrole: string | null
          type: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          isdefault?: boolean | null
          manufacturer?: string | null
          model?: string | null
          name: string
          power_idle?: number | null
          power_peak?: number | null
          power_typical?: number | null
          powerrequired?: number | null
          serverrole?: string | null
          switchrole?: string | null
          type: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          isdefault?: boolean | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          power_idle?: number | null
          power_peak?: number | null
          power_typical?: number | null
          powerrequired?: number | null
          serverrole?: string | null
          switchrole?: string | null
          type?: string
        }
        Relationships: []
      }
      datacenter_racks: {
        Row: {
          created_at: string | null
          facility_id: string
          hierarchy_level_id: string
          id: string
          max_power_kw: number | null
          name: string
          position_x: number | null
          position_y: number | null
          rack_number: string | null
          rack_type: string | null
          reserved_for_design_id: string | null
          row_number: string | null
          status: string | null
          u_height: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          facility_id: string
          hierarchy_level_id: string
          id?: string
          max_power_kw?: number | null
          name: string
          position_x?: number | null
          position_y?: number | null
          rack_number?: string | null
          rack_type?: string | null
          reserved_for_design_id?: string | null
          row_number?: string | null
          status?: string | null
          u_height?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          facility_id?: string
          hierarchy_level_id?: string
          id?: string
          max_power_kw?: number | null
          name?: string
          position_x?: number | null
          position_y?: number | null
          rack_number?: string | null
          rack_type?: string | null
          reserved_for_design_id?: string | null
          row_number?: string | null
          status?: string | null
          u_height?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "datacenter_racks_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datacenter_racks_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_utilization_summary"
            referencedColumns: ["facilityId"]
          },
          {
            foreignKeyName: "datacenter_racks_hierarchy_level_id_fkey"
            columns: ["hierarchy_level_id"]
            isOneToOne: false
            referencedRelation: "facility_hierarchy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datacenter_racks_reserved_for_design_id_fkey"
            columns: ["reserved_for_design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      design_facility_mapping: {
        Row: {
          allocatedPowerKW: number | null
          allocatedRacks: number | null
          createdAt: string | null
          designId: string
          endDate: string | null
          facilityId: string
          hierarchyPath: string[]
          id: string
          startDate: string | null
          updatedAt: string | null
        }
        Insert: {
          allocatedPowerKW?: number | null
          allocatedRacks?: number | null
          createdAt?: string | null
          designId: string
          endDate?: string | null
          facilityId: string
          hierarchyPath?: string[]
          id?: string
          startDate?: string | null
          updatedAt?: string | null
        }
        Update: {
          allocatedPowerKW?: number | null
          allocatedRacks?: number | null
          createdAt?: string | null
          designId?: string
          endDate?: string | null
          facilityId?: string
          hierarchyPath?: string[]
          id?: string
          startDate?: string | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_facility_mapping_design_id_fkey"
            columns: ["designId"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_facility_mapping_facility_id_fkey"
            columns: ["facilityId"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_facility_mapping_facility_id_fkey"
            columns: ["facilityId"]
            isOneToOne: false
            referencedRelation: "facility_utilization_summary"
            referencedColumns: ["facilityId"]
          },
        ]
      }
      designs: {
        Row: {
          component_roles: Json | null
          components: Json | null
          connection_rules: Json | null
          createdat: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          placement_rules: Json | null
          rackprofiles: Json | null
          requirements: Json | null
          row_layout: Json | null
          selected_disks_by_role: Json | null
          selected_gpus_by_role: Json | null
          sharing_id: string | null
          updatedat: string | null
          user_id: string | null
        }
        Insert: {
          component_roles?: Json | null
          components?: Json | null
          connection_rules?: Json | null
          createdat?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          placement_rules?: Json | null
          rackprofiles?: Json | null
          requirements?: Json | null
          row_layout?: Json | null
          selected_disks_by_role?: Json | null
          selected_gpus_by_role?: Json | null
          sharing_id?: string | null
          updatedat?: string | null
          user_id?: string | null
        }
        Update: {
          component_roles?: Json | null
          components?: Json | null
          connection_rules?: Json | null
          createdat?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          placement_rules?: Json | null
          rackprofiles?: Json | null
          requirements?: Json | null
          row_layout?: Json | null
          selected_disks_by_role?: Json | null
          selected_gpus_by_role?: Json | null
          sharing_id?: string | null
          updatedat?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      facilities: {
        Row: {
          constraints: Json
          createdAt: string | null
          createdBy: string | null
          description: string | null
          hierarchyConfig: Json
          id: string
          location: string | null
          metadata: Json | null
          name: string
          updatedAt: string | null
        }
        Insert: {
          constraints?: Json
          createdAt?: string | null
          createdBy?: string | null
          description?: string | null
          hierarchyConfig?: Json
          id?: string
          location?: string | null
          metadata?: Json | null
          name: string
          updatedAt?: string | null
        }
        Update: {
          constraints?: Json
          createdAt?: string | null
          createdBy?: string | null
          description?: string | null
          hierarchyConfig?: Json
          id?: string
          location?: string | null
          metadata?: Json | null
          name?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      facility_cost_layers: {
        Row: {
          allocationConfig: Json | null
          allocationMethod: string
          amortizationMonths: number | null
          amount: number
          category: string
          createdAt: string | null
          currency: string
          endDate: string | null
          facilityId: string
          frequency: string | null
          id: string
          name: string
          notes: string | null
          startDate: string | null
          type: string
          updatedAt: string | null
        }
        Insert: {
          allocationConfig?: Json | null
          allocationMethod: string
          amortizationMonths?: number | null
          amount: number
          category: string
          createdAt?: string | null
          currency?: string
          endDate?: string | null
          facilityId: string
          frequency?: string | null
          id?: string
          name: string
          notes?: string | null
          startDate?: string | null
          type: string
          updatedAt?: string | null
        }
        Update: {
          allocationConfig?: Json | null
          allocationMethod?: string
          amortizationMonths?: number | null
          amount?: number
          category?: string
          createdAt?: string | null
          currency?: string
          endDate?: string | null
          facilityId?: string
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          startDate?: string | null
          type?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_cost_layers_facility_id_fkey"
            columns: ["facilityId"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_cost_layers_facility_id_fkey"
            columns: ["facilityId"]
            isOneToOne: false
            referencedRelation: "facility_utilization_summary"
            referencedColumns: ["facilityId"]
          },
        ]
      }
      facility_hierarchy: {
        Row: {
          actual_power_kw: number | null
          assigned_racks: number | null
          capacity: Json | null
          createdAt: string | null
          customAttributes: Json | null
          facilityId: string
          id: string
          level: number
          name: string
          parentId: string | null
          rack_capacity: Json | null
          updatedAt: string | null
        }
        Insert: {
          actual_power_kw?: number | null
          assigned_racks?: number | null
          capacity?: Json | null
          createdAt?: string | null
          customAttributes?: Json | null
          facilityId: string
          id?: string
          level?: number
          name: string
          parentId?: string | null
          rack_capacity?: Json | null
          updatedAt?: string | null
        }
        Update: {
          actual_power_kw?: number | null
          assigned_racks?: number | null
          capacity?: Json | null
          createdAt?: string | null
          customAttributes?: Json | null
          facilityId?: string
          id?: string
          level?: number
          name?: string
          parentId?: string | null
          rack_capacity?: Json | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_hierarchy_facility_id_fkey"
            columns: ["facilityId"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_hierarchy_facility_id_fkey"
            columns: ["facilityId"]
            isOneToOne: false
            referencedRelation: "facility_utilization_summary"
            referencedColumns: ["facilityId"]
          },
          {
            foreignKeyName: "facility_hierarchy_parent_id_fkey"
            columns: ["parentId"]
            isOneToOne: false
            referencedRelation: "facility_hierarchy"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_non_productive_loads: {
        Row: {
          category: string
          createdAt: string | null
          facilityId: string
          id: string
          isVariable: boolean | null
          name: string
          powerKW: number
          updatedAt: string | null
          variabilityFactor: number | null
        }
        Insert: {
          category: string
          createdAt?: string | null
          facilityId: string
          id?: string
          isVariable?: boolean | null
          name: string
          powerKW: number
          updatedAt?: string | null
          variabilityFactor?: number | null
        }
        Update: {
          category?: string
          createdAt?: string | null
          facilityId?: string
          id?: string
          isVariable?: boolean | null
          name?: string
          powerKW?: number
          updatedAt?: string | null
          variabilityFactor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_non_productive_loads_facility_id_fkey"
            columns: ["facilityId"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_non_productive_loads_facility_id_fkey"
            columns: ["facilityId"]
            isOneToOne: false
            referencedRelation: "facility_utilization_summary"
            referencedColumns: ["facilityId"]
          },
        ]
      }
      facility_power_layers: {
        Row: {
          capacityKW: number
          createdAt: string | null
          efficiency: number
          facilityId: string
          id: string
          metadata: Json | null
          name: string
          parentLayerId: string | null
          redundancyConfig: Json | null
          type: string
          updatedAt: string | null
        }
        Insert: {
          capacityKW: number
          createdAt?: string | null
          efficiency: number
          facilityId: string
          id?: string
          metadata?: Json | null
          name: string
          parentLayerId?: string | null
          redundancyConfig?: Json | null
          type: string
          updatedAt?: string | null
        }
        Update: {
          capacityKW?: number
          createdAt?: string | null
          efficiency?: number
          facilityId?: string
          id?: string
          metadata?: Json | null
          name?: string
          parentLayerId?: string | null
          redundancyConfig?: Json | null
          type?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_power_layers_facility_id_fkey"
            columns: ["facilityId"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_power_layers_facility_id_fkey"
            columns: ["facilityId"]
            isOneToOne: false
            referencedRelation: "facility_utilization_summary"
            referencedColumns: ["facilityId"]
          },
          {
            foreignKeyName: "facility_power_layers_parent_layer_id_fkey"
            columns: ["parentLayerId"]
            isOneToOne: false
            referencedRelation: "facility_power_layers"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_templates: {
        Row: {
          constraintTemplate: Json
          costTemplate: Json
          createdAt: string | null
          createdBy: string | null
          description: string | null
          hierarchyTemplate: Json
          id: string
          isPublic: boolean | null
          name: string
          powerTemplate: Json
          tags: string[] | null
          updatedAt: string | null
        }
        Insert: {
          constraintTemplate?: Json
          costTemplate?: Json
          createdAt?: string | null
          createdBy?: string | null
          description?: string | null
          hierarchyTemplate?: Json
          id?: string
          isPublic?: boolean | null
          name: string
          powerTemplate?: Json
          tags?: string[] | null
          updatedAt?: string | null
        }
        Update: {
          constraintTemplate?: Json
          costTemplate?: Json
          createdAt?: string | null
          createdBy?: string | null
          description?: string | null
          hierarchyTemplate?: Json
          id?: string
          isPublic?: boolean | null
          name?: string
          powerTemplate?: Json
          tags?: string[] | null
          updatedAt?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rack_hierarchy_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          facility_id: string
          hierarchy_level_id: string
          hierarchy_path: string[] | null
          id: string
          metadata: Json | null
          rack_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          facility_id: string
          hierarchy_level_id: string
          hierarchy_path?: string[] | null
          id?: string
          metadata?: Json | null
          rack_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          facility_id?: string
          hierarchy_level_id?: string
          hierarchy_path?: string[] | null
          id?: string
          metadata?: Json | null
          rack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rack_hierarchy_assignments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_hierarchy_assignments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_utilization_summary"
            referencedColumns: ["facilityId"]
          },
          {
            foreignKeyName: "rack_hierarchy_assignments_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: true
            referencedRelation: "rack_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rack_mappings: {
        Row: {
          datacenter_rack_id: string
          design_id: string
          design_rack_id: string
          id: string
          mapped_at: string | null
          mapped_by: string | null
        }
        Insert: {
          datacenter_rack_id: string
          design_id: string
          design_rack_id: string
          id?: string
          mapped_at?: string | null
          mapped_by?: string | null
        }
        Update: {
          datacenter_rack_id?: string
          design_id?: string
          design_rack_id?: string
          id?: string
          mapped_at?: string | null
          mapped_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rack_mappings_datacenter_rack_id_fkey"
            columns: ["datacenter_rack_id"]
            isOneToOne: false
            referencedRelation: "datacenter_racks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_mappings_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_mappings_design_rack_id_fkey"
            columns: ["design_rack_id"]
            isOneToOne: true
            referencedRelation: "rack_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rack_profiles: {
        Row: {
          actual_power_usage_kw: number | null
          availability_zone_id: string | null
          az_name: string | null
          created_at: string | null
          design_id: string | null
          devices: Json | null
          facility_id: string | null
          hierarchy_level_id: string | null
          id: string
          name: string
          physical_location: Json | null
          position_in_level: number | null
          power_allocation_kw: number | null
          rack_specifications: Json | null
          rack_type: string | null
          u_height: number
          updated_at: string | null
        }
        Insert: {
          actual_power_usage_kw?: number | null
          availability_zone_id?: string | null
          az_name?: string | null
          created_at?: string | null
          design_id?: string | null
          devices?: Json | null
          facility_id?: string | null
          hierarchy_level_id?: string | null
          id?: string
          name: string
          physical_location?: Json | null
          position_in_level?: number | null
          power_allocation_kw?: number | null
          rack_specifications?: Json | null
          rack_type?: string | null
          u_height?: number
          updated_at?: string | null
        }
        Update: {
          actual_power_usage_kw?: number | null
          availability_zone_id?: string | null
          az_name?: string | null
          created_at?: string | null
          design_id?: string | null
          devices?: Json | null
          facility_id?: string | null
          hierarchy_level_id?: string | null
          id?: string
          name?: string
          physical_location?: Json | null
          position_in_level?: number | null
          power_allocation_kw?: number | null
          rack_specifications?: Json | null
          rack_type?: string | null
          u_height?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rack_profiles_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_profiles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_profiles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_utilization_summary"
            referencedColumns: ["facilityId"]
          },
        ]
      }
      rack_specifications: {
        Row: {
          created_at: string | null
          depth_mm: number | null
          features: Json | null
          height_u: number
          id: string
          manufacturer: string | null
          max_power_kw: number | null
          max_weight_kg: number | null
          model: string | null
          name: string
          updated_at: string | null
          width_mm: number | null
        }
        Insert: {
          created_at?: string | null
          depth_mm?: number | null
          features?: Json | null
          height_u?: number
          id?: string
          manufacturer?: string | null
          max_power_kw?: number | null
          max_weight_kg?: number | null
          model?: string | null
          name: string
          updated_at?: string | null
          width_mm?: number | null
        }
        Update: {
          created_at?: string | null
          depth_mm?: number | null
          features?: Json | null
          height_u?: number
          id?: string
          manufacturer?: string | null
          max_power_kw?: number | null
          max_weight_kg?: number | null
          model?: string | null
          name?: string
          updated_at?: string | null
          width_mm?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      facility_utilization_summary: {
        Row: {
          allocatedPowerKW: number | null
          allocatedRacks: number | null
          facilityId: string | null
          facilityName: string | null
          pue: number | null
          totalPowerKW: number | null
          totalRacks: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_facility_pue: {
        Args: { p_facility_id: string }
        Returns: number
      }
      create_datacenter_racks: {
        Args: {
          p_hierarchy_level_id: string
          p_rack_count: number
          p_rack_prefix?: string
          p_u_height?: number
          p_max_power_kw?: number
          p_rack_type?: string
        }
        Returns: {
          created_at: string | null
          facility_id: string
          hierarchy_level_id: string
          id: string
          max_power_kw: number | null
          name: string
          position_x: number | null
          position_y: number | null
          rack_number: string | null
          rack_type: string | null
          reserved_for_design_id: string | null
          row_number: string | null
          status: string | null
          u_height: number | null
          updated_at: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
