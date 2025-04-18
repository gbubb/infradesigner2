
import { toast } from 'sonner';
import { 
  saveDesign as saveDesignToDb, 
  deleteDesign as deleteDesignFromDb,
  loadDesigns,
  exportDesign as exportDesignToFile,
  importDesign as importDesignFromFile,
  purgeAllDesigns as purgeAllDesignsFromDb
} from '@/services/designService';
import { InfrastructureDesign } from '@/types/infrastructure';

export const saveDesignToDB = async (design: InfrastructureDesign): Promise<boolean> => {
  return await saveDesignToDb(design);
};

export const deleteDesignFromDB = async (id: string): Promise<boolean> => {
  return await deleteDesignFromDb(id);
};

export const loadDesignsFromDB = async (): Promise<InfrastructureDesign[]> => {
  try {
    const designs = await loadDesigns();
    return designs || [];
  } catch (error) {
    console.error("Error loading designs from database:", error);
    toast.error("Failed to load designs");
    return [];
  }
};

export const exportDesignToFile = (design: InfrastructureDesign): void => {
  exportDesignToFile(design);
};

export const importDesignFromFile = async (file: File): Promise<InfrastructureDesign | null> => {
  return await importDesignFromFile(file);
};

export const purgeAllDesignsFromDB = async (): Promise<boolean> => {
  return await purgeAllDesignsFromDb();
};

