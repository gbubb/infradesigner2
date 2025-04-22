
import { toast } from 'sonner';
import { 
  saveDesign as saveDesignToDb, 
  deleteDesign as deleteDesignFromDb,
  loadDesigns,
  exportDesign as exportDesignToFileFromService,
  importDesign as importDesignFromFileFromService,
  purgeAllDesigns as purgeAllDesignsFromDb,
  togglePublicAccess as togglePublicAccessDb,
  loadDesignBySharing
} from '@/services/designService';
import { InfrastructureDesign } from '@/types/infrastructure';

export const saveDesignToDB = async (design: InfrastructureDesign, userId?: string): Promise<boolean> => {
  return await saveDesignToDb(design, userId);
};

export const deleteDesignFromDB = async (id: string): Promise<boolean> => {
  return await deleteDesignFromDb(id);
};

export const loadDesignsFromDB = async (userId?: string): Promise<InfrastructureDesign[]> => {
  try {
    const designs = await loadDesigns(userId);
    return designs || [];
  } catch (error) {
    console.error("Error loading designs from database:", error);
    toast.error("Failed to load designs");
    return [];
  }
};

export const loadSharedDesignFromDB = async (sharingId: string): Promise<InfrastructureDesign | null> => {
  try {
    const design = await loadDesignBySharing(sharingId);
    return design;
  } catch (error) {
    console.error("Error loading shared design from database:", error);
    toast.error("Failed to load shared design");
    return null;
  }
};

export const togglePublicAccessInDB = async (id: string, isPublic: boolean): Promise<boolean> => {
  return await togglePublicAccessDb(id, isPublic);
};

export const exportDesignToFile = (design: InfrastructureDesign): void => {
  exportDesignToFileFromService(design);
};

export const importDesignFromFile = async (file: File): Promise<InfrastructureDesign | null> => {
  return await importDesignFromFileFromService(file);
};

export const purgeAllDesignsFromDB = async (): Promise<boolean> => {
  return await purgeAllDesignsFromDb();
};
