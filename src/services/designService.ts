
import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase';
import { InfrastructureDesign } from '@/types/infrastructure';
import { toast } from 'sonner';

// Load all designs from Supabase
export const loadDesigns = async (): Promise<InfrastructureDesign[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.DESIGNS)
      .select('*');
      
    if (handleSupabaseError(error, 'loading designs')) {
      return [];
    }
    
    // Convert database format to application format
    const designs = (data?.map(design => {
      // Make sure we're only processing design rows by checking for required properties
      if ('createdat' in design && 'name' in design) {
        try {
          // Parse JSON fields - use null coalescing to prevent parsing errors
          const parsedComponents = design.components ? JSON.parse(String(design.components) || '[]') : [];
          const parsedRequirements = design.requirements ? JSON.parse(String(design.requirements) || '{}') : {};
          
          // Parse additional data fields
          const parsedComponentRoles = design.component_roles ? JSON.parse(String(design.component_roles) || '[]') : [];
          const parsedDisksByRole = design.selected_disks_by_role ? JSON.parse(String(design.selected_disks_by_role) || '{}') : {};
          const parsedGPUsByRole = design.selected_gpus_by_role ? JSON.parse(String(design.selected_gpus_by_role) || '{}') : {};
          
          // Create a complete design object with all properties
          return {
            id: design.id,
            name: design.name,
            description: design.description || '',
            components: parsedComponents,
            requirements: parsedRequirements,
            // Add additional properties
            componentRoles: parsedComponentRoles,
            selectedDisksByRole: parsedDisksByRole,
            selectedGPUsByRole: parsedGPUsByRole,
            // Convert dates
            createdAt: new Date(design.createdat),
            updatedAt: design.updatedat ? new Date(design.updatedat) : new Date(design.createdat)
          };
        } catch (parseErr) {
          console.error('Error parsing design data:', parseErr, design);
          return null;
        }
      }
      // This should never happen if database is properly set up
      console.error('Invalid design data:', design);
      return null;
    }).filter(Boolean) || []);
    
    return designs as InfrastructureDesign[];
  } catch (err) {
    console.error('Error loading designs:', err);
    toast.error('Failed to load designs from the database');
    return [];
  }
};

// Save a design to Supabase
export const saveDesign = async (design: InfrastructureDesign): Promise<boolean> => {
  try {
    // Format data for Supabase - convert complex objects to JSON strings
    // We need to ensure these are serializable for the database
    const designToSave = {
      id: design.id,
      name: design.name,
      description: design.description,
      // Convert objects to JSON strings
      requirements: JSON.stringify(design.requirements || {}),
      components: JSON.stringify(design.components || []),
      // Add additional configuration data as JSON strings
      component_roles: JSON.stringify(design.componentRoles || []),
      selected_disks_by_role: JSON.stringify(design.selectedDisksByRole || {}),
      selected_gpus_by_role: JSON.stringify(design.selectedGPUsByRole || {}),
      // Dates
      createdat: design.createdAt.toISOString(),
      updatedat: new Date().toISOString()
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
    // Create a JSON blob from the design object
    const designJson = JSON.stringify(design, null, 2);
    const blob = new Blob([designJson], { type: 'application/json' });
    
    // Create a temporary download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${design.name.replace(/\s+/g, '_')}_design.json`;
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
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
          
          // Validate the imported design has the required properties
          if (!importedDesign.id || !importedDesign.name) {
            toast.error('Invalid design file format');
            resolve(null);
            return;
          }
          
          // Ensure components array exists
          if (!importedDesign.components) {
            importedDesign.components = [];
          }
          
          // Ensure configuration data exists
          if (!importedDesign.componentRoles) {
            importedDesign.componentRoles = [];
          }
          
          if (!importedDesign.selectedDisksByRole) {
            importedDesign.selectedDisksByRole = {};
          }
          
          if (!importedDesign.selectedGPUsByRole) {
            importedDesign.selectedGPUsByRole = {};
          }
          
          // Convert date strings back to Date objects
          importedDesign.createdAt = new Date(importedDesign.createdAt);
          importedDesign.updatedAt = importedDesign.updatedAt 
            ? new Date(importedDesign.updatedAt) 
            : new Date();
          
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
