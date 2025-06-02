import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase';
import { InfrastructureDesign } from '@/types/infrastructure';
import { toast } from 'sonner';

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
    
    console.log('Raw designs data from database:', data);
    
    // Handle empty or null data
    if (!data || data.length === 0) {
      console.log('No designs found in database');
      return [];
    }
    
    // Convert database format to application format
    const designs = (data.map(design => {
      console.log('Processing design:', design);
      
      // Check for required fields with flexible column naming
      const hasRequiredFields = 
        (design.id || design.ID) && 
        (design.name || design.NAME) && 
        (design.createdat || design.createdAt || design.created_at || design.CREATEDAT);
      
      if (hasRequiredFields) {
        try {
          // Safe JSON parsing with better error handling
          const safeJSONParse = (value: any, defaultValue: any) => {
            if (!value) return defaultValue;
            try {
              return JSON.parse(String(value));
            } catch (e) {
              console.warn('JSON parse error for value:', value, e);
              return defaultValue;
            }
          };
          
          const parsedComponents = safeJSONParse(design.components, []);
          const parsedRequirements = safeJSONParse(design.requirements, {});
          const parsedComponentRoles = safeJSONParse(design.component_roles, []);
          const parsedDisksByRole = safeJSONParse(design.selected_disks_by_role, {});
          const parsedGPUsByRole = safeJSONParse(design.selected_gpus_by_role, {});
          const parsedConnectionRules = safeJSONParse(design.connection_rules, []);
          const parsedRackProfiles = safeJSONParse(design.rackprofiles, []);

          return {
            id: design.id || design.ID,
            name: design.name || design.NAME,
            description: design.description || design.DESCRIPTION || '',
            components: parsedComponents,
            requirements: parsedRequirements,
            componentRoles: parsedComponentRoles,
            selectedDisksByRole: parsedDisksByRole,
            selectedGPUsByRole: parsedGPUsByRole,
            connectionRules: parsedConnectionRules,
            rackprofiles: parsedRackProfiles,
            createdAt: new Date(design.createdat || design.createdAt || design.created_at || design.CREATEDAT),
            updatedAt: design.updatedat || design.updatedAt || design.updated_at || design.UPDATEDAT 
              ? new Date(design.updatedat || design.updatedAt || design.updated_at || design.UPDATEDAT) 
              : new Date(design.createdat || design.createdAt || design.created_at || design.CREATEDAT),
            user_id: design.user_id || design.USER_ID || null,
            is_public: design.is_public || design.IS_PUBLIC || false,
            sharing_id: design.sharing_id || design.SHARING_ID || null
          };
        } catch (parseErr) {
          console.error('Error parsing design data:', parseErr, design);
          return null;
        }
      }
      console.error('Invalid design data - missing required fields:', design);
      return null;
    }).filter(Boolean) || []);
    
    console.log(`Loaded ${designs.length} designs successfully`);
    return designs as InfrastructureDesign[];
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
    
    try {
      // Safe JSON parsing with better error handling
      const safeJSONParse = (value: any, defaultValue: any) => {
        if (!value) return defaultValue;
        try {
          return JSON.parse(String(value));
        } catch (e) {
          console.warn('JSON parse error for value:', value, e);
          return defaultValue;
        }
      };
      
      const parsedComponents = safeJSONParse(data.components, []);
      const parsedRequirements = safeJSONParse(data.requirements, {});
      const parsedComponentRoles = safeJSONParse(data.component_roles, []);
      const parsedDisksByRole = safeJSONParse(data.selected_disks_by_role, {});
      const parsedGPUsByRole = safeJSONParse(data.selected_gpus_by_role, {});
      const parsedConnectionRules = safeJSONParse(data.connection_rules, []);
      const parsedRackProfiles = safeJSONParse(data.rackprofiles, []);

      return {
        id: data.id || data.ID,
        name: data.name || data.NAME,
        description: data.description || data.DESCRIPTION || '',
        components: parsedComponents,
        requirements: parsedRequirements,
        componentRoles: parsedComponentRoles,
        selectedDisksByRole: parsedDisksByRole,
        selectedGPUsByRole: parsedGPUsByRole,
        connectionRules: parsedConnectionRules,
        rackprofiles: parsedRackProfiles,
        createdAt: new Date(data.createdat || data.createdAt || data.created_at || data.CREATEDAT),
        updatedAt: data.updatedat || data.updatedAt || data.updated_at || data.UPDATEDAT 
          ? new Date(data.updatedat || data.updatedAt || data.updated_at || data.UPDATEDAT) 
          : new Date(data.createdat || data.createdAt || data.created_at || data.CREATEDAT),
        user_id: data.user_id || data.USER_ID || null,
        is_public: data.is_public || data.IS_PUBLIC || false,
        sharing_id: data.sharing_id || data.SHARING_ID || null
      };
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
    const designToSave = {
      id: design.id,
      name: design.name,
      description: design.description,
      requirements: JSON.stringify(design.requirements || {}),
      components: JSON.stringify(design.components || []),
      component_roles: JSON.stringify(design.componentRoles || []),
      selected_disks_by_role: JSON.stringify(design.selectedDisksByRole || {}),
      selected_gpus_by_role: JSON.stringify(design.selectedGPUsByRole || {}),
      connection_rules: JSON.stringify(design.connectionRules || []),
      rackprofiles: JSON.stringify(design.rackprofiles || []),
      createdat: design.createdAt.toISOString(),
      updatedat: new Date().toISOString(),
      user_id: userId || design.user_id,
      is_public: design.is_public || false
    };
    
    const { error } = await supabase
      .from(TABLES.DESIGNS)
      .upsert(designToSave);
    
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
          if (!importedDesign.selectedGPUsByRole) importedDesign.selectedGPUsByRole = {};
          if (!importedDesign.connectionRules) importedDesign.connectionRules = [];
          if (!importedDesign.rackprofiles) importedDesign.rackprofiles = [];
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
