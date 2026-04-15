import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase';
import { InfrastructureDesign } from '@/types/infrastructure';
import { toast } from 'sonner';

interface DesignChanges {
  fieldsChanged: Set<keyof InfrastructureDesign>;
  lastSaved: Date;
  pendingChanges: Partial<InfrastructureDesign>;
}

const designChangesTracker = new Map<string, DesignChanges>();

export const trackDesignChange = (
  designId: string,
  field: keyof InfrastructureDesign,
  value: InfrastructureDesign[keyof InfrastructureDesign]
) => {
  const tracker = designChangesTracker.get(designId) || {
    fieldsChanged: new Set(),
    lastSaved: new Date(),
    pendingChanges: {}
  };
  
  tracker.fieldsChanged.add(field);
  (tracker.pendingChanges as Record<string, unknown>)[field] = value;
  designChangesTracker.set(designId, tracker);
};

export const saveDesignOptimized = async (
  design: InfrastructureDesign,
  userId?: string,
  forceFullSave = false
): Promise<boolean> => {
  try {
    const tracker = designChangesTracker.get(design.id);
    
    // If force full save or no tracker (first save), do full save
    if (forceFullSave || !tracker || tracker.fieldsChanged.size === 0) {
      return await saveFullDesign(design, userId);
    }
    
    // Build partial update object with only changed fields
    const partialUpdate: Record<string, unknown> = {
      id: design.id,
      updatedat: new Date().toISOString()
    };
    
    // Map application field names to database column names
    const fieldMapping: Record<string, string> = {
      name: 'name',
      description: 'description',
      requirements: 'requirements',
      components: 'components',
      componentRoles: 'component_roles',
      selectedDisksByRole: 'selected_disks_by_role',
      selectedDisksByStorageCluster: 'selected_disks_by_storage_cluster',
      selectedGPUsByRole: 'selected_gpus_by_role',
      connectionRules: 'connection_rules',
      placementRules: 'placement_rules',
      rowLayout: 'row_layout',
      is_public: 'is_public'
    };
    
    // Only include changed fields in the update
    for (const field of tracker.fieldsChanged) {
      const dbField = fieldMapping[field as string];
      if (dbField) {
        const value = design[field];
        if (typeof value === 'object' && value !== null) {
          partialUpdate[dbField] = JSON.stringify(value);
        } else {
          partialUpdate[dbField] = value as string | boolean;
        }
      }
    }
    
    // Use UPDATE instead of UPSERT for partial updates
    const { error } = await supabase
      .from(TABLES.DESIGNS)
      .update(partialUpdate as never)
      .eq('id', design.id);
    
    if (handleSupabaseError(error, 'saving design')) {
      return false;
    }
    
    // Clear the tracker after successful save
    designChangesTracker.delete(design.id);
    
    return true;
  } catch (err) {
    console.error('Error saving design:', err);
    toast.error('Failed to save design to the database');
    return false;
  }
};

const saveFullDesign = async (
  design: InfrastructureDesign,
  userId?: string
): Promise<boolean> => {
  try {
    const designToSave = {
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
      placement_rules: (design.placementRules?.length ?? 0) > 0
        ? JSON.stringify(design.placementRules)
        : null,
      row_layout: design.rowLayout
        ? JSON.stringify(design.rowLayout)
        : null,
      createdat: design.createdAt.toISOString(),
      updatedat: new Date().toISOString(),
      user_id: userId || design.user_id,
      is_public: design.is_public || false
    };
    
    const { error } = await supabase
      .from(TABLES.DESIGNS)
      .upsert(designToSave as never);
    
    if (handleSupabaseError(error, 'saving design')) {
      return false;
    }
    
    // Clear any pending changes after full save
    designChangesTracker.delete(design.id);
    
    return true;
  } catch (err) {
    console.error('Error saving design:', err);
    toast.error('Failed to save design to the database');
    return false;
  }
};

export const clearDesignChanges = (designId: string) => {
  designChangesTracker.delete(designId);
};