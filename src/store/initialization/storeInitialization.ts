
import { useDesignStore } from '../designStore';
import { loadComponentsData } from '@/data/componentData';
import { loadPersistedData } from '@/utils/persistenceUtils';

let initialized = false;

export const initializeStore = async () => {
  if (initialized) {
    console.log("Store already initialized, skipping");
    return;
  }
  
  try {
    // Try to load data from persistent storage first
    const { components: savedComponents, designs: savedDesigns } = await loadPersistedData();
    
    if (savedComponents.length > 0) {
      console.info("Initializing component templates from persistent storage");
      useDesignStore.getState().loadComponentTemplates(savedComponents);
    } else {
      // Fall back to default data if no saved components exist
      console.info("Initializing component templates from default data");
      const defaultComponents = loadComponentsData();
      useDesignStore.getState().loadComponentTemplates(defaultComponents);
    }
    
    if (savedDesigns.length > 0) {
      console.info("Loading saved designs from persistent storage");
      useDesignStore.setState({ savedDesigns });
      
      // Set the first design as active if no active design is set
      if (!useDesignStore.getState().activeDesign && savedDesigns.length > 0) {
        console.info("Creating default design from first saved design");
        useDesignStore.setState({ activeDesign: savedDesigns[0] });
      }
    }
    
    initialized = true;
    console.info("Store initialized");
  } catch (error) {
    console.error("Failed to initialize store:", error);
    
    // Fall back to default components if there's an error
    console.info("Falling back to default component templates");
    const defaultComponents = loadComponentsData();
    useDesignStore.getState().loadComponentTemplates(defaultComponents);
  }
};
