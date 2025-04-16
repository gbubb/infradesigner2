
import { toast } from 'sonner';
import { StoreState } from '../../types';
import { loadComponents, saveComponents } from '@/services/componentService';
import { defaultComponents } from '@/data/componentData';

export const handleDatabaseOperations = (set: Function, get: () => StoreState) => ({
  initializeComponentTemplates: () => {
    set({ componentTemplates: defaultComponents });
    get().saveAllComponentsToDB();
  },
  
  loadComponentsFromDB: async () => {
    try {
      const components = await loadComponents();
      
      if (components && components.length > 0) {
        set({ componentTemplates: components });
        console.log(`Loaded ${components.length} components from database`);
      } else {
        get().initializeComponentTemplates();
      }
    } catch (error) {
      console.error("Error loading components from database:", error);
      toast.error("Failed to load component templates");
      get().initializeComponentTemplates();
    }
  },
  
  saveAllComponentsToDB: async () => {
    const { componentTemplates } = get();
    await saveComponents(componentTemplates);
    return;
  }
});
