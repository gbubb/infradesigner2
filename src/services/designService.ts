
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
    return (data?.map(design => ({
      id: design.id,
      name: design.name,
      description: design.description || '',
      requirements: design.requirements || {},
      components: design.components || [],
      createdAt: new Date(design.createdat),
      updatedAt: design.updatedat ? new Date(design.updatedat) : new Date(design.createdat)
    })) || []) as InfrastructureDesign[];
  } catch (err) {
    console.error('Error loading designs:', err);
    toast.error('Failed to load designs from the database');
    return [];
  }
};

// Save a design to Supabase
export const saveDesign = async (design: InfrastructureDesign): Promise<boolean> => {
  try {
    // Format data for Supabase
    const designToSave = {
      id: design.id,
      name: design.name,
      description: design.description,
      requirements: design.requirements,
      components: design.components,
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
          if (!importedDesign.id || !importedDesign.name || !importedDesign.components) {
            toast.error('Invalid design file format');
            resolve(null);
            return;
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
