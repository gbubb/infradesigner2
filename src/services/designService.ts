import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase';
import { InfrastructureDesign } from '@/types/infrastructure';
import { toast } from 'sonner';
import { DesignDatabaseRow } from '@/types/database-types';

// Load all designs from Supabase
export const loadDesigns = async (userId?: string): Promise<InfrastructureDesign[]> => {
  try {
    let query = supabase
      .from(TABLES.DESIGNS)
      .select('*');
      
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
      
    if (handleSupabaseError(error, 'loading designs')) {
      return [];
    }
    
    // Convert database format to application format
    const rows = (data as unknown as DesignDatabaseRow[] | null) ?? [];
    const designs = rows.map(design => {
      if ('createdat' in design && 'name' in design) {
        try {
          // Helper function to handle JSONB fields (already parsed objects from Supabase)
          const parseJsonField = <T>(field: unknown, defaultValue: T): T => {
            if (!field) return defaultValue;
            return (typeof field === 'string' ? JSON.parse(field) : field) as T;
          };

          const parsedComponents = parseJsonField(design.components, []);
          const parsedRequirements = parseJsonField(design.requirements, {});
          const parsedComponentRoles = parseJsonField(design.component_roles, []);
          const parsedDisksByRole = parseJsonField(design.selected_disks_by_role, {});
          const parsedDisksByStorageCluster = parseJsonField(design.selected_disks_by_storage_cluster, {});
          const parsedGPUsByRole = parseJsonField(design.selected_gpus_by_role, {});
          const parsedConnectionRules = parseJsonField(design.connection_rules, []);
          const parsedPlacementRules = parseJsonField(design.placement_rules, []);
          const parsedRowLayout = parseJsonField(design.row_layout, undefined);

          return {
            id: design.id,
            name: design.name,
            description: design.description || '',
            components: parsedComponents,
            requirements: parsedRequirements,
            componentRoles: parsedComponentRoles,
            selectedDisksByRole: parsedDisksByRole,
            selectedDisksByStorageCluster: parsedDisksByStorageCluster,
            selectedGPUsByRole: parsedGPUsByRole,
            connectionRules: parsedConnectionRules,
            placementRules: parsedPlacementRules,
            rowLayout: parsedRowLayout,
            createdAt: new Date(design.createdat),
            updatedAt: design.updatedat ? new Date(design.updatedat) : new Date(design.createdat),
            user_id: design.user_id || undefined,
            is_public: design.is_public || false,
            sharing_id: design.sharing_id || undefined
          };
        } catch (parseErr) {
          console.error('Error parsing design data:', parseErr);
          console.error('Failed design:', {
            id: design.id,
            name: design.name,
            selected_disks_by_storage_cluster: design.selected_disks_by_storage_cluster
          });
          return null;
        }
      }
      console.error('Invalid design data:', design);
      return null;
    }).filter(Boolean);

    return designs as unknown as InfrastructureDesign[];
  } catch (err) {
    console.error('Error loading designs:', err);
    toast.error('Failed to load designs from the database');
    return [];
  }
};

// Load a design by sharing ID
export const loadDesignBySharing = async (sharingId: string): Promise<InfrastructureDesign | null> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.DESIGNS)
      .select('*')
      .eq('sharing_id', sharingId)
      .eq('is_public', true)
      .single();
      
    if (handleSupabaseError(error, 'loading shared design')) {
      return null;
    }
    
    if (!data) {
      toast.error('Design not found or not public');
      return null;
    }

    const row = data as unknown as DesignDatabaseRow;
    try {
      // Helper function to handle JSONB fields (already parsed objects from Supabase)
      const parseJsonField = <T>(field: unknown, defaultValue: T): T => {
        if (!field) return defaultValue;
        return (typeof field === 'string' ? JSON.parse(field) : field) as T;
      };

      const parsedComponents = parseJsonField(row.components, []);
      const parsedRequirements = parseJsonField(row.requirements, {});
      const parsedComponentRoles = parseJsonField(row.component_roles, []);
      const parsedDisksByRole = parseJsonField(row.selected_disks_by_role, {});
      const parsedDisksByStorageCluster = parseJsonField(row.selected_disks_by_storage_cluster, {});
      const parsedGPUsByRole = parseJsonField(row.selected_gpus_by_role, {});
      const parsedConnectionRules = parseJsonField(row.connection_rules, []);
      const parsedPlacementRules = parseJsonField(row.placement_rules, []);
      const parsedRowLayout = parseJsonField(row.row_layout, undefined);

      return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        components: parsedComponents,
        requirements: parsedRequirements,
        componentRoles: parsedComponentRoles,
        selectedDisksByRole: parsedDisksByRole,
        selectedDisksByStorageCluster: parsedDisksByStorageCluster,
        selectedGPUsByRole: parsedGPUsByRole,
        connectionRules: parsedConnectionRules,
        placementRules: parsedPlacementRules,
        rowLayout: parsedRowLayout,
        createdAt: new Date(row.createdat),
        updatedAt: row.updatedat ? new Date(row.updatedat) : new Date(row.createdat),
        user_id: row.user_id || undefined,
        is_public: row.is_public || false,
        sharing_id: row.sharing_id || undefined
      } as unknown as InfrastructureDesign;
    } catch (parseErr) {
      console.error('Error parsing shared design data:', parseErr, data);
      return null;
    }
  } catch (err) {
    console.error('Error loading shared design:', err);
    toast.error('Failed to load shared design from the database');
    return null;
  }
};

