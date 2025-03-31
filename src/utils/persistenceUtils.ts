
import { toast } from 'sonner';
import { databaseService } from '@/services/databaseService';
import { InfrastructureComponent, InfrastructureDesign } from '@/types/infrastructure';

/**
 * Load components and designs from the database
 */
export const loadPersistedData = async (): Promise<{
  components: InfrastructureComponent[];
  designs: InfrastructureDesign[];
}> => {
  try {
    const [components, designs] = await Promise.all([
      databaseService.getAllComponents(),
      databaseService.getAllDesigns()
    ]);
    
    console.log(`Loaded ${components.length} components and ${designs.length} designs from database`);
    return { components, designs };
  } catch (error) {
    console.error('Failed to load persisted data:', error);
    toast.error('Failed to load saved data');
    return { components: [], designs: [] };
  }
};

/**
 * Save components to the database
 */
export const persistComponents = async (components: InfrastructureComponent[]): Promise<boolean> => {
  try {
    const success = await databaseService.saveComponents(components);
    if (success) {
      console.log(`Saved ${components.length} components to database`);
    }
    return success;
  } catch (error) {
    console.error('Failed to persist components:', error);
    toast.error('Failed to save components');
    return false;
  }
};

/**
 * Save designs to the database
 */
export const persistDesigns = async (designs: InfrastructureDesign[]): Promise<boolean> => {
  try {
    const success = await databaseService.saveDesigns(designs);
    if (success) {
      console.log(`Saved ${designs.length} designs to database`);
    }
    return success;
  } catch (error) {
    console.error('Failed to persist designs:', error);
    toast.error('Failed to save designs');
    return false;
  }
};

/**
 * Save a single design to the database
 */
export const persistDesign = async (design: InfrastructureDesign): Promise<boolean> => {
  try {
    const success = await databaseService.saveDesign(design);
    if (success) {
      console.log(`Saved design "${design.name}" to database`);
    }
    return success;
  } catch (error) {
    console.error('Failed to persist design:', error);
    toast.error('Failed to save design');
    return false;
  }
};