// Save a design to Supabase
export const saveDesign = async (design: InfrastructureDesign, userId?: string): Promise<boolean> => {
  try {
    const designToSave: Partial<DesignDatabaseRow> = {
      id: design.id,
      name: design.name,
      description: design.description,
      requirements: JSON.stringify(design.requirements || {}),
      components: JSON.stringify(design.components || []),
      component_roles: JSON.stringify(design.componentRoles || []),
      selected_disks_by_role: JSON.stringify(design.selectedDisksByRole || {}),
      selected_disks_by_storage_cluster: JSON.stringify(design.selectedDisksByStorageCluster || {}),
      selected_gpus_by_role: JSON.stringify(design.selectedGPUsByRole || {}),
      connection_rules: JSON.stringify(design.connectionRules || []),
      createdat: design.createdAt.toISOString(),
      updatedat: new Date().toISOString(),
      user_id: userId || design.user_id || undefined,
      is_public: design.is_public || false
    };
    
    // Only include placement_rules if they exist (temporary until DB is updated)
    if (design.placementRules && design.placementRules.length > 0) {
      designToSave.placement_rules = JSON.stringify(design.placementRules);
    }
    
    // Only include row_layout if it exists (temporary until DB is updated)
    if (design.rowLayout) {
      designToSave.row_layout = JSON.stringify(design.rowLayout);
    }
    
    const { error } = await supabase
      .from(TABLES.DESIGNS)
      .upsert(designToSave as never);
    
    if (handleSupabaseError(error, 'saving design')) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error saving design:', err);
    toast.error('Failed to save design to the database');
    return false;
  }
};

// Toggle public access for a design
export const togglePublicAccess = async (designId: string, isPublic: boolean): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(TABLES.DESIGNS)
      .update({ is_public: isPublic })
      .eq('id', designId);
    
    if (handleSupabaseError(error, 'updating design visibility')) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error updating design visibility:', err);
    toast.error('Failed to update design visibility');
    return false;
  }
};

// Delete a design from Supabase
export const deleteDesign = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(TABLES.DESIGNS)
      .delete()
      .eq('id', id);
    
    if (handleSupabaseError(error, 'deleting design')) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error deleting design:', err);
    toast.error('Failed to delete design from the database');
    return false;
  }
};

// Purge all designs from Supabase - for admin use
export const purgeAllDesigns = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(TABLES.DESIGNS)
      .delete()
      .neq('id', 'placeholder'); // Delete all rows
    
    if (handleSupabaseError(error, 'purging designs')) {
      return false;
    }
    
    toast.success('All designs have been purged from the database');
    return true;
  } catch (err) {
    console.error('Error purging designs:', err);
    toast.error('Failed to purge designs from the database');
    return false;
  }
};

// Export a design to a JSON file
export const exportDesign = (design: InfrastructureDesign): void => {
  try {
    const designJson = JSON.stringify(design, null, 2);
    const blob = new Blob([designJson], { type: 'application/json' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${design.name.replace(/\s+/g, '_')}_design.json`;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Design "${design.name}" exported successfully`);
  } catch (err) {
    console.error('Error exporting design:', err);
    toast.error('Failed to export design');
  }
};

// Import a design from a JSON file
export const importDesign = async (file: File): Promise<InfrastructureDesign | null> => {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const fileContent = event.target?.result as string;
          const importedDesign = JSON.parse(fileContent) as InfrastructureDesign;
          
          if (!importedDesign.id || !importedDesign.name) {
            toast.error('Invalid design file format');
            resolve(null);
            return;
          }
          if (!importedDesign.components) importedDesign.components = [];
          if (!importedDesign.componentRoles) importedDesign.componentRoles = [];
          if (!importedDesign.selectedDisksByRole) importedDesign.selectedDisksByRole = {};
          if (!importedDesign.selectedDisksByStorageCluster) importedDesign.selectedDisksByStorageCluster = {};
          if (!importedDesign.selectedGPUsByRole) importedDesign.selectedGPUsByRole = {};
          if (!importedDesign.connectionRules) importedDesign.connectionRules = [];
          importedDesign.createdAt = new Date(importedDesign.createdAt);
          importedDesign.updatedAt = importedDesign.updatedAt ? new Date(importedDesign.updatedAt) : new Date();
          
          toast.success(`Design "${importedDesign.name}" imported successfully`);
          resolve(importedDesign);
        } catch (parseErr) {
          console.error('Error parsing design file:', parseErr);
          toast.error('Failed to parse design file');
          resolve(null);
        }
      };
      
      reader.onerror = () => {
        console.error('Error reading design file');
        toast.error('Failed to read design file');
        resolve(null);
      };
      
      reader.readAsText(file);
    } catch (err) {
      console.error('Error importing design:', err);
      toast.error('Failed to import design');
      resolve(null);
    }
  });
};
